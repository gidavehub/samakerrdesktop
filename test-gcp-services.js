/**
 * GCP SERVICES VERIFICATION SCRIPT
 * Tests ALL GCP services used by the Sama Kerr pipeline:
 *   1. Credential parsing
 *   2. Gemini 3 Flash (text generation) — location: global
 *   3. Imagen 3 (image generation)
 *   4. Google Cloud Storage (bucket read/write)
 *   5. Firebase RTDB REST API (progress writes)
 */

require('dotenv').config({ path: '.env.local' });

const passed = [];
const failed = [];

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }
function section(title) { console.log(`\n${'─'.repeat(50)}\n  ${title}\n${'─'.repeat(50)}`); }

async function run() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   SAMA KERR — GCP SERVICES VERIFICATION          ║');
    console.log('╚══════════════════════════════════════════════════╝');

    // ── TEST 1: CREDENTIAL PARSING ─────────────────────────────────
    section('1. GCP Credential Parsing');
    let credentials;
    try {
        const credsStr = process.env.GCP_SERVICE_ACCOUNT_JSON;
        if (!credsStr) throw new Error('GCP_SERVICE_ACCOUNT_JSON is not set in .env.local');

        const cleanCredsStr = credsStr.replace(/^'|'$/g, '');
        credentials = JSON.parse(cleanCredsStr);
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

        log('✓', `Project ID: ${credentials.project_id}`);
        log('✓', `Client Email: ${credentials.client_email}`);
        log('✓', `Private Key: starts with "-----BEGIN" = ${credentials.private_key.startsWith('-----BEGIN')}`);
        passed.push('Credential Parsing');
    } catch (e) {
        log('✗', `FAILED: ${e.message}`);
        failed.push(`Credential Parsing: ${e.message}`);
        console.log('\n⛔ Cannot proceed without valid credentials.');
        return printSummary();
    }

    // ── TEST 2: GEMINI 3 FLASH (TEXT GENERATION) ──────────────────
    section('2. Gemini 3 Flash Preview (Text Generation)');
    let ai;
    try {
        const { GoogleGenAI } = require('@google/genai');
        ai = new GoogleGenAI({
            project: credentials.project_id,
            location: 'global',
            vertexai: {
                project: credentials.project_id,
                location: 'global',
                googleAuthOptions: {
                    credentials: {
                        client_email: credentials.client_email,
                        private_key: credentials.private_key,
                    }
                }
            }
        });
        log('…', 'SDK initialized. Sending test prompt to gemini-3.1-pro-preview at location=global...');

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: 'Reply with exactly: GEMINI_OK',
        });

        const text = response.text?.trim();
        log('✓', `Response: "${text}"`);
        passed.push('Gemini 3 Flash Preview');
    } catch (e) {
        log('✗', `FAILED: ${e.message}`);
        failed.push(`Gemini 3 Flash: ${e.message}`);
    }

    // ── TEST 3: IMAGEN 3 (IMAGE GENERATION) ────────────────────────
    section('3. Imagen 3 (Image Generation)');
    try {
        if (!ai) throw new Error('Skipped — Gemini SDK failed to initialize');

        log('…', 'Generating a tiny test image with imagen-3.0-generate-002...');
        const imgRes = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: 'A simple blue square on a white background, minimalist',
            config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/jpeg' }
        });

        const imgData = imgRes.generatedImages?.[0]?.image?.imageBytes;
        if (!imgData) throw new Error('Imagen returned no image data — may need API enablement');

        log('✓', `Image generated successfully (base64 length: ${imgData.length} chars)`);
        passed.push('Imagen 3');
    } catch (e) {
        log('✗', `FAILED: ${e.message}`);
        log('ℹ', 'Imagen 3 requires explicit enablement in GCP Console → Vertex AI → Model Garden');
        failed.push(`Imagen 3: ${e.message}`);
    }

    // ── TEST 4: GOOGLE CLOUD STORAGE ───────────────────────────────
    section('4. Google Cloud Storage');
    const BUCKET = 'outlaw-490315-media';
    try {
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage({
            projectId: credentials.project_id,
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key,
            }
        });

        const bucket = storage.bucket(BUCKET);

        // Test 4a: Check bucket exists
        log('…', `Checking bucket "${BUCKET}" exists...`);
        const [exists] = await bucket.exists();
        if (!exists) throw new Error(`Bucket "${BUCKET}" does not exist`);
        log('✓', 'Bucket exists');

        // Test 4b: Write a test file
        log('…', 'Writing test file...');
        const testFile = bucket.file('_test/gcp-verify.txt');
        await testFile.save('GCP verification test - ' + new Date().toISOString(), {
            contentType: 'text/plain',
        });
        log('✓', 'File written to _test/gcp-verify.txt');

        // Test 4c: Make it public
        await testFile.makePublic();
        const publicUrl = `https://storage.googleapis.com/${BUCKET}/_test/gcp-verify.txt`;
        log('✓', `File made public: ${publicUrl}`);

        // Test 4d: Clean up
        await testFile.delete();
        log('✓', 'Test file cleaned up');

        passed.push('Google Cloud Storage');
    } catch (e) {
        log('✗', `FAILED: ${e.message}`);
        log('ℹ', `Make sure the service account has Storage Admin role on bucket "${BUCKET}"`);
        failed.push(`Cloud Storage: ${e.message}`);
    }

    // ── TEST 5: FIREBASE RTDB REST API ─────────────────────────────
    section('5. Firebase RTDB REST API');
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'red-girder-461916-a1';
    const rtdbUrl = `https://${projectId}-default-rtdb.firebaseio.com`;
    try {
        log('…', `Testing write to ${rtdbUrl}/_test/gcp-verify.json ...`);

        const writeRes = await fetch(`${rtdbUrl}/_test/gcp-verify.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        });

        if (!writeRes.ok) {
            const errText = await writeRes.text();
            throw new Error(`HTTP ${writeRes.status}: ${errText}`);
        }

        log('✓', 'RTDB write succeeded');

        // Read it back
        const readRes = await fetch(`${rtdbUrl}/_test/gcp-verify.json`);
        const data = await readRes.json();
        log('✓', `RTDB read back: ${JSON.stringify(data)}`);

        // Clean up
        await fetch(`${rtdbUrl}/_test.json`, { method: 'DELETE' });
        log('✓', 'Test data cleaned up');

        passed.push('Firebase RTDB REST API');
    } catch (e) {
        log('✗', `FAILED: ${e.message}`);
        log('ℹ', 'Set RTDB rules to { "rules": { ".read": true, ".write": true } } in Firebase Console');
        failed.push(`RTDB REST API: ${e.message}`);
    }

    printSummary();
}

function printSummary() {
    console.log(`\n${'═'.repeat(50)}`);
    console.log('  RESULTS SUMMARY');
    console.log(`${'═'.repeat(50)}`);
    passed.forEach(t => console.log(`  ✓ PASS: ${t}`));
    failed.forEach(t => console.log(`  ✗ FAIL: ${t}`));
    console.log(`${'─'.repeat(50)}`);
    console.log(`  ${passed.length} passed, ${failed.length} failed`);
    if (failed.length === 0) {
        console.log('\n  🎉 ALL SERVICES VERIFIED — Pipeline is ready!\n');
    } else {
        console.log('\n  ⚠  Some services failed. Fix the issues above before running the pipeline.\n');
    }
}

run().catch(e => {
    console.error('Script crashed:', e);
    process.exit(1);
});
