const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subject = req.body.subject?.trim() || 'Uncategorized';
    const subjectDir = path.join(__dirname, 'uploads', subject);
    fs.mkdirSync(subjectDir, { recursive: true });
    cb(null, subjectDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Fake user store
const users = {
  'Teacher@01': { password: 'Teacher@01', role: 'teacher' },
  'Student@01': { password: 'Student@01', role: 'student' },
  'Student@02': { password: 'Student@02', role: 'student' },
  'Student@03': { password: 'Student@03', role: 'student' },
};

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username].password === password) {
    res.json({ success: true, role: users[username].role });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

// Upload notes
app.post('/upload', upload.single('note'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  res.json({ success: true, message: "File uploaded successfully" });
});

// List notes for a subject
app.get('/notes/:subject', (req, res) => {
  const subject = req.params.subject.trim();
  const subjectDir = path.join(__dirname, 'uploads', subject);

  if (!fs.existsSync(subjectDir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(subjectDir).map(file => `${subject}/${file}`);
  res.json(files);
});

// Delete a specific note
app.delete('/notes/:subject/:filename', (req, res) => {
  const { subject, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', subject, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

// Chatbot using Gemini via REST API
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ error: 'Empty message sent to chatbot.' });
  }

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/chat-bison-001:generateMessage',
      {
        prompt: {
          messages: [{ content: message }]
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          key: process.env.GEMINI_API_KEY
        }
      }
    );

    const reply = response?.data?.candidates?.[0]?.content || "No reply received.";
    console.log("Gemini Response:", reply);
    res.json({ response: reply });

  } catch (error) {
    console.error("Gemini Chatbot Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error contacting Gemini API." });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
