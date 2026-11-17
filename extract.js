// Runs inside the job page (injected only when you click the button).
// Tries, in order: schema.org JobPosting data, LinkedIn, Naukri, then generic page metadata.
// Must stay self-contained: chrome.scripting serialises this function on its own.
export function extractJob() {
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const q = (...sels) => { for (const s of sels) { const e = document.querySelector(s); if (e && clean(e.innerText || e.textContent)) return clean(e.innerText || e.textContent); } return ''; };
  const meta = n => clean(document.querySelector(`meta[property="${n}"],meta[name="${n}"]`)?.content);
  const host = location.hostname.replace(/^www\./, '');
  let job = { role: '', company: '', location: '', description: '', source: host };

  // 1. JSON-LD JobPosting (most careers pages: Greenhouse, Lever, Workday, Naukri...)
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.textContent);
      const items = [].concat(data, data['@graph'] || []);
      const jp = items.find(x => x && [].concat(x['@type']).includes('JobPosting'));
      if (jp) {
        const loc = [].concat(jp.jobLocation || [])[0]?.address;
        job = { ...job, role: clean(jp.title), company: clean(jp.hiringOrganization?.name),
          location: clean([loc?.addressLocality, loc?.addressRegion, loc?.addressCountry?.name || loc?.addressCountry].filter(Boolean).join(', ')),
          description: clean(new DOMParser().parseFromString(jp.description || '', 'text/html').body.textContent) };
        break;
      }
    } catch { /* not JSON we understand */ }
  }

  // 2. Site-specific layouts
  if (host.endsWith('linkedin.com')) {
    job.role ||= q('.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', '.top-card-layout__title', 'h1');
    job.company ||= q('.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name', '.topcard__org-name-link', '.top-card-layout__card a[href*="/company/"]');
    job.location ||= q('.job-details-jobs-unified-top-card__primary-description-container .tvm__text', '.topcard__flavor--bullet');
    job.description ||= q('#job-details', '.jobs-description__content', '.description__text');
  } else if (host.endsWith('naukri.com')) {
    job.role ||= q('[class*="jd-header-title"]', 'h1');
    job.company ||= q('[class*="jd-header-comp-name"] a', '[class*="jd-header-comp-name"]');
    job.location ||= q('[class*="location"] a', '[class*="loc"]');
    job.description ||= q('[class*="job-desc"]', '[class*="dang-inner-html"]');
  }

  // 3. Generic fallback: page title "Role - Company | Site", Open Graph, first heading
  const title = clean(meta('og:title') || document.title);
  const parts = title.split(/\s+[|\-–—@]\s+|\s+at\s+/i).map(clean).filter(Boolean);
  job.role ||= clean(document.querySelector('h1')?.innerText) || parts[0] || title;
  job.company ||= meta('og:site_name') && !/linkedin|naukri|indeed|glassdoor/i.test(meta('og:site_name')) ? meta('og:site_name') : (parts[1] || host.split('.').slice(-2, -1)[0]);
  job.description ||= clean((document.querySelector('main, article, [role="main"]') || document.body).innerText).slice(0, 20000);
  job.role = job.role.slice(0, 140); job.company = job.company.slice(0, 100);
  return { ...job, url: location.href.split('#')[0] };
}
