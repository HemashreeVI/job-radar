const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const F = require('./fixtures');
const SHOTS = process.argv[2];

(async () => {
  // test copy: same code, plus host access so the popup can read a tab without a real click (activeTab)
  const src = path.resolve(__dirname, '..'), ext = fs.mkdtempSync(path.join(os.tmpdir(), 'jr-'));
  fs.cpSync(src, ext, { recursive: true });
  const m = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'))); m.host_permissions = ['<all_urls>'];
  fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(m));

  const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: { width: 380, height: 640 },
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
  await ctx.route('https://www.linkedin.com/**', r => r.fulfill({ contentType: 'text/html', body: F.linkedin }));
  await ctx.route('https://careers.acme.ai/**', r => r.fulfill({ contentType: 'text/html', body: F.careers }));
  await ctx.route('https://www.naukri.com/**', r => r.fulfill({ contentType: 'text/html', body: F.naukri }));
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
  const id = sw.url().split('/')[2];
  const errors = [];

  async function saveFrom(url, shot) {
    const page = await ctx.newPage(); await page.goto(url);
    const tabId = await sw.evaluate(async u => (await chrome.tabs.query({ url: u + '*' }))[0].id, url);
    const pop = await ctx.newPage(); pop.on('pageerror', e => errors.push(e.message)); pop.on('console', c => c.type() === 'error' && errors.push(c.text()));
    await pop.goto(`chrome-extension://${id}/popup.html?tab=${tabId}`);
    await pop.waitForSelector('#form:not([hidden])');
    const got = await pop.evaluate(() => ({ role: role.value, company: company.value, location: location.value, matches: matches.innerText.replace(/\s+/g, ' ') }));
    if (shot) await pop.screenshot({ path: `${SHOTS}/${shot}`, fullPage: true });
    await pop.click('#save'); await pop.waitForFunction(() => save.textContent.includes('Saved'));
    await pop.close(); await page.close();
    return got;
  }

  const li = await saveFrom('https://www.linkedin.com/jobs/view/4012345678/', 'jr-capture.png');
  const ca = await saveFrom('https://careers.acme.ai/jobs/ml-engineer-genai');
  const na = await saveFrom('https://www.naukri.com/job-listings-iot-firmware-engineer-bosch-coimbatore-0-to-2-years-123');
  console.log('LinkedIn:', JSON.stringify(li));
  console.log('Careers :', JSON.stringify(ca));
  console.log('Naukri  :', JSON.stringify(na));

  // follow-ups: pretend the LinkedIn job was saved 6 days ago, then run the sweep alarm
  const alarms = await sw.evaluate(async () => (await chrome.alarms.getAll()).map(a => a.name));
  console.log('alarms  :', alarms.length, 'scheduled (', alarms.filter(a => a.startsWith('follow-')).length, 'follow-ups )');
  await sw.evaluate(async () => {
    const { jobs } = await chrome.storage.local.get('jobs');
    jobs.find(j => j.company === 'Razorpay').savedAt -= 6 * 864e5;
    jobs.find(j => j.company === 'Bosch').status = 'interview';
    await chrome.storage.local.set({ jobs });
    chrome.alarms.create('sweep', { when: Date.now() + 50 });
  });
  await new Promise(r => setTimeout(r, 1500));
  const after = await sw.evaluate(async () => ({ jobs: (await chrome.storage.local.get('jobs')).jobs.map(j => [j.company, j.status, !!j.notified]),
    badge: await chrome.action.getBadgeText({}) }));
  console.log('after sweep:', JSON.stringify(after));

  const pop = await ctx.newPage(); pop.on('pageerror', e => errors.push(e.message));
  await pop.goto(`chrome-extension://${id}/popup.html?tab=999999`);
  await pop.waitForTimeout(500);
  await pop.screenshot({ path: `${SHOTS}/jr-tracker.png`, fullPage: true });
  const csv = await pop.evaluate(() => [...document.querySelectorAll('#list li')].length);
  console.log('tracker rows:', csv, '| popup errors:', errors.length ? errors : 'none');
  await ctx.close();
})();
