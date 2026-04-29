<<<<<<< HEAD
# 📚 LitMind — AI Literature Tutor

An elegant, AI-powered literature tutoring web app built with Node.js, Express, and the Anthropic Claude API.

---

## ✨ Features

- Deep literary analysis — themes, symbolism, narrative technique, character studies
- Full conversation memory within a session
- 12 quick-topic sidebar shortcuts
- Markdown-rendered AI responses (headers, bold, italics, blockquotes)
- Session stats (message count, works discussed)
- Beautiful editorial design — warm parchment aesthetic, Playfair Display typography
- Fully responsive for desktop and mobile
- Secure API key handling (backend proxy — key never exposed to browser)

---

## 📁 Project Structure

```
litmind/
├── public/
│   ├── index.html     ← Main HTML page
│   ├── style.css      ← All styles
│   └── app.js         ← Frontend JavaScript
├── server.js          ← Express backend + API proxy
├── package.json
├── .env.example       ← Copy to .env and add your key
├── .gitignore
└── README.md
```

---

## 🚀 How to Run Locally

### Step 1 — Prerequisites

Make sure you have **Node.js v16+** installed:
```bash
node --version
```
If not installed, download from https://nodejs.org

---

### Step 2 — Get Your Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign in / create account
3. Navigate to **API Keys**
4. Click **Create Key** and copy it

---

### Step 3 — Set Up the Project

```bash
# 1. Enter the project folder
cd litmind

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

Now open `.env` in any text editor and paste your API key:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
```

---

### Step 4 — Run the App

```bash
npm start
```

You should see:
```
  📚 LitMind — AI Literature Tutor
  ─────────────────────────────────
  🚀 Server running at  http://localhost:3000
  🔑 API Key:           ✅ Configured
```

Open your browser at **http://localhost:3000** and start chatting!

For development with auto-restart on file changes:
```bash
npm run dev
```

---

## ☁️ Deployment

### Option A — Deploy to Railway (Recommended, easiest)

1. Create a free account at https://railway.app
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   railway login
   ```
3. In the project folder:
   ```bash
   railway init
   railway up
   ```
4. Set your environment variable in Railway dashboard:
   - Go to your project → Variables → Add `ANTHROPIC_API_KEY=sk-ant-...`
5. Railway gives you a public URL automatically!

---

### Option B — Deploy to Render (Free tier available)

1. Push your project to GitHub (remove `.env`, it's in `.gitignore`)
2. Go to https://render.com and create a new **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Add environment variable: `ANTHROPIC_API_KEY` → your key
6. Click **Deploy** — Render gives you a public HTTPS URL

---

### Option C — Deploy to Heroku

```bash
# Install Heroku CLI, then:
heroku login
heroku create litmind-app
heroku config:set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
git push heroku main
heroku open
```

---

### Option D — Deploy to a VPS (DigitalOcean, AWS EC2, etc.)

```bash
# On your server:
git clone <your-repo> litmind
cd litmind
npm install

# Install PM2 to keep app alive
npm install -g pm2

# Set environment variable
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# Start with PM2
pm2 start server.js --name litmind
pm2 save
pm2 startup

# Optional: set up Nginx as reverse proxy on port 80
```

---

## 🔧 Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | — | Your Anthropic API key |
| `PORT` | No | `3000` | Port for the server |

---

## 🛡️ Security Notes

- The API key is stored **only on the server** — never sent to the browser
- The frontend calls `/api/chat` on your own server, not Anthropic directly
- Add rate limiting for production use (e.g., `express-rate-limit` package)

---

## 🎨 Customization

- **System prompt:** Edit the `SYSTEM_PROMPT` in `server.js` to adjust the tutor's persona
- **Model:** Change `claude-sonnet-4-20250514` in `server.js` to another Claude model
- **Max tokens:** Adjust `max_tokens` in `server.js` (currently 1500)
- **Topic chips:** Add/remove topic chips in `public/index.html`
- **Colors:** Edit CSS variables at the top of `public/style.css`

---

## 📄 License

MIT — free to use, modify, and deploy.
=======
# AI-Literature-Tutor
>>>>>>> 1d9bb4cece6cc499171f62c2b94364cbf9b17e1b
