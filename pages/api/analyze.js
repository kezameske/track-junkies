import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, carModel, engineMod, suspensionMod, aeroMod, mods, tire } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const normalizeUrl = (input) => {
    const trimmed = String(input || '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const normalizedUrl = normalizeUrl(url);
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    return res.status(400).json({ error: 'URL must start with http:// or https://' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is missing' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Fetch YouTube Metadata (Channel Name) via oEmbed
    let channelName = "Unknown Channel";
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`;
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

    // Use gemini-2.0-flash as requested
    const modelId = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    console.log(`Initializing Gemini model: ${modelId}`);
    const model = genAI.getGenerativeModel({ model: modelId });

    // Read prompt file
    const promptPath = path.join(process.cwd(), 'prompt.md');
    let systemPrompt = fs.readFileSync(promptPath, 'utf8');

    const getModsLine = (label, value) => {
      if (!value) return `- **${label}**: Unknown`;
      if (Array.isArray(value)) return `- **${label}**: ${value.join(', ') || 'Unknown'}`;
      return `- **${label}**: ${String(value)}`;
    };

    const structured = mods && typeof mods === 'object' ? mods : null;
    const tireValue = (structured && typeof structured.tire === 'string') ? structured.tire : tire;

    // Inject user-provided car details into the prompt
    const vehicleDetails = `
\n### User-Provided Vehicle Info:
- **Car Model**: ${carModel || 'Unknown'}
${getModsLine('Engine', structured?.engine) }
${getModsLine('ECU', structured?.ecu) }
${getModsLine('Drivetrain', structured?.drivetrain) }
${getModsLine('Suspension', structured?.suspension) }
${getModsLine('Aero', structured?.aero) }
${getModsLine('Tire', tireValue) }
- **Legacy Engine Mods**: ${engineMod || 'Unknown'}
- **Legacy Suspension Mods**: ${suspensionMod || 'Unknown'}
- **Legacy Aero Mods**: ${aeroMod || 'Unknown'}
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
          fileUri: normalizedUrl
        }
      }
    ];

    console.log(`Analyzing ${normalizedUrl}...`);
    
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
    const message = error?.message || 'Analysis failed';
    if (message.includes('429') || error?.status === 429) {
      return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
    }
    res.status(500).json({ error: message });
  }
}
