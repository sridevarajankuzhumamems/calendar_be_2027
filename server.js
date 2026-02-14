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
const LOG_SHEET_NAME = 'Logs';

// In-memory cache to track usage count
let usersCache = new Map(); // Map<string, number> to store counts
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

    // Load existing data to initialize cache and SDK counter
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:D`
    });

    const rows = response.data.values || [];

    // Find max SDK ID to resume counter
    let maxSdkNum = 6; // Start from 6 since 1-6 are reserved for admins

    rows.forEach(row => {
      // row[0] is SDK ID, row[2] is email, row[3] is phone
      if (row[0] && row[0].startsWith('SDK')) {
        const num = parseInt(row[0].replace('SDK', ''));
        if (num > maxSdkNum) maxSdkNum = num;
      }

      if (row[2]) {
        const email = row[2];
        usersCache.set(email, (usersCache.get(email) || 0) + 1);
      }
      if (row[3]) {
        const phone = row[3];
        usersCache.set(phone, (usersCache.get(phone) || 0) + 1);
      }
    });

    // Set counter to next available ID
    sdkCounter = maxSdkNum + 1;

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
app.set('trust proxy', true); // Trust proxy for IP extraction

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Admins exempt from limits
const ADMIN_EMAILS = new Set([
  'plssv6896@gmail.com',
  'nagarajanchandrasekar1973@gmail.com',
  'venkataramanankm@gmail.com',
  'kesavaraman2002@gmail.com',
  'arunarun23602@gmail.com',
  'brsridharan15@gmail.com',
  'srinivasandevanathan@gmail.com',
  'srivaratharajaperumal@gmail.com'
]);

const ADMIN_PHONES = new Set([
  '6384625665',
  '9342870117',
  '6369999091',
  '8300686349',
  '9488517403',
  '9150902897',
  '9597788441',
  '9876125690'
]);

// Map admin emails/phones to reserved SDK IDs (SDK00001 - SDK00006)
const ADMIN_SDK_IDS = new Map([
  ['srinivasandevanathan@gmail.com', 'SDK00007'],
  ['9597788441', 'SDK00007'],
  ['plssv6896@gmail.com', 'SDK00002'],
  ['6384625665', 'SDK00002'],
  ['nagarajanchandrasekar1973@gmail.com', 'SDK00005'],
  ['9342870117', 'SDK00005'],
  ['venkataramanankm@gmail.com', 'SDK00004'],
  ['6369999091', 'SDK00004'],
  ['kesavaraman2002@gmail.com', 'SDK00003'],
  ['8300686349', 'SDK00003'],
  ['arunarun23602@gmail.com', 'SDK00006'],
  ['9488517403', 'SDK00006'],
  ['brsridharan15@gmail.com', 'SDK00001'],
  ['9150902897', 'SDK00001'],
  ['srivaratharajaperumal@gmail.com', 'SDK00000'],
  ['9876125690', 'SDK00000']
]);

// SDK ID counter (starts at 7, since 1-6 are reserved for admins)
let sdkCounter = 8;

function generateSDKId(email, phone) {
  // Check if admin - return reserved ID
  if (ADMIN_SDK_IDS.has(email)) {
    return ADMIN_SDK_IDS.get(email);
  }
  if (ADMIN_SDK_IDS.has(phone)) {
    return ADMIN_SDK_IDS.get(phone);
  }

  // Generate new ID for regular users
  const id = `SDK${String(sdkCounter).padStart(5, '0')}`;
  sdkCounter++;
  return id;
}


// Validation Helper
function validateRegistrationInput(name, email, phone) {
  // Mobile Validation
  const phoneStr = String(phone).trim();

  // 1. Basic Format (10 digits)
  if (!/^\d{10}$/.test(phoneStr)) {
    return "Phone number must be exactly 10 digits.";
  }

  // 2. Indian Prefix (6, 7, 8, 9)
  if (!/^[6-9]/.test(phoneStr)) {
    return "Phone number must start with 6, 7, 8, or 9.";
  }

  // 3. Repeated Characters (e.g., 9999999999)
  if (/^(\d)\1{9}$/.test(phoneStr)) {
    return "Invalid phone number: Cannot be all same digits.";
  }

  // 4. Sequential Ascending/Descending (e.g., 1234567890, 9876543210)
  const asc = "01234567890123456789";
  const desc = "98765432109876543210";
  if (asc.includes(phoneStr) || desc.includes(phoneStr)) {
    return "Invalid phone number: Cannot be a simple sequence.";
  }

  // Email Validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(String(email).trim())) {
    return "Invalid email address format.";
  }

  // Name Validation
  if (!name || name.trim().length < 3) {
    return "Name must be at least 3 characters long.";
  }

  return null; // Valid
}

// Register user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const validationError = validateRegistrationInput(name, email, phone);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // Initialize on first request
    if (!await ensureInitialized()) {
      return res.status(500).json({
        success: false,
        message: 'Service temporarily unavailable'
      });
    }

    // Check usage limits (allow up to 2 times), unless admin
    const emailCount = usersCache.get(email) || 0;
    const phoneCount = usersCache.get(phone) || 0;

    const isEmailExempt = ADMIN_EMAILS.has(email);
    const isPhoneExempt = ADMIN_PHONES.has(phone);

    if (emailCount >= 2 && !isEmailExempt) {
      return res.status(400).json({
        success: false,
        message: 'Email has reached the maximum registration limit (2)'
      });
    }
    if (phoneCount >= 2 && !isPhoneExempt) {
      return res.status(400).json({
        success: false,
        message: 'Phone number has reached the maximum registration limit (2)'
      });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const sdkId = generateSDKId(email, phone);
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

    // Capture IP Address
    const ip = req.ip || req.connection.remoteAddress;

    // Increment counts immediately
    usersCache.set(email, emailCount + 1);
    usersCache.set(phone, phoneCount + 1);

    // Send response first
    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token: token,
      sdkId: sdkId
    });

    // Save to sheet in background (SDK ID is first column now)
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B:H`,
      valueInputOption: 'RAW',
      resource: { values: [[sdkId, token, name, email, phone, date, ip]] }
    }).catch(err => {
      console.error('Save error:', err.message);
      // Rollback counts on failure
      usersCache.set(email, usersCache.get(email) - 1);
      usersCache.set(phone, usersCache.get(phone) - 1);
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error saving user'
    });
  }
});

// Activity logging
app.post('/api/logs', async (req, res) => {
  try {
    const { name, email, phone, sdkId } = req.body;

    const validationError = validateRegistrationInput(name, email, phone);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    if (!await ensureInitialized()) {
      return res.status(500).json({
        success: false,
        message: 'Service temporarily unavailable'
      });
    }

    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Capture IP Address
    const ip = req.ip || req.connection.remoteAddress;

    // Send response first
    res.status(201).json({
      success: true,
      message: 'Activity logged successfully!'
    });

    // Save to sheet in background
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${LOG_SHEET_NAME}!B:F`,
      valueInputOption: 'RAW',
      resource: { values: [[name, email, phone, timestamp, ip, sdkId]] }
    }).catch(err => {
      console.error('Log save error:', err.message);
    });

  } catch (error) {
    console.error('Log error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error logging activity'
    });
  }
});

// Start server immediately (no waiting for Google Sheets)
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});