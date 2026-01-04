const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 5001;

// CSV file path
const CSV_FILE = path.join(__dirname, 'users.csv');

// Initialize CSV file with headers if it doesn't exist
if (!fs.existsSync(CSV_FILE)) {
  fs.writeFileSync(CSV_FILE, 'Token,Name,Email,Phone,Date\n');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to escape CSV fields
function escapeCsv(field) {
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Helper to read all users from CSV
function readUsers() {
  if (!fs.existsSync(CSV_FILE)) return [];
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = csvContent.trim().split('\n');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return { token: values[0], name: values[1], email: values[2], phone: values[3] };
  });
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'User Registration API',
    endpoint: 'POST /api/users - { name, email, phone }'
  });
});

// API to save user data to CSV - returns token for localStorage
app.post('/api/users', (req, res) => {
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
    const users = readUsers();
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
    const csvRow = token + ',' + escapeCsv(name) + ',' + escapeCsv(email) + ',' + escapeCsv(phone) + ',' + date + '\n';

    // Append to CSV file
    fs.appendFileSync(CSV_FILE, csvRow);

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

app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
