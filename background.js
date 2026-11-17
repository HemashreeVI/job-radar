import { getJobs, setJobs, followUpDue, updateBadge, FOLLOW_UP_DAYS } from './store.js';

// One alarm per saved job, FOLLOW_UP_DAYS after saving. A daily sweep catches anything missed.
chrome.runtime.onInstalled.addListener(() => chrome.alarms.create('sweep', { periodInMinutes: 60 * 6 }));
chrome.runtime.onStartup.addListener(() => updateBadge());

chrome.alarms.onAlarm.addListener(async alarm => {
  const jobs = await getJobs();
  const due = alarm.name === 'sweep' ? jobs.filter(j => followUpDue(j) && !j.notified)
    : jobs.filter(j => alarm.name === 'follow-' + j.id && followUpDue(j));
  for (const j of due) {
    chrome.notifications.create('job-' + j.id, {
      type: 'basic', iconUrl: 'icons/128.png', priority: 2,
      title: `Follow up: ${j.company}`,
      message: `It's been ${FOLLOW_UP_DAYS}+ days since you saved "${j.role}". Send a quick follow-up?`,
      buttons: [{ title: 'Open the job' }, { title: 'Mark as followed up' }],
    });
    j.notified = true;
  }
  await setJobs(jobs);
});

async function handle(id, action) {
  const jobs = await getJobs();
  const j = jobs.find(x => 'job-' + x.id === id);
  if (!j) return;
  if (action === 'open') chrome.tabs.create({ url: j.url });
  if (action === 'done') { j.followedUp = Date.now(); await setJobs(jobs); }
  chrome.notifications.clear(id);
}
chrome.notifications.onClicked.addListener(id => handle(id, 'open'));
chrome.notifications.onButtonClicked.addListener((id, b) => handle(id, b === 0 ? 'open' : 'done'));

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg.type === 'scheduled') {
    chrome.alarms.create('follow-' + msg.id, { when: msg.when });
    reply(true);
  }
});
