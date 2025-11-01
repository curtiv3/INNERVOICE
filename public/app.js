const form = document.getElementById('message-form');
const feedback = document.getElementById('feedback');
const responseEl = document.getElementById('persona-response');
const personaNameEl = document.getElementById('persona-name');
const toneEl = document.getElementById('persona-tone');
const moodEl = document.getElementById('persona-mood');
const keywordsEl = document.getElementById('persona-keywords');
const confidenceEl = document.getElementById('persona-confidence');
const logList = document.getElementById('log-list');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const message = data.get('message');
  if (!message) {
    return;
  }

  try {
    const response = await fetch('/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Es ist ein Fehler aufgetreten.');
      return;
    }

    const payload = await response.json();
    updateFeedback(payload);
    await loadLogs();
    form.reset();
    document.getElementById('message').focus();
  } catch (error) {
    console.error(error);
    alert('Die Verbindung zum Server ist fehlgeschlagen.');
  }
});

async function loadLogs() {
  try {
    const response = await fetch('/api/logs');
    if (!response.ok) {
      throw new Error('Fehler beim Laden der Logs');
    }
    const logs = await response.json();
    renderLogs(logs);
  } catch (error) {
    console.error(error);
  }
}

function updateFeedback(payload) {
  feedback.hidden = false;
  personaNameEl.textContent = `${payload.persona} (${payload.personaSlug})`;
  toneEl.textContent = payload.tone || 'neutral';
  moodEl.textContent = payload.mood || 'ausgeglichen';
  keywordsEl.textContent = (payload.keywords && payload.keywords.join(', ')) || '—';
  confidenceEl.textContent = payload.confidence != null ? `${Math.round(payload.confidence * 100)}%` : '—';
  responseEl.textContent = payload.response;
}

function renderLogs(logs) {
  if (!Array.isArray(logs) || logs.length === 0) {
    logList.innerHTML = '<li>Keine Einträge vorhanden.</li>';
    return;
  }

  logList.innerHTML = '';
  logs.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'log-entry';
    item.innerHTML = `
      <h3>#${entry.id} · ${entry.persona}</h3>
      <p><strong>Frage:</strong> ${entry.message}</p>
      <p><strong>Antwort:</strong> ${entry.response}</p>
      <p><strong>Ton/Stimmung:</strong> ${entry.tone || '—'} / ${entry.mood || '—'}</p>
      <p><strong>Keywords:</strong> ${entry.keywords || '—'} · <strong>Konfidenz:</strong> ${entry.confidence != null ? Math.round(entry.confidence * 100) + '%' : '—'}</p>
      <p class="timestamp">${entry.createdAt}</p>
    `;
    logList.appendChild(item);
  });
}

loadLogs();
