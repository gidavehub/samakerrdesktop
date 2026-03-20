import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    let credential;
    let credentialSource = 'applicationDefault';

    try {
        const credsStr = process.env.GCP_SERVICE_ACCOUNT_JSON;
        if (credsStr) {
            const cleanCredsStr = credsStr.replace(/^'|'$/g, '');
            const credentials = JSON.parse(cleanCredsStr);
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
            credential = admin.credential.cert(credentials);
            credentialSource = `serviceAccount:${credentials.client_email}`;
        }
    } catch (e) {
        console.error("[FIREBASE-ADMIN] Failed to parse GCP_SERVICE_ACCOUNT_JSON:", e);
        console.error("[FIREBASE-ADMIN] Falling back to applicationDefault credentials.");
    }

    // The RTDB lives under the Firebase project (red-girder-461916-a1),
    // but the service account is from the GCP project (outlaw-490315).
    // For this cross-project access to work, the service account must be
    // added as a member in the Firebase project's IAM or the RTDB rules
    // must allow access.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'red-girder-461916-a1';
    const databaseURL = `https://${projectId}-default-rtdb.firebaseio.com`;

    console.log(`[FIREBASE-ADMIN] Initializing with:`);
    console.log(`  - Credential: ${credentialSource}`);
    console.log(`  - RTDB URL: ${databaseURL}`);
    console.log(`  - NOTE: If RTDB writes fail, check that the service account has access to project '${projectId}'`);

    admin.initializeApp({
        credential: credential || admin.credential.applicationDefault(),
        databaseURL,
    });
}

const adminDb = admin.firestore();
const adminRtdb = admin.database();

// Quick connectivity test (non-blocking)
(async () => {
    try {
        await adminRtdb.ref('.info/connected').once('value');
        console.log('[FIREBASE-ADMIN] ✓ RTDB connection verified.');
    } catch (e: any) {
        console.error(`[FIREBASE-ADMIN] ✗ RTDB connection test failed: ${e.message}`);
        console.error('[FIREBASE-ADMIN] The orchestration pipeline will fall back to Firestore for progress updates.');
        console.error('[FIREBASE-ADMIN] To fix: Add the service account to the Firebase project, or update RTDB security rules.');
    }
})();

export { adminDb, adminRtdb };