// Mock job pages, shaped like the real sites, served at their real URLs inside the test browser.
exports.linkedin = `<!doctype html><html><head><title>Backend Engineer | Razorpay | LinkedIn</title></head><body>
<div class="job-details-jobs-unified-top-card__job-title"><h1>Backend Engineer</h1></div>
<div class="job-details-jobs-unified-top-card__company-name"><a href="/company/razorpay">Razorpay</a></div>
<div class="job-details-jobs-unified-top-card__primary-description-container"><span class="tvm__text">Bengaluru, Karnataka, India</span></div>
<div id="job-details"><h2>About the job</h2><p>We're looking for a backend engineer to build payment systems in Java and Spring Boot.
You'll work with Kafka, Redis and PostgreSQL, design for concurrency, and own services in production with Docker and Kubernetes.
Bonus: experience with observability (Prometheus, Grafana) and incident response.</p></div></body></html>`;

exports.careers = `<!doctype html><html><head><title>ML Engineer, GenAI - Acme AI</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"ML Engineer, GenAI",
"hiringOrganization":{"@type":"Organization","name":"Acme AI"},
"jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Chennai","addressRegion":"TN","addressCountry":"IN"}},
"description":"<p>Build <b>LLM</b> features with RAG, vector databases (Qdrant) and prompt evaluation. Python, PyTorch, computer vision a plus.</p>"}</script>
</head><body><h1>ML Engineer, GenAI</h1><p>Apply now.</p></body></html>`;

exports.naukri = `<!doctype html><html><head><title>IoT Firmware Engineer - Bosch - 0 to 2 years - Coimbatore | Naukri.com</title></head><body>
<h1 class="styles_jd-header-title__rZwM1">IoT Firmware Engineer</h1>
<div class="styles_jd-header-comp-name__MvqAI"><a href="#">Bosch</a></div>
<div class="styles_jhc__location__W_pVs"><a>Coimbatore</a></div>
<section class="styles_job-desc-container__txpYf">Embedded C++ on ESP32 and Arduino, sensor fusion, firmware for IoT devices.</section></body></html>`;
