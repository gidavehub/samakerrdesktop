const { Storage } = require('@google-cloud/storage');
require('dotenv').config({ path: '.env.local' });

async function setCors() {
    const credsStr = process.env.GCP_SERVICE_ACCOUNT_JSON;
    const cleanCredsStr = credsStr.replace(/^'|'$/g, '');
    const credentials = JSON.parse(cleanCredsStr);
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

    const storage = new Storage({
        projectId: credentials.project_id,
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key,
        }
    });

    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const bucket = storage.bucket(bucketName);

    const corsConfig = [
        {
            origin: ['*'],
            method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
            maxAgeSeconds: 3600
        }
    ];

    try {
        await bucket.setCorsConfiguration(corsConfig);
        console.log(`CORS configuration successfully updated for bucket ${bucketName}`);
    } catch (err) {
        console.error("Failed to update CORS:", err);
    }
}
setCors();