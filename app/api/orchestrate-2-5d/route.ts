import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Vercel timeout extension (requires Pro plan; Hobby = 10s max)
export const maxDuration = 300;

const BUCKET_NAME = 'outlaw-490315-media';

// The Firebase RTDB URL — uses the connekt-490205 project's RTDB
const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ? `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    : 'https://connekt-490205-default-rtdb.firebaseio.com';

// ============================================================================
// RTDB PROGRESS TRACKER — uses REST API (no firebase-admin needed)
// ============================================================================
const updateProgress = async (
    propertyId: string,
    step: string,
    progress: number,
    isError: boolean = false,
    details?: string
) => {
    const payload = {
        isOrchestrating: !isError && progress < 100,
        step,
        progress,
        error: isError ? step : null,
        errorDetails: isError && details ? details : null,
        updatedAt: new Date().toISOString(),
    };

    try {
        const url = `${RTDB_URL}/orchestration/${propertyId}.json`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[PROGRESS] RTDB REST write failed (HTTP ${res.status}): ${errText}`);
            console.error(`[PROGRESS] URL: ${url}`);
            console.error(`[PROGRESS] Make sure RTDB security rules allow writes. In the Firebase Console → Realtime Database → Rules, set:`);
            console.error(`[PROGRESS]   { "rules": { ".read": true, ".write": true } }`);
        }
    } catch (err: any) {
        console.error(`[PROGRESS] RTDB REST request failed: ${err.message}`);
    }
};

// ============================================================================
// GCP CREDENTIALS (for Vertex AI + Cloud Storage only)
// ============================================================================
const getCredentials = () => {
    const credsStr = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (!credsStr) {
        throw new Error(
            "FATAL: Missing GCP_SERVICE_ACCOUNT_JSON in environment variables. " +
            "This must contain the full JSON credentials for the outlaw-490315 service account."
        );
    }
    const cleanCredsStr = credsStr.replace(/^'|'$/g, '');
    let credentials;
    try {
        credentials = JSON.parse(cleanCredsStr);
    } catch (e) {
        throw new Error(
            "FATAL: GCP_SERVICE_ACCOUNT_JSON is not valid JSON. " +
            "Check for encoding issues or extra wrapping quotes."
        );
    }
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

    if (!credentials.project_id) throw new Error("GCP credentials missing 'project_id'");
    if (!credentials.client_email) throw new Error("GCP credentials missing 'client_email'");
    if (!credentials.private_key) throw new Error("GCP credentials missing 'private_key'");

    return credentials;
};

// ============================================================================
// VERTEX AI — location MUST be 'global' for Gemini 3 models
// ============================================================================
const initVertexAI = () => {
    const credentials = getCredentials();
    console.log(`[VERTEX] Initializing GoogleGenAI for project=${credentials.project_id}, location=global`);

    return new GoogleGenAI({
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
};

// ============================================================================
// GCS STORAGE
// ============================================================================
const initStorage = () => {
    const credentials = getCredentials();
    return new Storage({
        projectId: credentials.project_id,
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key,
        }
    });
};

const urlToGsUri = (url: string) => {
    if (url.startsWith(`https://storage.googleapis.com/${BUCKET_NAME}/`)) {
        const urlPath = url.replace(`https://storage.googleapis.com/${BUCKET_NAME}/`, '');
        return `gs://${BUCKET_NAME}/${urlPath}`;
    }
    return url;
};

const uploadBase64ToStorage = async (base64Data: string, propertyId: string, filename: string) => {
    const storage = initStorage();
    const bucket = storage.bucket(BUCKET_NAME);
    const destFileName = `${propertyId}/generated/${filename}`;
    const fileObj = bucket.file(destFileName);

    const buffer = Buffer.from(base64Data, 'base64');
    await fileObj.save(buffer, {
        contentType: 'image/jpeg',
        metadata: { cacheControl: 'public, max-age=31536000' },
    });
    await fileObj.makePublic();

    return `https://storage.googleapis.com/${BUCKET_NAME}/${destFileName}`;
};

const downloadImageToLocal = async (url: string, localFilename: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image at ${url} — HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const tempPath = path.join(os.tmpdir(), localFilename);
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
};

const uploadLocalFileToStorage = async (localPath: string, propertyId: string, filename: string) => {
    const storage = initStorage();
    const bucket = storage.bucket(BUCKET_NAME);
    const destFileName = `${propertyId}/generated/${filename}`;
    const fileObj = bucket.file(destFileName);

    await bucket.upload(localPath, {
        destination: destFileName,
        metadata: { contentType: 'video/mp4', cacheControl: 'public, max-age=31536000' }
    });

    await fileObj.makePublic();
    return `https://storage.googleapis.com/${BUCKET_NAME}/${destFileName}`;
};

// ============================================================================
// VIDEO GENERATION (FFmpeg) — may not work on Vercel serverless
// ============================================================================
const generateVideoSlideshow = async (imagePaths: string[], outputPath: string): Promise<string> => {
    let ffmpeg: any;
    let ffmpegStatic: string | null;

    try {
        ffmpeg = (await import('fluent-ffmpeg')).default;
        ffmpegStatic = (await import('ffmpeg-static')).default;
    } catch (importErr: any) {
        throw new Error(
            `FFmpeg modules could not be loaded: ${importErr.message}. ` +
            `Video generation requires a server with FFmpeg installed (not available on Vercel serverless).`
        );
    }

    if (!ffmpegStatic || !fs.existsSync(ffmpegStatic)) {
        throw new Error(
            `FFmpeg binary not found at '${ffmpegStatic}'. ` +
            `This is a known limitation of serverless deployments. Video generation is skipped.`
        );
    }

    ffmpeg.setFfmpegPath(ffmpegStatic);

    return new Promise((resolve, reject) => {
        let cmd = ffmpeg();

        imagePaths.forEach((img: string) => {
            cmd.addInput(img).loop(1).inputOptions(['-t 4']);
        });

        // Synthesized ambient drone audio
        cmd.addInput('aevalsrc=0.05*sin(2*PI*110*t)+0.05*sin(2*PI*138.59*t)+0.05*sin(2*PI*164.81*t)+0.05*sin(2*PI*207.65*t):d=120')
            .inputFormat('lavfi');

        let filterComplex = '';
        let concatMap = '';
        imagePaths.forEach((_img: string, i: number) => {
            filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='zoom+0.001':s=1920x1080:d=120[v${i}]; `;
            concatMap += `[v${i}]`;
        });

        filterComplex += `${concatMap}concat=n=${imagePaths.length}:v=1:a=0[outv]`;

        cmd.complexFilter(filterComplex, ['outv'])
            .outputOptions([
                '-map [outv]',
                '-map ' + imagePaths.length + ':a',
                '-c:v libx264',
                '-pix_fmt yuv420p',
                '-preset fast',
                '-crf 23',
                '-c:a aac',
                '-b:a 128k',
                '-shortest',
                '-r 30'
            ])
            .on('end', () => resolve(outputPath))
            .on('error', (err: any) => reject(new Error(`FFmpeg processing error: ${err.message}`)))
            .save(outputPath);
    });
};

// ============================================================================
// MAIN PIPELINE HANDLER
// ============================================================================
export async function POST(req: Request) {
    let propertyIdToUpdate: string | null = null;

    try {
        // ── REQUEST VALIDATION ──────────────────────────────────────────
        let body: any;
        try {
            body = await req.json();
        } catch (parseErr) {
            return NextResponse.json(
                { error: 'Invalid request body — could not parse JSON' },
                { status: 400 }
            );
        }

        const { propertyId, blueprintUrl, rooms } = body;
        propertyIdToUpdate = propertyId;

        if (!propertyId) {
            return NextResponse.json({ error: 'Missing propertyId in request' }, { status: 400 });
        }
        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            return NextResponse.json({ error: 'Missing or empty rooms array in request' }, { status: 400 });
        }

        // Validate that at least some rooms have photos
        const roomsWithPhotos = rooms.filter((r: any) => r.photos && r.photos.length > 0);
        if (roomsWithPhotos.length === 0) {
            await updateProgress(propertyId, "No room photos found. Please capture photos from the mobile app first.", 0, true);
            return NextResponse.json(
                { error: 'None of the rooms have photos. Please complete the mobile capture first.' },
                { status: 400 }
            );
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`[ORCHESTRATOR] Starting pipeline for Property: ${propertyId}`);
        console.log(`[ORCHESTRATOR] Rooms: ${rooms.length} total, ${roomsWithPhotos.length} with photos`);
        console.log(`[ORCHESTRATOR] Blueprint: ${blueprintUrl ? 'YES' : 'NONE'}`);
        console.log(`[ORCHESTRATOR] RTDB URL: ${RTDB_URL}`);
        console.log(`${'='.repeat(60)}\n`);

        // ── STEP 0: CREDENTIAL & MODEL VALIDATION ──────────────────────
        await updateProgress(propertyId, "Validating credentials and AI model access...", 3);

        let ai: any;
        try {
            ai = initVertexAI();
        } catch (initErr: any) {
            const msg = `Failed to initialize Vertex AI: ${initErr.message}`;
            console.error(`[ORCHESTRATOR] ${msg}`);
            await updateProgress(propertyId, msg, 0, true, initErr.stack);
            return NextResponse.json({ error: msg }, { status: 500 });
        }

        // Quick smoke test: verify model is accessible before starting heavy work
        try {
            console.log('[ORCHESTRATOR] Testing Gemini model access...');
            const testRes = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: 'Reply with just the word OK.' }] }],
            });
            if (!testRes.text) {
                throw new Error('Gemini returned empty response during validation');
            }
            console.log('[ORCHESTRATOR] ✓ Gemini model is accessible');
        } catch (modelErr: any) {
            const msg = `Gemini model 'gemini-3-flash-preview' is not accessible. Error: ${modelErr.message}`;
            console.error(`[ORCHESTRATOR] ${msg}`);
            await updateProgress(propertyId, `AI model not available: ${modelErr.message}`, 0, true, msg);
            return NextResponse.json(
                { error: msg, hint: 'Check that the model exists in your GCP project (outlaw-490315) at location=global.' },
                { status: 502 }
            );
        }

        await updateProgress(propertyId, "Initializing AI models and loading room data...", 5);
        console.log(`[ORCHESTRATOR] ✓ All validation passed. Starting pipeline.`);

        // ================================================================
        // PHASE 1: PARALLEL ROOM ANALYSIS & HERO IMAGE GENERATION
        // ================================================================
        console.log("\n[ORCHESTRATOR] ── PHASE 1: Room Analysis & Hero Image Generation ──");
        await updateProgress(propertyId, `Analyzing ${roomsWithPhotos.length} rooms in parallel...`, 10);

        let completedRooms = 0;
        const roomErrors: string[] = [];

        const processedRooms = await Promise.all(rooms.map(async (room: any) => {
            const roomPhotos = room.photos || [];

            if (roomPhotos.length === 0) {
                console.warn(`[ROOM: ${room.name}] ⚠ No photos — skipping AI processing`);
                return { ...room, heroPrompt: null, heroImageUrl: null, skipped: true };
            }

            try {
                console.log(`[ROOM: ${room.name}] Processing ${roomPhotos.length} photo(s)...`);

                const photoParts = roomPhotos.map((photoUrl: string) => ({
                    fileData: { fileUri: urlToGsUri(photoUrl), mimeType: 'image/jpeg' }
                }));

                // Step 1a: Extract detailed prompt from room photos via Gemini
                let heroPrompt: string;
                try {
                    const promptExtraction = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: [{
                            role: 'user',
                            parts: [
                                ...photoParts,
                                {
                                    text: `You are an elite, high-end architectural photographer and interior designer. Look at these ${photoParts.length} photos of a single room. Your task is to write a breathtaking, hyper-detailed prompt to recreate this EXACT room using a high-end image generator. Describe the exact wall colors, the specific flooring materials, the style and placement of the furniture, and the position of the windows and doors. Specify the lighting. The output must elevate the aesthetic to ultra-premium luxury real estate standards while remaining 100% faithful to the original layout and contents. Output ONLY the image generation prompt, nothing else.`
                                }
                            ]
                        }]
                    });
                    heroPrompt = promptExtraction.text || `A beautiful, photorealistic render of a ${room.name}`;
                    console.log(`[ROOM: ${room.name}] ✓ Prompt extracted (${heroPrompt.length} chars)`);
                } catch (promptErr: any) {
                    console.error(`[ROOM: ${room.name}] ✗ Gemini prompt extraction failed: ${promptErr.message}`);
                    roomErrors.push(`${room.name}: Prompt extraction failed — ${promptErr.message}`);
                    heroPrompt = `A beautiful, photorealistic render of a ${room.name}, luxury interior design, cinematic lighting, 8K`;
                }

                // Step 1b: Generate hero image with Imagen 3
                let heroUrl: string | null = null;
                try {
                    console.log(`[ROOM: ${room.name}] Generating hero image with Imagen 3...`);
                    const heroImageRes = await ai.models.generateImages({
                        model: 'imagen-3.0-generate-002',
                        prompt: heroPrompt,
                        config: { numberOfImages: 1, aspectRatio: '16:9', outputMimeType: 'image/jpeg' }
                    });

                    const base64Hero = heroImageRes.generatedImages?.[0]?.image?.imageBytes;
                    if (!base64Hero) {
                        throw new Error('Imagen 3 returned no image data — prompt may have been rejected by safety filters');
                    }

                    heroUrl = await uploadBase64ToStorage(base64Hero, propertyId, `hero_${room.id}_${Date.now()}.jpg`);
                    console.log(`[ROOM: ${room.name}] ✓ Hero image generated and uploaded`);
                } catch (imgErr: any) {
                    console.error(`[ROOM: ${room.name}] ✗ Imagen 3 generation failed: ${imgErr.message}`);
                    roomErrors.push(`${room.name}: Image generation failed — ${imgErr.message}`);
                }

                completedRooms++;
                const progressPct = 10 + Math.floor((completedRooms / roomsWithPhotos.length) * 40);
                await updateProgress(propertyId, `Generated ${completedRooms}/${roomsWithPhotos.length} room layouts...`, progressPct);

                return { ...room, heroPrompt, heroImageUrl: heroUrl };

            } catch (roomErr: any) {
                console.error(`[ROOM: ${room.name}] ✗ Unexpected error: ${roomErr.message}`);
                roomErrors.push(`${room.name}: Unexpected — ${roomErr.message}`);
                completedRooms++;
                return { ...room, heroPrompt: null, heroImageUrl: null, error: roomErr.message };
            }
        }));

        const successfulHeroes = processedRooms.filter(r => r.heroImageUrl);
        if (successfulHeroes.length === 0) {
            const msg = `All room image generations failed. Errors: ${roomErrors.join('; ')}`;
            console.error(`[ORCHESTRATOR] ${msg}`);
            await updateProgress(propertyId, msg, 0, true, JSON.stringify(roomErrors));
            return NextResponse.json({ error: msg, roomErrors }, { status: 500 });
        }

        console.log(`[ORCHESTRATOR] Phase 1 complete: ${successfulHeroes.length}/${rooms.length} rooms generated`);

        // ================================================================
        // PHASE 2: 2.5D ISOMETRIC ASSEMBLY
        // ================================================================
        console.log("\n[ORCHESTRATOR] ── PHASE 2: 2.5D Isometric Floorplan Assembly ──");
        await updateProgress(propertyId, "Constructing master 2.5D architectural floorplan...", 55);

        let final25DUrl: string | null = null;

        try {
            const heroImageParts = successfulHeroes.map((room) => ({
                fileData: { fileUri: urlToGsUri(room.heroImageUrl!), mimeType: 'image/jpeg' }
            }));

            const contentParts: any[] = [...heroImageParts];

            if (blueprintUrl) {
                contentParts.unshift({
                    fileData: { fileUri: urlToGsUri(blueprintUrl), mimeType: 'image/jpeg' }
                });
            }

            let masterInstruction = `You are a world-class 3D architectural visualizer. `;
            if (blueprintUrl) {
                masterInstruction += `I am providing you with the 2D architectural blueprint of a home, followed by ${heroImageParts.length} pristine hero images representing each individual room.\n\n`;
            } else {
                masterInstruction += `I am providing you with ${heroImageParts.length} pristine hero images representing each room of a property.\n\n`;
            }
            masterInstruction += `Write a highly meticulous image generation prompt to create a breathtaking '2.5D Isometric Dollhouse Floorplan Render' of this entire property.\n`;
            masterInstruction += `The prompt MUST instruct the image generator to maintain the exact structural wall layout, rendering it from a slightly angled, top-down isometric 3D perspective with the roof removed.\n`;
            masterInstruction += `Then, explicitly list the interior design details for each room based on the provided photos:\n`;

            successfulHeroes.forEach(room => {
                if (room.heroPrompt) {
                    masterInstruction += `- For the ${room.name}: include ${room.heroPrompt.substring(0, 100)}...\n`;
                }
            });
            masterInstruction += `\nEnsure the final prompt requests soft volumetric global illumination, hyper-realistic textures, and high-end Unreal Engine 5 aesthetic quality. Output ONLY the master prompt.`;

            console.log('[ORCHESTRATOR] Extracting master 2.5D prompt via Gemini...');
            const masterPromptExtraction = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [...contentParts, { text: masterInstruction }] }]
            });

            const masterPrompt = masterPromptExtraction.text || "A hyper-realistic 2.5D isometric 3D floorplan render, top-down angled view, luxury architecture.";
            console.log(`[ORCHESTRATOR] ✓ Master prompt extracted (${masterPrompt.length} chars)`);

            await updateProgress(propertyId, "Rendering final 2.5D masterpiece via Imagen 3...", 65);

            console.log('[ORCHESTRATOR] Generating 2.5D isometric image...');
            const isometricRes = await ai.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: masterPrompt,
                config: { numberOfImages: 1, aspectRatio: '16:9', outputMimeType: 'image/jpeg' }
            });

            const base64Isometric = isometricRes.generatedImages?.[0]?.image?.imageBytes;
            if (!base64Isometric) {
                throw new Error("Imagen 3 returned no image data for 2.5D render. Prompt may have been rejected by safety filters.");
            }

            final25DUrl = await uploadBase64ToStorage(base64Isometric, propertyId, `isometric_2_5d_${Date.now()}.jpg`);
            console.log("[ORCHESTRATOR] ✓ 2.5D Isometric Floorplan Generated and uploaded.");

        } catch (phase2Err: any) {
            console.error(`[ORCHESTRATOR] ✗ Phase 2 failed: ${phase2Err.message}`);
            console.error(phase2Err.stack);
            await updateProgress(propertyId, `2.5D generation failed: ${phase2Err.message}. Continuing with video...`, 75);
        }

        // ================================================================
        // PHASE 3: CINEMATIC VIDEO (FFmpeg)
        // ================================================================
        console.log("\n[ORCHESTRATOR] ── PHASE 3: Cinematic Video Generation ──");
        await updateProgress(propertyId, "Compiling cinematic virtual tour video...", 80);

        let videoUrl: string | null = null;

        try {
            const allImageUrls = [
                ...successfulHeroes.map(r => r.heroImageUrl!),
                ...(final25DUrl ? [final25DUrl] : [])
            ];

            if (allImageUrls.length === 0) {
                throw new Error("No images available to compile into a video");
            }

            const downloadedPaths: string[] = [];
            for (let i = 0; i < allImageUrls.length; i++) {
                await updateProgress(propertyId, `Downloading image ${i + 1}/${allImageUrls.length} for video...`, 80 + Math.floor((i / allImageUrls.length) * 5));
                const localPath = await downloadImageToLocal(allImageUrls[i], `frame_${propertyId}_${i}.jpg`);
                downloadedPaths.push(localPath);
            }

            await updateProgress(propertyId, "Encoding cinematic video with FFmpeg...", 87);
            const videoOutputTempPath = path.join(os.tmpdir(), `cinematic_${propertyId}_${Date.now()}.mp4`);
            await generateVideoSlideshow(downloadedPaths, videoOutputTempPath);

            await updateProgress(propertyId, "Uploading video to Google Cloud Storage...", 93);
            videoUrl = await uploadLocalFileToStorage(videoOutputTempPath, propertyId, `cinematic_tour_${Date.now()}.mp4`);
            console.log("[ORCHESTRATOR] ✓ Cinematic video generated and uploaded.");

            // Cleanup temp files
            try {
                downloadedPaths.forEach(p => { try { fs.unlinkSync(p); } catch(_) {} });
                try { fs.unlinkSync(videoOutputTempPath); } catch(_) {}
            } catch (e) { /* ignore cleanup errors */ }

        } catch (videoError: any) {
            console.error(`[ORCHESTRATOR] ✗ Phase 3 (Video) failed: ${videoError.message}`);
            await updateProgress(propertyId, `Video generation skipped: ${videoError.message}`, 95);
        }

        // ================================================================
        // FINALIZE — return data to frontend (frontend saves to Firestore)
        // ================================================================
        console.log("\n[ORCHESTRATOR] ── FINALIZING ──");
        await updateProgress(propertyId, "Complete!", 100);

        const summary = {
            success: true,
            rooms: processedRooms,
            isometric25DUrl: final25DUrl,
            videoUrl: videoUrl,
            stats: {
                totalRooms: rooms.length,
                roomsWithPhotos: roomsWithPhotos.length,
                heroImagesGenerated: successfulHeroes.length,
                isometricGenerated: !!final25DUrl,
                videoGenerated: !!videoUrl,
                warnings: roomErrors.length > 0 ? roomErrors : undefined,
            }
        };

        console.log(`\n${'='.repeat(60)}`);
        console.log(`[ORCHESTRATOR] ✓ PIPELINE COMPLETE`);
        console.log(`[ORCHESTRATOR] Heroes: ${successfulHeroes.length}/${rooms.length} | 2.5D: ${!!final25DUrl} | Video: ${!!videoUrl}`);
        if (roomErrors.length > 0) console.log(`[ORCHESTRATOR] Warnings: ${roomErrors.length}`);
        console.log(`${'='.repeat(60)}\n`);

        return NextResponse.json(summary);

    } catch (error: any) {
        // ── UNHANDLED CATASTROPHIC ERROR ─────────────────────────────────
        console.error('\n' + '!'.repeat(60));
        console.error('[ORCHESTRATOR] UNHANDLED PIPELINE ERROR');
        console.error(`Message: ${error.message}`);
        console.error(`Stack: ${error.stack}`);
        console.error('!'.repeat(60) + '\n');

        if (propertyIdToUpdate) {
            await updateProgress(
                propertyIdToUpdate,
                `Pipeline crashed: ${error.message || "Unknown error"}`,
                0,
                true,
                error.stack
            );
        }

        return NextResponse.json({
            error: "Pipeline crashed with an unhandled error",
            message: error.message,
            hint: "Check the server logs for the full stack trace. Common causes: invalid model name, expired credentials, missing API enablement, or serverless timeout.",
        }, { status: 500 });
    }
}