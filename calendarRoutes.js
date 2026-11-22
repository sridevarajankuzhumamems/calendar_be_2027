const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getMonthData,
  getDayData,
  updateDayData,
  autoSequenceTamilDates,
  TAMIL_MONTHS,
  THITHIS,
  NAKSHATRAS,
  DAY_TYPES
} = require('./calendarService');

// Multer storage config for image uploads (Memory storage for direct GitHub push)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// 1. Metadata endpoint (dropdown values, types)
router.get('/meta', (req, res) => {
  res.json({
    success: true,
    data: {
      tamilMonths: TAMIL_MONTHS,
      thithis: THITHIS,
      nakshatras: NAKSHATRAS,
      dayTypes: DAY_TYPES
    }
  });
});

// 2. Get Month Calendar Data
router.get('/:year/:month', (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      return res.status(400).json({ success: false, message: 'Invalid year or month' });
    }

    const data = getMonthData(year, month);
    
    // Add cache header for clients
    res.set('Cache-Control', 'public, max-age=60'); // 1 minute fresh in cache, then revalidate
    res.json({
      success: true,
      year,
      month,
      daysCount: data.length,
      days: data
    });
  } catch (err) {
    console.error('Error fetching month data:', err);
    res.status(500).json({ success: false, message: 'Server error fetching month data' });
  }
});

// 3. Get Day Calendar Data
router.get('/:year/:month/:day', (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const day = parseInt(req.params.day, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return res.status(400).json({ success: false, message: 'Invalid year, month, or day' });
    }

    const data = getDayData(year, month, day);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching day data:', err);
    res.status(500).json({ success: false, message: 'Server error fetching day data' });
  }
});

// 4. Update Day Calendar Data
router.put('/:year/:month/:day', (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const day = parseInt(req.params.day, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return res.status(400).json({ success: false, message: 'Invalid year, month, or day' });
    }

    const updated = updateDayData(year, month, day, req.body);
    res.json({ success: true, message: 'Day updated successfully', data: updated });
  } catch (err) {
    console.error('Error updating day data:', err);
    res.status(500).json({ success: false, message: 'Server error updating day data' });
  }
});

// 5. Auto Sequence Tamil Dates for a Month
router.post('/:year/:month/auto-sequence', (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { startTamilMonth, startTamilDay } = req.body;

    if (!startTamilMonth || !startTamilDay) {
      return res.status(400).json({ success: false, message: 'startTamilMonth and startTamilDay are required' });
    }

    const result = autoSequenceTamilDates(year, month, startTamilMonth, startTamilDay);
    res.json({
      success: true,
      message: 'Month sequenced successfully',
      days: result
    });
  } catch (err) {
    console.error('Error auto-sequencing:', err);
    res.status(500).json({ success: false, message: 'Server error auto-sequencing month' });
  }
});

// 6. Image Upload directly to GitHub repository & return jsDelivr CDN URL
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'sridevarajankuzhumamems';
    const repo = process.env.GITHUB_REPO || 'sdk_images_2027';
    const branch = process.env.GITHUB_BRANCH || 'main';

    const ext = path.extname(req.file.originalname) || '.jpg';
    const baseName = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}_${baseName}${ext}`;
    const filePath = `downloads/${fileName}`;

    if (token) {
      // 1. Commit and push file directly to GitHub via REST API
      const ghResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'CalendarBackend',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Upload ${fileName} via Calendar Admin`,
          content: req.file.buffer.toString('base64'),
          branch: branch
        })
      });

      const ghData = await ghResponse.json();

      if (!ghResponse.ok) {
        console.error('GitHub API error:', ghData);
        return res.status(500).json({
          success: false,
          message: ghData.message || 'GitHub commit failed'
        });
      }

      // 2. Build the public jsDelivr CDN URL
      const cdnUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}/downloads/${fileName}`;

      return res.json({
        success: true,
        message: 'Image uploaded to GitHub and available via jsDelivr CDN!',
        url: cdnUrl,
        filename: fileName
      });
    } else {
      // Fallback: save to local uploads directory if no token configured
      const localPath = path.join(uploadsDir, fileName);
      fs.writeFileSync(localPath, req.file.buffer);

      const protocol = req.protocol;
      const host = req.get('host');
      const localUrl = `${protocol}://${host}/uploads/${fileName}`;

      return res.json({
        success: true,
        message: 'Image uploaded locally',
        url: localUrl,
        filename: fileName
      });
    }
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'Error uploading image: ' + err.message });
  }
});

module.exports = router;

