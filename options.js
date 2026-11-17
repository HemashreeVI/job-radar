import { getProjects, DEFAULT_PROJECTS } from './store.js';
const ta = document.getElementById('ta'), msg = document.getElementById('msg');
const toText = ps => ps.map(p => `${p.name}\n${p.url}\n${p.keywords.join(', ')}`).join('\n\n');
const fromText = t => t.trim().split(/\n\s*\n/).map(b => b.split('\n').map(s => s.trim())).filter(l => l[0])
  .map(([name, url = '', kw = '']) => ({ name, url, keywords: kw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) }));
getProjects().then(ps => { ta.value = toText(ps); });
document.getElementById('save').onclick = async () => { await chrome.storage.local.set({ projects: fromText(ta.value) }); msg.textContent = 'Saved ✓'; };
document.getElementById('reset').onclick = async () => { await chrome.storage.local.remove('projects'); ta.value = toText(DEFAULT_PROJECTS); msg.textContent = 'Reset ✓'; };
