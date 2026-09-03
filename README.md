# ?? LitMind — AI Literature Tutor

An elegant, AI-powered literature tutoring web app built with Node.js, Express, Google OAuth, SQLite, and the Groq API (using Qwen models).

---

## ? Features

- Deep literary analysis — themes, symbolism, narrative technique, character studies
- Full conversation memory within a session (SQLite)
- User Authentication via Google OAuth and "Demo Login"
- Multimodal support - chat with both text and images
- Markdown-rendered AI responses (headers, bold, italics, blockquotes)
- Beautiful editorial design — warm parchment aesthetic, Playfair Display typography
- Fully responsive for desktop and mobile
- Secure API key handling (backend proxy — key never exposed to browser)

---

## ?? Project Structure

```
litmind/
+-- public/
¦   +-- index.html     ? Main HTML page
¦   +-- style.css      ? All styles
¦   +-- app.js         ? Frontend JavaScript
+-- server.js          ? Express backend + Auth & Groq API integration
+-- db.js              ? SQLite Database initialization
+-- package.json
+-- .env.example       ? Copy to .env and add your keys
+-- README.md
```

---

## ?? How to Run Locally

### Step 1 — Prerequisites

Make sure you have **Node.js v20+** installed:
```bash
node --version
```
If not installed, download from https://nodejs.org

---

### Step 2 — Get Your API Keys

**1. Groq API Key (AI Chat)**
1. Go to https://console.groq.com/keys
2. Sign in / create account
3. Click **Create API Key** and copy it (starts with `gsk_`)

**2. Google OAuth Credentials (Login)**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID for a Web Application
3. Add `http://localhost:3000/auth/google/callback` to Authorized redirect URIs
4. Copy the Client ID and Client Secret

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

Now open `.env` in any text editor and paste your API keys:
```env
PORT=3000
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CLIENT_ID=xxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx
```

---

### Step 4 — Run the App

```bash
npm start
```
Open your browser at ** https://ai-literature-tutor.onrender.com** and start chatting!

---

## ?? Deployment (Render)

This app is optimized for deployment on [Render](https://render.com). 
*Note: Render uses an ephemeral filesystem on the free tier, meaning the SQLite database resets on every new deploy. For production persistence, upgrade to a persistent disk or migrate to PostgreSQL.*

1. Push your project to GitHub (ensure `.env` is ignored)
2. Go to Render Dashboard and create a new **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install --build-from-source && npm run build`
   - **Start Command:** `npm start`
5. Environment Variables:
   - `GROQ_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
6. Click **Deploy**
7. **Important:** Add your new Render URL to your Google Cloud Console **Authorized redirect URIs** (e.g., `https://ai-literature-tutor.onrender.com/auth/google/callback`).
APP LINK:  https://ai-literature-tutor.onrender.com
---

## ?? Customization

- **System prompt:** Edit the `SYSTEM_PROMPT` in `server.js` to adjust the tutor's persona
- **Model:** Change the model (currently `qwen/qwen3.8-27b`) in `server.js` 
- **Topic chips:** Add/remove topic chips in `public/index.html`
- **Colors:** Edit CSS variables at the top of `public/style.css`

---

## ?? License

MIT — free to use, modify, and deploy.

