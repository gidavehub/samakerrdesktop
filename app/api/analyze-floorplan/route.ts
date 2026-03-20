import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Google Gen AI unified SDK
const initVertexAI = () => {
  try {
    const credsStr = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (!credsStr) throw new Error("Missing GCP_SERVICE_ACCOUNT_JSON in environment variables");
    
    // Remove outer quotes if they exist
    const cleanCredsStr = credsStr.replace(/^'|'$/g, '');
    const credentials = JSON.parse(cleanCredsStr);
    
    // Fix private key formatting if it got mangled by env string passing
    const formattedPrivateKey = credentials.private_key.replace(/\\n/g, '\n');

    console.log("=== NEXT.JS initVertexAI VERBOSE LOGGING ===");
    console.log("Project ID extracted:", credentials.project_id);
    console.log("Client Email extracted:", credentials.client_email);
    console.log("Location set to: global");

    if (!credentials.project_id) {
        throw new Error("Project ID is undefined inside the parsed JSON!");
    }

    // Use the exact working configuration from test-vertex.js
    return new GoogleGenAI({
      project: credentials.project_id,
      location: 'global',
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
  } catch (error) {
    console.error("Failed to initialize Google Gen AI client:", error);
    throw new Error(`Vertex AI Auth Error: ${(error as Error).message}`);
  }
};

// The structure we want Gemini to return
const roomSchema = {
  type: Type.ARRAY,
  description: "A list of rooms detected in the floorplan image.",
  items: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "A unique identifier for the room, like 'room_1', 'living_room_1'. No spaces."
      },
      name: {
        type: Type.STRING,
        description: "A human-readable label for the room. Examples: 'Kitchen', 'Master Bedroom', 'Hallway', 'Bathroom', 'Balcony'."
      },
      // Coordinates normalized to 0-100 percentage.
      // E.g., x: 10 means 10% from the left edge of the image.
      boundingBox: {
        type: Type.OBJECT,
        description: "The bounding box coordinates of the room, as percentages (0 to 100) of the image's width and height.",
        properties: {
          x: { type: Type.NUMBER, description: "X coordinate of the top-left corner (0-100 percentage)." },
          y: { type: Type.NUMBER, description: "Y coordinate of the top-left corner (0-100 percentage)." },
          width: { type: Type.NUMBER, description: "Width of the room (0-100 percentage)." },
          height: { type: Type.NUMBER, description: "Height of the room (0-100 percentage)." },
        },
        required: ["x", "y", "width", "height"]
      }
    },
    required: ["id", "name", "boundingBox"]
  }
};

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided to the API' }, { status: 400 });
    }

    let ai;
    try {
        ai = initVertexAI();
    } catch (authErr: any) {
        return NextResponse.json({ error: authErr.message }, { status: 401 });
    }

    // Ensure clean base64 (remove data:image/jpeg;base64, if present)
    let cleanBase64 = imageBase64;
    if (imageBase64.includes('base64,')) {
        cleanBase64 = imageBase64.split('base64,')[1];
    }

    try {
        // Use the new generateContent syntax from @google/genai
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                data: cleanBase64,
                                mimeType: mimeType || 'image/jpeg',
                            }
                        },
                        {
                            text: "Analyze this architectural floorplan or blueprint with EXTREME precision. We need perfect cutouts of the layout. Identify EVERY SINGLE space, no matter how small: every bedroom, bathroom, kitchen, living area, hallway, closet, balcony, patio, and utility room. For each space, provide a descriptive name (e.g., 'Master Bedroom', 'Guest Bathroom', 'Entry Hallway', 'Walk-in Closet'). Draw a bounding box that PERFECTLY hugs the interior walls of that exact space without bleeding over. The bounding boxes MUST NOT OVERLAP under any circumstances. Every single usable area of the floorplan must be accounted for. The bounding box coordinates MUST be exact percentages (0 to 100, allowing decimals for high precision) relative to the top-left corner of the image. x is horizontal distance from left, y is vertical distance from top. Width and height are the dimensions. BE SUPER PRECISE."
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: roomSchema,
            }
        });
        
        const text = response.text;
        
        if (!text) {
            return NextResponse.json({ error: "Vertex AI returned an empty response" }, { status: 502 });
        }

        let parsedRooms;
        try {
            parsedRooms = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Vertex AI JSON output:", text);
            return NextResponse.json({ error: "Vertex AI returned invalid JSON", details: text }, { status: 502 });
        }

        return NextResponse.json({ rooms: parsedRooms });
        
    } catch (apiError: any) {
        console.error("\n--- RAW VERTEX API ERROR ---");
        console.error(apiError);
        
        // Deeply extract details because standard Error objects often stringify to '{}'
        const errorDetails = {
            message: apiError.message,
            code: apiError.code,
            status: apiError.status,
            name: apiError.name,
            stack: apiError.stack,
            details: apiError.details || (apiError.response && apiError.response.data),
        };
        
        console.error("Extracted Error Details:", JSON.stringify(errorDetails, null, 2));
        
        return NextResponse.json({ 
            error: "Vertex API Error", 
            details: errorDetails 
        }, { status: 502 });
    }

  } catch (error: any) {
    console.error('\n--- CRITICAL ERROR in analyze-floorplan ---');
    console.error(error);
    
    return NextResponse.json({ 
        error: "Failed to communicate with Vertex AI", 
        details: {
            message: error.message,
            name: error.name
        }
    }, { status: 500 });
  }
}