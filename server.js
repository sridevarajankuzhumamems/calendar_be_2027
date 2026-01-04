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

// Initialize Google Sheets API
let sheets;

async function initGoogleSheets() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const authClient = await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth: authClient });

    // Create header row if sheet is empty
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:E1`
    });

    if (!response.data.values || response.data.values.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        resource: { values: [['Token', 'Name', 'Email', 'Phone', 'Date']] }
      });
    }
    console.log('Google Sheets connected successfully');
  } catch (error) {
    console.error('Error initializing Google Sheets:', error.message);
  }
}

// Read all users from Google Sheets
async function readUsers() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E`
    });
    const rows = response.data.values || [];
    return rows.map(row => ({
      token: row[0],
      name: row[1],
      email: row[2],
      phone: row[3],
      date: row[4]
    }));
  } catch (error) {
    console.error('Error reading users:', error.message);
    return [];
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'User Registration API with Google Sheets',
    endpoints: {
      register: 'POST /api/users - { name, email, phone }',
      getUsers: 'GET /api/users'
    }
  });
});

// API to save user data to Google Sheets
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate input
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and phone'
      });
    }

    // Check for unique email and phone
    const users = await readUsers();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    if (users.find(u => u.phone === phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Generate unique token for localStorage
    const token = crypto.randomBytes(16).toString('hex');
    const date = new Date().toISOString();

    // Append to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`,
      valueInputOption: 'RAW',
      resource: { values: [[token, name, email, phone, date]] }
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token: token
    });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving user information'
    });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await readUsers();
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading users' });
  }
});

// Initialize and start server
initGoogleSheets().then(() => {
  app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
  });
});
