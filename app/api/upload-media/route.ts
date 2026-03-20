import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const initStorage = () => {
  const credsStr = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!credsStr) throw new Error("Missing GCP_SERVICE_ACCOUNT_JSON");
  
  const credentials = JSON.parse(credsStr);
  const formattedPrivateKey = credentials.private_key.replace(/\\n/g, '\n');

  return new Storage({
      projectId: credentials.project_id,
      credentials: {
          client_email: credentials.client_email,
          private_key: formattedPrivateKey,
      }
  });
};

export async function DELETE(req: Request) {
    try {
        const { fileUrl, propertyId } = await req.json();
        
        const storage = initStorage();
        const bucketName = 'outlaw-490315-media'; 
        const bucket = storage.bucket(bucketName);

        if (propertyId) {
            // Bulk delete all files under this property's prefix
            await bucket.deleteFiles({ prefix: `${propertyId}/` });
            console.log(`Deleted all files for property ${propertyId}`);
            return NextResponse.json({ success: true, message: 'All property assets deleted' });
        } else if (fileUrl) {
            // Single file delete
            if (fileUrl.includes(bucketName)) {
                const urlObj = new URL(fileUrl);
                const pathParts = urlObj.pathname.split(`/${bucketName}/`);
                if (pathParts.length > 1) {
                    const filePath = decodeURIComponent(pathParts[1]);
                    await bucket.file(filePath).delete();
                }
            }
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Missing fileUrl or propertyId' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Error deleting from GCP:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete file(s)' }, { status: 500 });
    }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const propertyId = formData.get('propertyId') as string;
    const type = formData.get('type') as string; // 'blueprint' or 'room-photo'
    const oldUrl = formData.get('oldUrl') as string | null;

    if (!file || !propertyId) {
      return NextResponse.json({ error: 'Missing file or propertyId' }, { status: 400 });
    }

    const storage = initStorage();
    const bucketName = 'outlaw-490315-media'; 
    const bucket = storage.bucket(bucketName);

    // Delete old file if it exists and belongs to our bucket
    if (oldUrl && oldUrl.includes(bucketName)) {
        try {
            // Extract the exact path from the URL
            const urlObj = new URL(oldUrl);
            const pathParts = urlObj.pathname.split(`/${bucketName}/`);
            if (pathParts.length > 1) {
                const oldFilePath = decodeURIComponent(pathParts[1]);
                await bucket.file(oldFilePath).delete();
                console.log(`Deleted old file: ${oldFilePath}`);
            }
        } catch (delErr) {
            console.warn("Failed to delete old file, continuing with upload...", delErr);
        }
    }

    // Create a safe, unique filename
    const ext = file.name.split('.').pop();
    const uniqueId = Date.now();
    const destFileName = `${propertyId}/${type}s/${type}_${uniqueId}.${ext}`;

    const fileObj = bucket.file(destFileName);

    // Convert Web File to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload directly to GCP Storage using the secure Node backend
    await fileObj.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Make the file publicly readable so the frontend can display it easily
    // (If you want it private later, you would use Signed URLs instead)
    await fileObj.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${destFileName}`;

    return NextResponse.json({ url: publicUrl, path: destFileName });

  } catch (error: any) {
    console.error('Error uploading to GCP:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload to GCP' }, { status: 500 });
  }
}
