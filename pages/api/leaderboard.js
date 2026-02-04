import { google } from 'googleapis';
import vm from 'node:vm';

// Helper to get authenticated Sheets client
async function getSheetsClient() {
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing in environment variables');
  }

  // Robust parsing for "dirty JSON" (common in Vercel env vars)
  let cleanServiceAccount = serviceAccount.trim();
  if ((cleanServiceAccount.startsWith("'") && cleanServiceAccount.endsWith("'")) ||
      (cleanServiceAccount.startsWith('"') && cleanServiceAccount.endsWith('"'))) {
    cleanServiceAccount = cleanServiceAccount.slice(1, -1);
  }

  let credentials;
  try {
    credentials = JSON.parse(cleanServiceAccount);
  } catch (err) {
    try {
      const sandbox = {};
      credentials = vm.runInNewContext(`(${cleanServiceAccount})`, sandbox);
    } catch (vmErr) {
      throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${err.message}. Ensure it is valid JSON.`);
    }
  }
  
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

function buildLeaderboard(rows) {
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
      summary: row[6] || '',
    };

    const key = `${entry.name.trim()}|${entry.car.trim()}`.toLowerCase();
    const currentMs = parseLapTimeToMs(entry.time);

    // Keep the FASTEST entry for this driver+car combo
    if (!bestRuns.has(key)) {
      bestRuns.set(key, entry);
    } else {
      const existing = bestRuns.get(key);
      const existingMs = parseLapTimeToMs(existing.time);
      if (currentMs < existingMs) {
        bestRuns.set(key, entry);
      }
    }
  });

  const leaderboard = Array.from(bestRuns.values());
  leaderboard.sort((a, b) => parseLapTimeToMs(a.time) - parseLapTimeToMs(b.time));
  leaderboard.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return leaderboard;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const SPREADSHEET_ID = process.env.GOOGLE_LEADERBOARD_SHEET_ID || process.env.GOOGLE_SHEET_ID;
  const LEADERBOARD_SHEET_NAME = process.env.GOOGLE_LEADERBOARD_SHEET_NAME || 'Sheet2';
  const INPUT_SHEET_NAME = process.env.GOOGLE_INPUT_SHEET_NAME || 'Sheet1';
  
  if (!SPREADSHEET_ID) {
    return res.status(500).json({ error: 'Server misconfigured: GOOGLE_SHEET_ID / GOOGLE_LEADERBOARD_SHEET_ID missing' });
  }

  try {
    const sheets = await getSheetsClient();

    if (req.method === 'GET') {
      // READ LEADERBOARD from Sheet2
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${LEADERBOARD_SHEET_NAME}!A2:G1000`,
      });

      let rows = response.data.values || [];
      
      // Fallback: If Sheet2 is empty, try reading from Sheet1 and computing it on the fly
      if (!rows.length) {
         console.log('Sheet2 empty, falling back to computing from Sheet1');
         const inputResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${INPUT_SHEET_NAME}!A2:G1000`,
         });
         const inputRows = inputResponse.data.values || [];
         const computed = buildLeaderboard(inputRows);
         return res.status(200).json(computed);
      }

      // If we read from Sheet2, we assume it is already sorted/deduped by the POST process
      const leaderboard = rows.map((row, i) => ({
          rank: i + 1,
          name: row[0] || 'Anonymous',
          car: row[1] || 'Unknown',
          time: row[2] || '00:00.0',
          level: row[3] || '0',
          url: row[4] || '',
          mods: row[5] || '',
          summary: row[6] || ''
      }));

      return res.status(200).json(leaderboard);

    } 
    
    else if (req.method === 'POST') {
      // APPEND NEW ENTRY to Sheet1 (Log)
      const { name, car, time, level, url, mods, summary } = req.body;
      console.log(`[Leaderboard] Appending entry: ${name} in ${car}`);

      if (!time) {
        return res.status(400).json({ error: 'Missing lap time' });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${INPUT_SHEET_NAME}!A:G`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[name, car, time, level, url, mods, summary || '']],
        },
      });

      // UPDATE LEADERBOARD (Sheet2)
      // 1. Read all logs from Sheet1
      const inputResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${INPUT_SHEET_NAME}!A2:G1000`,
      });
      const inputRows = inputResponse.data.values || [];
      
      // 2. Compute best times
      const leaderboard = buildLeaderboard(inputRows);

      // 3. Prepare Sheet2 payload (including header)
      const header = ['Driver', 'Car', 'Time', 'Score', 'YouTube', 'Mods', 'Summary'];
      const values = [header].concat(
        leaderboard.map((entry) => [
          entry.name,
          entry.car,
          entry.time,
          entry.level,
          entry.url,
          entry.mods,
          entry.summary || '',
        ]),
      );

      // 4. Overwrite Sheet2
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${LEADERBOARD_SHEET_NAME}!A1:Z1000`,
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${LEADERBOARD_SHEET_NAME}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      console.log(`[Leaderboard] Successfully appended to ${INPUT_SHEET_NAME} and updated ${LEADERBOARD_SHEET_NAME}`);
      return res.status(200).json({ message: 'Success', leaderboard });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    res.status(500).json({ 
      error: 'Failed to sync with sheets', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
