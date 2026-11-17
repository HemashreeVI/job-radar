import { getJobs, setJobs, getProjects, matchProjects, followUpDue, STATUSES, FOLLOW_UP_DAYS, DAY } from './store.js';
import { extractJob } from './extract.js';

const $ = id => document.getElementById(id);
let current = null;

const ago = t => { const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function capture() {
  // ?tab=<id> lets tests point the popup at a specific tab
  const forced = Number(new URLSearchParams(location.search).get('tab'));
  const [tab] = forced ? [{ id: forced }] : await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJob });
    current = result;
  } catch {
    $('status').textContent = "Can't read this page (Chrome blocks extensions on some pages). Open a job posting and try again.";
    return;
  }
  const jobs = await getJobs();
  const already = jobs.find(j => j.url === current.url);
  $('role').value = current.role; $('company').value = current.company; $('location').value = current.location;
  const matches = matchProjects(`${current.role} ${current.description}`, await getProjects());
  current.matches = matches.slice(0, 3);
  $('matches').innerHTML = matches.length
    ? `<div class="mt">Your projects that fit this job:</div>` + matches.slice(0, 3).map(m =>
        `<span class="chip" title="${esc(m.hits.join(', '))}">${esc(m.name)} · <b>${esc(m.hits.slice(0, 3).join(', '))}</b></span>`).join('')
    : `<div class="mt">No keyword matches with your projects. Edit them in ⚙ settings.</div>`;
  $('status').textContent = already ? `Already in your tracker (saved ${ago(already.savedAt)}). Saving again updates it.` : 'Check the details, then save:';
  $('form').hidden = false;
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const jobs = await getJobs();
  const old = jobs.find(j => j.url === current.url);
  const job = { ...(old || { id: crypto.randomUUID(), savedAt: Date.now(), status: 'saved' }),
    role: $('role').value.trim(), company: $('company').value.trim(), location: $('location').value.trim(),
    url: current.url, source: current.source, matches: current.matches };
  const next = old ? jobs.map(j => (j.id === job.id ? job : j)) : [job, ...jobs];
  await setJobs(next);
  if (!old) await chrome.runtime.sendMessage({ type: 'scheduled', id: job.id, when: job.savedAt + FOLLOW_UP_DAYS * DAY });
  $('status').textContent = `Saved ✓  I'll remind you to follow up in ${FOLLOW_UP_DAYS} days.`;
  $('save').textContent = 'Saved ✓';
  render();
});

async function render() {
  const jobs = await getJobs(), f = $('filter').value;
  const shown = f === 'due' ? jobs.filter(j => followUpDue(j)) : jobs;
  $('count').textContent = jobs.length ? `(${jobs.length})` : '';
  $('empty').hidden = jobs.length > 0;
  $('list').innerHTML = shown.map(j => {
    const due = followUpDue(j);
    return `<li class="${due ? 'due' : ''}" data-id="${j.id}">
      <div class="top"><a href="${esc(j.url)}" target="_blank">${esc(j.role)}</a><button class="x" data-del title="Remove">×</button></div>
      <div class="sub">${esc(j.company)}${j.location ? ' · ' + esc(j.location) : ''} · saved ${ago(j.savedAt)}</div>
      <div class="row"><select data-status class="st-${j.status}">${STATUSES.map(s => `<option ${s === j.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      ${due ? `<span class="tag">follow-up due</span><button class="ghost done" data-done>Followed up</button>` : (j.matches?.[0] ? `<span class="sub" style="margin:0">↔ ${esc(j.matches.map(m => m.name).join(', '))}</span>` : '')}</div>
    </li>`;
  }).join('');
}

$('list').addEventListener('change', async e => {
  if (!e.target.matches('[data-status]')) return;
  const id = e.target.closest('li').dataset.id, jobs = await getJobs();
  const j = jobs.find(x => x.id === id); j.status = e.target.value;
  if (j.status === 'applied' && !j.appliedAt) j.appliedAt = Date.now();
  await setJobs(jobs); render();
});
$('list').addEventListener('click', async e => {
  const li = e.target.closest('li'); if (!li) return;
  let jobs = await getJobs();
  if (e.target.matches('[data-del]')) jobs = jobs.filter(j => j.id !== li.dataset.id);
  else if (e.target.matches('[data-done]')) jobs.find(j => j.id === li.dataset.id).followedUp = Date.now();
  else return;
  await setJobs(jobs); render();
});
$('filter').addEventListener('change', render);
$('export').addEventListener('click', async () => {
  const jobs = await getJobs(), cols = ['role', 'company', 'location', 'status', 'saved', 'url', 'matching projects'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...jobs.map(j => [j.role, j.company, j.location, j.status, new Date(j.savedAt).toISOString().slice(0, 10), j.url,
    (j.matches || []).map(m => m.name).join('; ')].map(cell).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'job-radar.csv' });
  a.click();
});

capture(); render();
