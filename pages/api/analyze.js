import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, carModel, engineMod, suspensionMod, aeroMod } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server API key missing' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Fetch YouTube Metadata (Channel Name) via oEmbed
    let channelName = "Unknown Channel";
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.author_name) {
          channelName = oembedData.author_name;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch YouTube oEmbed data:", err);
    }

    // Use gemini-1.5-pro-latest (or similar available model)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // Read prompt file
    const promptPath = path.join(process.cwd(), 'prompt.md');
    let systemPrompt = fs.readFileSync(promptPath, 'utf8');

    // Inject user-provided car details into the prompt
    const vehicleDetails = `
    \n### User-Provided Vehicle Info:
    - **Car Model**: ${carModel || 'Unknown'}
    - **Engine Mods**: ${engineMod || 'Unknown'}
    - **Suspension Mods**: ${suspensionMod || 'Unknown'}
    - **Aero Mods**: ${aeroMod || 'Unknown'}
    - **YouTube Channel**: ${channelName}
    \nUse this info to accurately assess the vehicle's potential capabilities vs actual lap time.
    `;
    systemPrompt += vehicleDetails;

    // Construct parts
    const promptParts = [
      systemPrompt,
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: url
        }
      }
    ];

    console.log(`Analyzing ${url}...`);
    
    const result = await model.generateContent(promptParts);
    const response = await result.response;
    let text = response.text();

    // Clean Markdown code blocks (```json ... ```)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const jsonResult = JSON.parse(text);

    // Append channel name to the result
    jsonResult.channel_name = channelName;

    res.status(200).json(jsonResult);

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
}
