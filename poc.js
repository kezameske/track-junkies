const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

// Configuration
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-3-flash-preview"; // Use Gemini 3 Flash Preview

if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY not found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function analyzeVideo(videoUrl) {
  console.log(`Analyzing video: ${videoUrl}...`);
  
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // Read the system prompt
  const promptText = fs.readFileSync("prompt.md", "utf8");

  // Construct the prompt with the native YouTube URL part
  // Note: Check if your SDK version supports 'fileUri' for public URLs directly
  // If not, you may need to use the File API manager. 
  // For this POC, we try the part structure.
  
  const prompt = [
    promptText,
    {
      fileData: {
        mimeType: "video/mp4",
        fileUri: videoUrl 
      }
    }
  ];

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("\n--- Analysis Result ---");
    console.log(text);
    console.log("-----------------------\n");
  } catch (error) {
    console.error("Error generating content:", error);
  }
}

// Test Links provided by user
const video1 = "https://youtu.be/U3qdTuR4U5I";
const video2 = "https://youtu.be/m8kuJ0rvrPA";

(async () => {
  await analyzeVideo(video1);
  // await analyzeVideo(video2); // Uncomment to test second video
})();
