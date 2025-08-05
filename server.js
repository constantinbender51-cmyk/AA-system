require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const app = express();
const express = require('express');
const app = express();

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Simple memory store for tokens (not production suitable)
const tokenStore = {};


// Generate auth URL
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

// OAuth callback handler
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    // Store tokens - in production use a proper database
    const sessionId = Math.random().toString(36).substring(2);
    tokenStore[sessionId] = tokens;
    
    res.send(`
      <h1>Authentication Successful</h1>
      <p>Your session ID: ${sessionId}</p>
      <a href="/emails?session=${sessionId}">Fetch Emails</a>
    `);
  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(500).send('Authentication failed');
  }
});

// Fetch emails endpoint
app.get('/emails', async (req, res) => {
  const { session } = req.query;
  if (!session || !tokenStore[session]) {
    return res.redirect('/auth');
  }
  
  try {
    oauth2Client.setCredentials(tokenStore[session]);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).send('Error fetching emails');
  }
});
// Health check endpoint
app.get('/health', (req, res) => res.sendStatus(200));

// Keep process alive
setInterval(() => {}, 1000);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
