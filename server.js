/**
 * LitMind — AI Literature Tutor
 * server.js — Express backend using GROQ (Free API)
 *
 * Groq API docs: https://console.groq.com/docs
 * Free model used: llama-3.3-70b-versatile (best quality on free tier)
 *
 * Run:  node server.js
 */

require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass SSL certificate issues for local dev (Proxies/Antivirus)

const express = require('express');
const Groq = require('groq-sdk');
const https = require('https');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: __dirname }),
  secret: process.env.SESSION_SECRET || 'litmind-secret-key-super-secure',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
    (accessToken, refreshToken, profile, done) => {
      db.get('SELECT * FROM users WHERE googleId = ?', [profile.id], (err, row) => {
        if (err) return done(err);
        if (!row) {
          const id = Date.now().toString(); // simple ID
          const name = profile.displayName;
          const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
          const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

          db.run('INSERT INTO users (id, googleId, name, email, avatar) VALUES (?, ?, ?, ?, ?)',
            [id, profile.id, name, email, avatar], (err) => {
              if (err) return done(err);
              done(null, { id, googleId: profile.id, name, email, avatar });
            });
        } else {
          done(null, row);
        }
      });
    }
  ));
}

app.use(express.static(path.join(__dirname, 'public')));

// ── System Prompt ───────────────────────────────────────
const SYSTEM_PROMPT = `You are LitMind, an expert AI Literature Tutor with deep scholarly knowledge spanning all world literature traditions, periods, and genres.

Your areas of deep expertise:
- Close reading and textual analysis (imagery, tone, diction, syntax)
- Literary devices: metaphor, simile, symbolism, irony, foreshadowing, alliteration, assonance, enjambment, etc.
- Major literary movements: Romanticism, Realism, Naturalism, Modernism, Postmodernism, Magical Realism, etc.
- World literature: Western canon, African literature, Asian literature, Latin American literature, postcolonial writing
- Poetry: form, meter (iambic pentameter, free verse, etc.), rhyme schemes, prosody, imagery
- Narrative technique: point of view, unreliable narrators, stream of consciousness, frame narratives, epistolary form
- Character analysis: motivation, foils, archetypes, the hero's journey
- Themes and motifs: recurring ideas and their development across a text
- Author biography and historical/cultural context
- Comparative literature: connections across texts, authors, and periods
- Essay writing guidance: thesis construction, argument structure, evidence use, literary criticism styles
- Literary theory: Marxist criticism, feminist criticism, psychoanalytic criticism, New Criticism, deconstruction
- Visual symbolism and artistic analysis from literary perspectives

Response style and formatting:
- Write with the warmth and authority of a beloved professor who makes literature come alive
- Use **bold** for key literary terms on first use, *italics* for all titles and author names
- Structure long responses with ### headers for clarity
- Use > blockquotes when referencing passages or paraphrasing text
- Be thorough but engaging — avoid dry, encyclopedic lists
- Make literary connections across works and periods to show the bigger picture
- Occasionally pose a thoughtful Socratic follow-up question to deepen exploration
- Be encouraging, especially for students — frame analysis as discovery
- When helping with essays, guide rather than write — ask about their thesis and argument

IMPORTANT - Image Analysis:
- You have the ability to see images attached by the user.
- Analyze the image from a literary/symbolic perspective.
- Connect visual elements to literary concepts, symbolism, and artistic traditions.
- Ask clarifying questions about what literary analysis they're seeking (symbolism, composition, cultural significance, etc.).

Always italicize book, poem, and play titles (*Hamlet*, *The Great Gatsby*). Be the tutor who made someone fall in love with literature.`;

// ── Auth Routes ─────────────────────────────────────────
app.get('/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).send('Google Authentication is not configured on this server. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect('/');
  }
  passport.authenticate('google', { failureRedirect: '/' })(req, res, next);
}, (req, res) => {
  res.redirect('/');
});

app.get('/auth/demo', (req, res) => {
  const demoId = 'demo-user-123';
  db.get('SELECT * FROM users WHERE id = ?', [demoId], (err, row) => {
    if (err) return res.status(500).send('DB Error');
    if (!row) {
      db.run('INSERT INTO users (id, name, email, avatar) VALUES (?, ?, ?, ?)',
        [demoId, 'Demo User', 'demo@litmind.com', ''], (err) => {
          if (err) return res.status(500).send('DB Error');
          req.login({ id: demoId, name: 'Demo User', email: 'demo@litmind.com', avatar: null }, (err) => {
            if (err) return res.status(500).send('Login Error');
            res.redirect('/');
          });
        });
    } else {
      req.login(row, (err) => {
        if (err) return res.status(500).send('Login Error');
        res.redirect('/');
      });
    }
  });
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

// ── Session Endpoints ────────────────────────────────────

// List all sessions for the current user
app.get('/api/sessions', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  db.all(
    'SELECT id, title, createdAt FROM chat_sessions WHERE userId = ? ORDER BY createdAt DESC',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows || []);
    }
  );
});

// Create a new session
app.post('/api/sessions', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const id = `sess_${Date.now()}`;
  const title = req.body.title || 'New Conversation';
  db.run('INSERT INTO chat_sessions (id, userId, title) VALUES (?, ?, ?)',
    [id, req.user.id, title], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ id, title });
    }
  );
});

// Update session title
app.patch('/api/sessions/:id', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const { title } = req.body;
  db.run('UPDATE chat_sessions SET title = ? WHERE id = ? AND userId = ?',
    [title, req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    }
  );
});

// Delete a session and its messages
app.delete('/api/sessions/:id', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  db.run('DELETE FROM messages WHERE sessionId = ? AND userId = ?', [req.params.id, req.user.id], () => {
    db.run('DELETE FROM chat_sessions WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    });
  });
});

// Get messages for a specific session
app.get('/api/sessions/:id/messages', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  db.all(
    'SELECT role, content, image FROM messages WHERE sessionId = ? AND userId = ? ORDER BY timestamp ASC',
    [req.params.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows || []);
    }
  );
});

// ── Chat Endpoint ───────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, sessionId } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You must be logged in to chat.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  // Save latest user message to DB with sessionId
  const userMessage = messages[messages.length - 1];
  if (userMessage && userMessage.role === 'user') {
    db.run('INSERT INTO messages (userId, sessionId, role, content, image) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, sessionId || null, userMessage.role, userMessage.content, userMessage.image || null], (err) => {
        if (err) console.error('Failed to save user message', err);
      });
  }

  let hasImageInChat = false;

  const processedMessages = messages.map(msg => {
    const { image, content, role } = msg;
    if (image) {
      hasImageInChat = true;
      return {
        role,
        content: [
          { type: 'text', text: content || 'Please analyze this image from a literary perspective.' },
          { type: 'image_url', image_url: { url: image } }
        ]
      };
    }
    return { role, content };
  });

  const groqMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...processedMessages.slice(-10) // Limit context to last 10 messages to keep payload small
  ];

  const modelToUse = 'qwen/qwen3.8-27b';

  try {
    const groq = new Groq({
      apiKey: apiKey.trim(),
      httpAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages,
      model: modelToUse,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const reply = chatCompletion.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'Empty response from Groq API.' });

    // Save assistant reply with sessionId
    db.run('INSERT INTO messages (userId, sessionId, role, content) VALUES (?, ?, ?, ?)',
      [req.user.id, sessionId || null, 'assistant', reply], (err) => {
        if (err) console.error('Failed to save assistant message', err);
      });

    res.json({ reply });

  } catch (err) {
    console.error('Groq API request error:', err.message);
    
    // Check if we got an HTML response back in the error data
    const responseData = err.response ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : (err.message || '');
    
    if (responseData.includes('<!doctype html>') || responseData.includes('<html>')) {
      const titleMatch = responseData.match(/<title>(.*?)<\/title>/i);
      const h1Match = responseData.match(/<h1>(.*?)<\/h1>/i);
      const htmlError = titleMatch ? titleMatch[1] : (h1Match ? h1Match[1] : 'Network Block Page');

      return res.status(502).json({ 
        error: `Groq API blocked by network: ${htmlError}`, 
        details: err.message,
        rawResponseSnippet: responseData.substring(0, 500) 
      });
    }

    res.status(502).json({ 
      error: 'Failed to connect to Groq API.', 
      details: err.message,
      code: err.code 
    });
  }
});

// ── Audio Transcription Endpoint (Optional) ──────────────
// To enable: install 'speech-recognition' or similar library
// For now, this serves as a placeholder
app.post('/api/transcribe', (req, res) => {
  // TODO: Integrate with speech-to-text API
  res.json({
    text: '[Audio transcription service not configured. Please use browser speech recognition.]',
    status: 'not_configured'
  });
});

// ── Health check ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LitMind API', timestamp: new Date().toISOString() });
});

// ── Catch-all: serve React/SPA ───────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  📚 LitMind — AI Literature Tutor');
  console.log('  ─────────────────────────────────────────');
  console.log(`  🚀 Server:   http://localhost:${PORT}`);
  console.log(`  🤖 Model:    llama-3.3-70b-versatile (Groq)`);
  console.log(`  🔑 API Key:  ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ NOT SET — add GROQ_API_KEY to .env'}`);
  console.log(`  🔑 Google:   ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ NOT SET — add GOOGLE_CLIENT_ID to .env'}`);
  console.log(`  🎤 Voice:    ✅ Enabled (browser-based)`);
  console.log(`  🖼️  Images:   ✅ Upload ready`);
  console.log('  💸 Cost:     FREE');
  console.log('');
});
