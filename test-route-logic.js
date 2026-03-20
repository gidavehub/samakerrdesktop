const { GoogleGenAI } = require('@google/genai');

// Explicitly test exactly what the route.ts file is doing with process.env
async function test() {
  try {
    // 1. Get the string exactly as route.ts does
    const credsStr = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (!credsStr) throw new Error("Missing GCP_SERVICE_ACCOUNT_JSON in environment variables");
    
    // 2. Clean and parse exactly as route.ts does
    const cleanCredsStr = credsStr.replace(/^'|'$/g, '');
    const credentials = JSON.parse(cleanCredsStr);
    const formattedPrivateKey = credentials.private_key.replace(/\\n/g, '\n');

    // 3. Initialize EXACTLY as route.ts does
    const ai = new GoogleGenAI({
      vertexai: {
        project: credentials.project_id,
        location: 'global',
        googleAuthOptions: {
          credentials: {
            client_email: credentials.client_email,
            private_key: formattedPrivateKey,
          }
        }
      }
    });

    console.log("Initialization successful.");
    console.log("Sending test request to gemini-3-flash-preview on global...");

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Test'
    });

    console.log("SUCCESS! Response:", response.text);

  } catch (error) {
    console.error("\n=== ERROR ===");
    console.error(error.message);
  }
}

test();