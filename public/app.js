/**
 * LitMind — AI Literature Tutor
 * app.js — Main client-side logic
 *
 * Calls the Anthropic API via the server proxy (/api/chat)
 * to keep the API key secure on the backend.
 */

// ── State ──────────────────────────────────────────────
let conversationHistory = [];
let messageCount = 0;
let worksDiscussed = new Set();
let isLoading = false;
let currentUser = null;
let currentSessionId = null;

// Literary keywords for tracking "works discussed"
const LITERARY_KEYWORDS = [
  'hamlet', 'gatsby', 'odyssey', 'macbeth', 'austen', 'dickens', 'woolf',
  'orwell', 'morrison', 'shakespeare', 'faulkner', 'joyce', 'fitzgerald',
  'hemingway', 'kafka', 'dostoevsky', 'tolstoy', 'flaubert', 'chekhov',
  'sophocles', 'homer', 'dante', 'cervantes', 'milton', 'chaucer', 'eliot',
  'dickinson', 'whitman', 'keats', 'byron', 'shelley', 'coleridge',
  'wordsworth', 'blake', 'tennyson', 'yeats', 'frost', 'hughes', 'achebe',
  'rushdie', 'marquez', 'beloved', 'frankenstein', 'dracula', 'ulysses',
  'inferno', 'iliad', 'aeneid', 'beowulf', 'canterbury', 'paradise lost',
  'jane eyre', 'wuthering heights', 'moby dick', 'war and peace', 'anna karenina',
  'crime and punishment', 'brothers karamazov', 'les miserables', 'don quixote'
];

// ── DOM Helpers ─────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function scrollToBottom() {
  const messages = $('messages');
  messages.scrollTop = messages.scrollHeight;
}

function removeWelcome() {
  const welcome = $('welcome');
  if (welcome) welcome.remove();
}

function setStatus(text) {
  const el = $('status-val');
  if (el) el.textContent = text;
}

function updateStats() {
  $('msg-count').textContent = messageCount;
  $('works-count').textContent = worksDiscussed.size;
}

function detectWorks(text) {
  const lower = text.toLowerCase();
  LITERARY_KEYWORDS.forEach(kw => { if (lower.includes(kw)) worksDiscussed.add(kw); });
}

// ── Escape HTML ─────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Markdown Renderer ────────────────────────────────────
function renderMarkdown(text) {
  let html = escHtml(text);
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h3>/g, '<h3>').replace(/<\/h3><\/p>/g, '</h3>');
  html = html.replace(/<p><blockquote>/g, '<blockquote>').replace(/<\/blockquote><\/p>/g, '</blockquote>');
  html = html.replace(/<p><hr><\/p>/g, '<hr>');
  html = html.replace(/<p><ul>/g, '<ul>').replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><li>/g, '<li>').replace(/<\/li><\/p>/g, '</li>');
  return html;
}

// ── Message Rendering ────────────────────────────────────
function appendMessage(role, content) {
  removeWelcome();
  const messages = $('messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  if (role === 'ai') {
    div.innerHTML = `
      <div class="avatar ai-av">📖</div>
      <div class="msg-inner">
        <div class="sender-name">LitMind</div>
        <div class="bubble">${renderMarkdown(content)}</div>
      </div>`;
  } else {
    div.innerHTML = `
      <div class="avatar user-av">👤</div>
      <div class="msg-inner">
        <div class="sender-name">You</div>
        <div class="bubble">${escHtml(content)}</div>
      </div>`;
  }
  messages.appendChild(div);
  scrollToBottom();
}

function showTyping() {
  removeTyping();
  const messages = $('messages');
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typing';
  div.innerHTML = `
    <div class="avatar ai-av">📖</div>
    <div class="msg-inner">
      <div class="sender-name">LitMind</div>
      <div class="bubble typing-bubble">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>`;
  messages.appendChild(div);
  scrollToBottom();
}

function removeTyping() {
  const t = $('typing');
  if (t) t.remove();
}

function setLoading(state) {
  isLoading = state;
  const btn = $('send-btn');
  if (btn) btn.disabled = state;
  setStatus(state ? 'Thinking...' : 'Ready');
}

// ── Quick Prompts ─────────────────────────────────────────
function quickPrompt(text) {
  const inp = $('inp');
  inp.value = text;
  autoResize(inp);
  sendMsg();
}

// ── Voice Input ──────────────────────────────────────────
let recognition = null;
let isRecording = false;

function toggleVoiceRecording() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Your browser does not support speech recognition. Please use Chrome or Edge.');
    return;
  }
  if (isRecording) {
    recognition.stop();
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onstart = () => {
    isRecording = true;
    $('voice-btn').classList.add('active');
    $('voice-status').textContent = '🔴 Recording...';
  };
  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    $('inp').value = transcript;
    autoResize($('inp'));
  };
  recognition.onend = () => {
    isRecording = false;
    $('voice-btn').classList.remove('active');
    $('voice-status').textContent = '';
  };
  recognition.onerror = () => {
    isRecording = false;
    $('voice-btn').classList.remove('active');
    $('voice-status').textContent = '';
  };
  recognition.start();
}

// ── Image Upload ─────────────────────────────────────────
let uploadedImage = null;

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
  if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImage = { data: e.target.result, name: file.name, type: file.type };
    const preview = $('image-preview');
    preview.innerHTML = `
      <div style="position:relative;display:inline-block;padding:8px;">
        <img src="${e.target.result}" alt="Preview" style="max-height:160px;border-radius:8px;">
        <button class="remove-image" onclick="removeImage()" style="opacity:1;">✕</button>
      </div>`;
    preview.classList.add('show');
  };
  reader.readAsDataURL(file);
  event.target.value = '';

  if (!$('inp').value.trim()) {
    $('inp').value = 'Describe what you see in this image and ask me to analyze it from a literary perspective.';
    autoResize($('inp'));
  }
}

function removeImage() {
  uploadedImage = null;
  const preview = $('image-preview');
  preview.classList.remove('show');
  preview.innerHTML = '';
}

// ── Textarea Auto-resize ─────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

// ── Key Handler ──────────────────────────────────────────
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
}

// ── Clear / New Session ───────────────────────────────────
function clearChat() {
  // If the current session already has no messages, just re-show the welcome
  // screen without creating a redundant empty session.
  if (conversationHistory.length === 0) {
    showWelcomeScreen();
    return;
  }

  // The current session already has its messages safely stored in the DB.
  // De-activate the current item in the sidebar so it looks "stored".
  if (currentSessionId) {
    const activeItem = document.querySelector(`.history-item[data-session-id="${currentSessionId}"]`);
    if (activeItem) activeItem.classList.remove('active');
  }

  // Reset in-memory state and show the clean welcome screen.
  conversationHistory = [];
  messageCount = 0;
  worksDiscussed.clear();
  currentSessionId = null;   // will be created lazily on first message
  updateStats();
  setStatus('Ready');
  showWelcomeScreen();
}

function showWelcomeScreen() {
  $('messages').innerHTML = `
    <div class="welcome" id="welcome">
      <span class="welcome-icon">📚</span>
      <h1 class="welcome-title">Your Personal <em>Literature Tutor</em></h1>
      <p class="welcome-sub">Ask me to analyze novels, decode poetry, explore themes, compare authors, or guide you through any work of literature — from Shakespeare to Toni Morrison.</p>
      <div class="quick-actions">
        <button class="qa-btn" onclick="quickPrompt('What are the major themes in To Kill a Mockingbird?')">
          <span class="qa-label">Theme Analysis</span>
          <span class="qa-text">Themes in To Kill a Mockingbird</span>
        </button>
        <button class="qa-btn" onclick="quickPrompt('Compare the writing styles of Hemingway and Fitzgerald')">
          <span class="qa-label">Author Comparison</span>
          <span class="qa-text">Hemingway vs. Fitzgerald styles</span>
        </button>
        <button class="qa-btn" onclick="quickPrompt('Explain the symbolism of the green light in The Great Gatsby')">
          <span class="qa-label">Symbolism</span>
          <span class="qa-text">The green light in Gatsby</span>
        </button>
        <button class="qa-btn" onclick="quickPrompt('Help me write an analysis essay about Macbeth\\'s ambition')">
          <span class="qa-label">Essay Help</span>
          <span class="qa-text">Analyzing Macbeth's ambition</span>
        </button>
        <button class="qa-btn" onclick="quickPrompt('Explain the concept of a tragic hero using Oedipus Rex')">
          <span class="qa-label">Literary Concepts</span>
          <span class="qa-text">Tragic hero in Oedipus Rex</span>
        </button>
        <button class="qa-btn" onclick="quickPrompt('What is the significance of the conch shell in Lord of the Flies?')">
          <span class="qa-label">Symbolism</span>
          <span class="qa-text">Conch shell in Lord of the Flies</span>
        </button>
      </div>
    </div>`;
}

// ── Send Message ─────────────────────────────────────────
async function sendMsg() {
  if (isLoading) return;
  const inp = $('inp');
  const text = inp.value.trim();
  if (!text && !uploadedImage) return;

  // If not logged in, show login
  if (!currentUser) { showLoginOverlay(null); return; }

  // Auto-create first session if needed
  if (!currentSessionId) {
    const newId = await startNewSession(text);
    if (!newId) return;
  }

  inp.value = '';
  inp.style.height = 'auto';

  if (uploadedImage) {
    appendMessageWithImage(uploadedImage.data, text);
  } else {
    appendMessage('user', text);
  }
  detectWorks(text);

  let messageContent = text;
  if (uploadedImage) {
    messageContent = `[Image attached: ${uploadedImage.name}]\n${text}`;
  }

  conversationHistory.push({
    role: 'user',
    content: messageContent,
    image: uploadedImage ? uploadedImage.data : null
  });

  // Update sidebar session title on first message
  const activeItem = document.querySelector(`.history-item[data-session-id="${currentSessionId}"] .session-title`);
  if (activeItem && activeItem.textContent === 'New Conversation') {
    const newTitle = text.substring(0, 35) + (text.length > 35 ? '...' : '');
    activeItem.textContent = newTitle;
    fetch(`/api/sessions/${currentSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
  }

  messageCount++;
  updateStats();
  removeImage();
  setLoading(true);
  showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory, sessionId: currentSessionId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    removeTyping();
    appendMessage('ai', data.reply);
    conversationHistory.push({ role: 'assistant', content: data.reply });
    detectWorks(data.reply);
    messageCount++;
    updateStats();
  } catch (err) {
    removeTyping();
    appendMessage('ai', `⚠️ ${err.message}`);
    const lastBubble = document.querySelector('.msg.ai:last-child .bubble');
    if (lastBubble) lastBubble.classList.add('error-bubble');
  } finally {
    setLoading(false);
    scrollToBottom();
  }
}

// ── Image Message Renderer ───────────────────────────────
function appendMessageWithImage(imageData, textContent = '') {
  removeWelcome();
  const messages = $('messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg user';

  const textHtml = textContent && textContent.trim() !== '[Image attached]'
    ? `<div style="margin-top: 8px;">${escHtml(textContent)}</div>`
    : '';

  msgDiv.innerHTML = `
    <div class="avatar user-av">👤</div>
    <div class="msg-inner">
      <div class="sender-name">You</div>
      <div class="bubble">
        <img src="${imageData}" alt="User image" style="max-width: 200px; max-height: 200px; border-radius: 8px; display: block;">
        ${textHtml}
      </div>
    </div>
  `;
  messages.appendChild(msgDiv);
  scrollToBottom();
}

// ── Auth & Session Management ─────────────────────────────
function showLoginOverlay(e) {
  if (e) e.preventDefault();
  $('login-overlay').style.display = 'flex';
}

function hideLoginOverlay() {
  $('login-overlay').style.display = 'none';
}

async function checkAuth() {
  try {
    const res = await fetch('/api/user');
    const data = await res.json();
    if (data.authenticated) {
      currentUser = data.user;
      hideLoginOverlay();
      $('guest-actions').style.display = 'none';
      $('user-profile').style.display = 'flex';
      $('user-name').textContent = currentUser.name;
      $('user-avatar').src = currentUser.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">\ud83d\udc64</text></svg>';
      await loadSessions();
    } else {
      hideLoginOverlay();
      $('guest-actions').style.display = 'flex';
      $('user-profile').style.display = 'none';
      $('inp').addEventListener('focus', showLoginOverlay);
    }
  } catch (err) {
    console.error('Auth check failed', err);
  }
}

// ── Sessions Sidebar ──────────────────────────────────────
async function loadSessions() {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) return;
    const sessions = await res.json();

    const historyList = $('history-list');
    if (!historyList) return;
    historyList.innerHTML = '';
    $('history-section').style.display = 'block';

    if (sessions.length === 0) {
      await startNewSession();
      return;
    }

    sessions.forEach((session, idx) => {
      historyList.appendChild(buildSessionItem(session, idx === 0));
    });

    // Auto-load the most recent session
    currentSessionId = sessions[0].id;
    setActiveSessionItem(sessions[0].id);
    await loadSessionMessages(sessions[0].id);
  } catch (err) {
    console.error('Failed to load sessions', err);
  }
}

function buildSessionItem(session, isActive = false) {
  const item = document.createElement('div');
  item.className = 'history-item' + (isActive ? ' active' : '');
  item.dataset.sessionId = session.id;

  const date = new Date(session.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  item.innerHTML = `
    <div class="session-item-inner">
      <span class="session-icon">💬</span>
      <div class="session-info">
        <div class="session-title">${escHtml(session.title)}</div>
        <div class="session-date">${dateStr}</div>
      </div>
      <button class="session-delete" data-id="${session.id}" title="Delete">✕</button>
    </div>
  `;

  item.querySelector('.session-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteSession(session.id);
  });

  item.addEventListener('click', () => switchToSession(session.id));
  return item;
}

function setActiveSessionItem(sessionId) {
  document.querySelectorAll('.history-item').forEach(el => {
    el.classList.toggle('active', el.dataset.sessionId === sessionId);
  });
}

async function loadSessionMessages(sessionId) {
  try {
    const res = await fetch(`/api/sessions/${sessionId}/messages`);
    if (!res.ok) return;
    const msgs = await res.json();

    conversationHistory = [];
    messageCount = 0;
    worksDiscussed.clear();

    const container = $('messages');
    container.innerHTML = '';

    if (msgs.length === 0) {
      container.innerHTML = `<div class="welcome" id="welcome">
        <span class="welcome-icon">📚</span>
        <h1 class="welcome-title">Your Personal <em>Literature Tutor</em></h1>
        <p class="welcome-sub">Ask me anything about literature — novels, poetry, essays, authors, and more.</p>
      </div>`;
      updateStats();
      return;
    }

    for (const msg of msgs) {
      conversationHistory.push({ role: msg.role, content: msg.content, image: msg.image });
      let displayContent = msg.content;
      if (msg.image && msg.role === 'user') {
        displayContent = msg.content.replace(/^\[Image attached: .*\]\n/i, '').replace(/^\[Image attached\]\n/i, '');
      }
      if (msg.image && msg.role === 'user') {
        appendMessageWithImage(msg.image, displayContent);
      } else {
        appendMessage(msg.role === 'assistant' ? 'ai' : 'user', displayContent);
      }
      detectWorks(msg.content);
      messageCount++;
    }
    updateStats();
    scrollToBottom();
  } catch (err) {
    console.error('Failed to load session messages', err);
  }
}

async function switchToSession(sessionId) {
  currentSessionId = sessionId;
  setActiveSessionItem(sessionId);
  await loadSessionMessages(sessionId);
}

async function startNewSession(firstMessage = null) {
  try {
    const title = firstMessage
      ? firstMessage.substring(0, 35) + (firstMessage.length > 35 ? '...' : '')
      : 'New Conversation';
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    const session = await res.json();
    currentSessionId = session.id;

    const historyList = $('history-list');
    if (historyList) {
      $('history-section').style.display = 'block';
      const item = buildSessionItem(session, true);
      historyList.prepend(item);
      setActiveSessionItem(session.id);
    }
    return session.id;
  } catch (err) {
    console.error('Failed to create session', err);
    return null;
  }
}

async function deleteSession(sessionId) {
  if (!confirm('Delete this conversation?')) return;
  try {
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    const item = document.querySelector(`[data-session-id="${sessionId}"]`);
    if (item) item.remove();

    if (currentSessionId === sessionId) {
      const remaining = document.querySelector('.history-item');
      if (remaining) {
        switchToSession(remaining.dataset.sessionId);
      } else {
        currentSessionId = null;
        conversationHistory = [];
        messageCount = 0;
        $('messages').innerHTML = `<div class="welcome" id="welcome">
          <span class="welcome-icon">📚</span>
          <h1 class="welcome-title">Your Personal <em>Literature Tutor</em></h1>
          <p class="welcome-sub">Start a new session to begin!</p>
        </div>`;
        updateStats();
      }
    }
  } catch (err) {
    console.error('Failed to delete session', err);
  }
}

async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
  } catch (err) {
    console.error('Logout failed', err);
  }
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const inp = $('inp');
  if (inp) inp.focus();
  updateStats();
  checkAuth();
});
