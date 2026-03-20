const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

async function test() {
  try {
    console.log("=== STARTING VERBOSE TEST ===");
    const credsStr = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (!credsStr) throw new Error("Missing GCP_SERVICE_ACCOUNT_JSON");
    console.log("1. Loaded GCP_SERVICE_ACCOUNT_JSON from environment. Length:", credsStr.length);
    
    const cleanCredsStr = credsStr.replace(/^'|'$/g, '');
    const credentials = JSON.parse(cleanCredsStr);
    const formattedPrivateKey = credentials.private_key.replace(/\\n/g, '\n');
    console.log("2. Parsed credentials for Project ID:", credentials.project_id);
    console.log("   Client Email:", credentials.client_email);
    console.log("   Private Key looks formatted (starts with BEGIN):", formattedPrivateKey.startsWith('-----BEGIN'));

    const aiConfig = {
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
    };
    
    console.log("3. Passing the following config to GoogleGenAI:");
    console.log(JSON.stringify({
        ...aiConfig,
        vertexai: {
            ...aiConfig.vertexai,
            googleAuthOptions: { credentials: { client_email: aiConfig.vertexai.googleAuthOptions.credentials.client_email, private_key: "***REDACTED***" } }
        }
    }, null, 2));

    const ai = new GoogleGenAI(aiConfig);
    console.log("4. Successfully instantiated GoogleGenAI SDK.");

    console.log("5. Sending request to Vertex AI gemini-3-flash-preview...");
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Hello, reply with just "OK"',
    });

    console.log("=== SUCCESS! ===");
    console.log("Response text:", response.text);

  } catch (err) {
    console.error("\n=== ERROR CAUGHT ===");
    console.error("Name:", err.name);
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
  }
}

test();