const byId = (id) => document.getElementById(id);

const fileEl = byId('file');
const transcriptEl = byId('transcript');
const instructionEl = byId('instruction');
const genBtn = byId('genBtn');
const clearBtn = byId('clearBtn');
const summaryEl = byId('summary');
const emailsEl = byId('emails');
const subjectEl = byId('subject');
const sendBtn = byId('sendBtn');
const statusEl = byId('status');

clearBtn.onclick = () => {
  fileEl.value = '';
  transcriptEl.value = '';
  instructionEl.value = '';
  summaryEl.value = '';
  emailsEl.value = '';
  subjectEl.value = '';
  statusEl.textContent = '';
};


genBtn.onclick = async () => {
  try {
    const form = new FormData();
    if (fileEl.files[0]) form.append('file', fileEl.files[0]);
    form.append('transcript', transcriptEl.value || '');
    form.append('instruction', instructionEl.value || '');

    genBtn.disabled = true;
    genBtn.textContent = 'Generating...';

    const resp = await fetch('/api/summarize', { method: 'POST', body: form });
    const data = await resp.json();

    if (!resp.ok) throw new Error(data.error || 'Failed');
    summaryEl.value = data.summary || '';
  } catch (e) {
    alert(e.message || 'Failed to generate summary');
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = 'Generate Summary';
  }
};

sendBtn.onclick = async () => {
  try {
    const to = emailsEl.value.trim();
    if (!to) return alert('Enter recipient email(s)');

    const body = summaryEl.value.trim();
    if (!body) return alert('No summary to send');

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    const resp = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject: subjectEl.value, body })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed');

    statusEl.textContent = 'Email sent ✔ (' + (data.messageId || 'ok') + ')';
  } catch (e) {
    statusEl.textContent = 'Email failed: ' + (e.message || 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Email';
  }
};
