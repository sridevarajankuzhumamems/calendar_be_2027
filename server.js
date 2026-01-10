require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 5001;

// Google Sheets Configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = 'Users';

// In-memory cache
let usersCache = new Set();
let sheets = null;
let isInitialized = false;

// Lazy initialization - only connect when first request comes
async function ensureInitialized() {
  if (isInitialized) return true;

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const authClient = await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth: authClient });

    // Load existing emails and phones into cache
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!C2:D`
    });

    const rows = response.data.values || [];
    rows.forEach(row => {
      if (row[0]) usersCache.add(row[0]); // email
      if (row[1]) usersCache.add(row[1]); // phone
    });

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Init error:', error.message);
    return false;
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Register user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and phone'
      });
    }

    // Initialize on first request
    if (!await ensureInitialized()) {
      return res.status(500).json({
        success: false,
        message: 'Service temporarily unavailable'
      });
    }

    // Fast uniqueness check using Set
    if (usersCache.has(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    if (usersCache.has(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    const token = crypto.randomBytes(16).toString('hex');
    // const date = new Date().toISOString();
  const date = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });


    // Add to cache immediately
    usersCache.add(email);
    usersCache.add(phone);

    // Send response first
    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token: token
    });

    // Save to sheet in background
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`,
      valueInputOption: 'RAW',
      resource: { values: [[token, name, email, phone, date]] }
    }).catch(err => {
      console.error('Save error:', err.message);
      usersCache.delete(email);
      usersCache.delete(phone);
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error saving user'
    });
  }
});

// Start server immediately (no waiting for Google Sheets)
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
