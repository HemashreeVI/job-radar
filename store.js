// Shared storage helpers. Everything lives in chrome.storage.local on your machine.
export const FOLLOW_UP_DAYS = 5;
export const DAY = 24 * 60 * 60 * 1000;
export const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'];

export const DEFAULT_PROJECTS = [
  { name: 'SeatLock', url: 'https://github.com/HemashreeVI/SeatLock',
    keywords: ['java', 'spring', 'spring boot', 'kafka', 'redis', 'postgresql', 'postgres', 'concurrency', 'distributed', 'microservices', 'backend', 'transactions', 'k6'] },
  { name: 'RootLens', url: 'https://github.com/HemashreeVI/rootlens',
    keywords: ['sre', 'devops', 'observability', 'prometheus', 'grafana', 'incident', 'reliability', 'fastapi', 'docker', 'kubernetes', 'monitoring', 'opentelemetry', 'ci/cd', 'python'] },
  { name: 'TriageIQ', url: 'https://github.com/HemashreeVI/TriageIQ',
    keywords: ['llm', 'rag', 'genai', 'generative ai', 'nlp', 'ollama', 'vector', 'qdrant', 'langchain', 'prompt', 'ai', 'kafka'] },
  { name: 'Dental AI', url: 'https://github.com/HemashreeVI/AI_Malocclusion_Detection',
    keywords: ['computer vision', 'yolo', 'pytorch', 'opencv', 'deep learning', 'cnn', 'machine learning', 'image', 'healthcare'] },
  { name: 'Smart Walker', url: 'https://github.com/HemashreeVI/smart_walker',
    keywords: ['iot', 'embedded', 'arduino', 'sensor', 'esp32', 'c++', 'firmware', 'hardware', 'robotics'] },
  { name: 'GitLoom', url: 'https://github.com/HemashreeVI/GitLoom',
    keywords: ['javascript', 'frontend', 'html', 'css', 'react', 'web', 'ui', 'rest api'] },
];

export async function getJobs() {
  return (await chrome.storage.local.get('jobs')).jobs || [];
}
export async function setJobs(jobs) {
  await chrome.storage.local.set({ jobs });
  await updateBadge(jobs);
}
export async function getProjects() {
  return (await chrome.storage.local.get('projects')).projects || DEFAULT_PROJECTS;
}

export function followUpDue(job, now = Date.now()) {
  return ['saved', 'applied'].includes(job.status) && !job.followedUp && now - job.savedAt >= FOLLOW_UP_DAYS * DAY;
}

export async function updateBadge(jobs) {
  const due = (jobs || await getJobs()).filter(j => followUpDue(j)).length;
  await chrome.action.setBadgeText({ text: due ? String(due) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#E8590C' });
}

// Which of your projects fit this job, and why
export function matchProjects(text, projects) {
  const t = text.toLowerCase();
  const esc = k => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return projects.map(p => {
    // whole-word match, so "java" doesn't fire on "javascript" and "ai" doesn't fire on "maintain"
    const hits = p.keywords.map(k => k.toLowerCase().trim()).filter(k => k &&
      new RegExp(`(^|[^a-z0-9])${esc(k)}(?![a-z0-9])`).test(t));
    return { name: p.name, url: p.url, hits: [...new Set(hits)] };
  }).filter(m => m.hits.length).sort((a, b) => b.hits.length - a.hits.length);
}
