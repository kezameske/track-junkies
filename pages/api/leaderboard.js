import { google } from 'googleapis';
import vm from 'node:vm';

// Helper to get authenticated Sheets client
async function getSheetsClient() {
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing in environment variables');
  }

  // Robust parsing for "dirty JSON" (common in Vercel env vars)
  // Handles single quotes, unquoted keys, trailing commas, etc.
  let cleanServiceAccount = serviceAccount.trim();
  
  // Strip outer quotes if present
  if ((cleanServiceAccount.startsWith("'") && cleanServiceAccount.endsWith("'")) ||
      (cleanServiceAccount.startsWith('"') && cleanServiceAccount.endsWith('"'))) {
    cleanServiceAccount = cleanServiceAccount.slice(1, -1);
  }

  let credentials;
  try {
    // 1. Try strict JSON parse first
    credentials = JSON.parse(cleanServiceAccount);
  } catch (err) {
    // 2. Fallback: Use vm.runInNewContext to safely evaluate JS object literals / loose JSON
    // This handles { 'key': 'value' } or { key: "value" } formats common in copy-paste
    try {
      const sandbox = {};
      credentials = vm.runInNewContext(`(${cleanServiceAccount})`, sandbox);
    } catch (vmErr) {
      throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${err.message}. Ensure it is valid JSON.`);
    }
  }
  
  // Basic validation of credentials
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Invalid Service Account JSON: Missing client_email or private_key');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Helper to parse "MM:SS.ms" into milliseconds
function parseLapTimeToMs(timeStr) {
  if (!timeStr) return Infinity;
  // Remove any non-time chars (keep digits, colon, dot)
  const cleanStr = timeStr.replace(/[^0-9:.]/g, '');
  const parts = cleanStr.split(':');
  
  try {
    let minutes = 0;
    let seconds = 0;
    
    if (parts.length === 2) {
      minutes = parseFloat(parts[0]);
      seconds = parseFloat(parts[1]);
    } else if (parts.length === 1) {
      seconds = parseFloat(parts[0]);
    } else {
      return Infinity;
    }
    
    return (minutes * 60 * 1000) + (seconds * 1000);
  } catch (e) {
    return Infinity;
  }
}

export default async function handler(req, res) {
  const SPREADSHEET_ID = process.env.GOOGLE_LEADERBOARD_SHEET_ID || process.env.GOOGLE_SHEET_ID;
  const SHEET_NAME = process.env.GOOGLE_LEADERBOARD_SHEET_NAME || 'Sheet2';
  
  if (!SPREADSHEET_ID) {
    return res.status(500).json({ error: 'Server misconfigured: GOOGLE_SHEET_ID / GOOGLE_LEADERBOARD_SHEET_ID missing' });
  }

  try {
    const sheets = await getSheetsClient();

    if (req.method === 'GET') {
      // READ LEADERBOARD
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:G1000`, // A to G covers 7 columns (0-6)
      });

      const rows = response.data.values || [];
      
      // Deduplicate: Map(Name+Car -> Entry)
      // Strategy: keep the LATEST entry per (driver, car) (sheet is append-only chronological)
      const bestRuns = new Map();

      rows.forEach((row) => {
        const entry = {
          rank: 0,
          name: row[0] || 'Anonymous',
          car: row[1] || 'Unknown',
          time: row[2] || '00:00.0',
          level: row[3] || '0',
          url: row[4] || '',
          mods: row[5] || '',
          summary: row[6] || ''
        };

        const key = `${entry.name.trim()}|${entry.car.trim()}`.toLowerCase();
        bestRuns.set(key, entry);
      });

      const leaderboard = Array.from(bestRuns.values());

      // Sort by time (numeric ascending)
      leaderboard.sort((a, b) => parseLapTimeToMs(a.time) - parseLapTimeToMs(b.time));

      // Re-assign ranks after sort
      leaderboard.forEach((entry, i) => entry.rank = i + 1);

      return res.status(200).json(leaderboard);
    } 
    
    else if (req.method === 'POST') {
      // APPEND NEW ENTRY
      const { name, car, time, level, url, mods, summary } = req.body;
      console.log(`[Leaderboard] Appending entry: ${name} in ${car}`);

      if (!time) {
        return res.status(400).json({ error: 'Missing lap time' });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:G`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[name, car, time, level, url, mods, summary || '']],
        },
      });

      console.log(`[Leaderboard] Successfully appended to ${SHEET_NAME}`);
      return res.status(200).json({ message: 'Success' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    // Return explicit error message for debugging
    res.status(500).json({ 
      error: 'Failed to sync with leaderboard', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
