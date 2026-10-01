import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";
import { rankActivities, rankServices } from "./intent-search.js";

const root = resolve(process.env.HB_SITE_ROOT || ".");
const output = resolve(process.env.HB_OUTPUT_DIR || "artifacts/final-platform-acceptance");
const require = createRequire(resolve(process.env.HB_NODE_MODULES || ".", "_platform-acceptance-runtime.js"));
const { chromium } = require("playwright");
const browserPath = process.env.HB_BROWSER_PATH || undefined;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

const registry = JSON.parse(await readFile(resolve(root, "src/registry/published-services.json"), "utf8"));
const summary = JSON.parse(await readFile(resolve(root, "platform-summary.json"), "utf8"));
const activitySource = await readFile(resolve(root, "dubai-activities-data.js"), "utf8");
const activities = JSON.parse(activitySource.slice(activitySource.indexOf("=") + 1).replace(/;\s*$/, ""));
const services = registry.services.map((service) => ({
  s: service.slug, u: service.internalRoute, a: service.name.ar, e: service.name.en,
  m: service.emirate, i: service.authority.id, r: service.authority.ar, n: service.authority.en,
  c: service.classification.main, b: service.classification.sub, k: service.keywords,
  d: service.description, v: service.verificationStatus
}));

const baseJourneys = [
  ["أريد فتح شركة تنظيف في دبي", /issue-trade-license-dubai/, "companies", "دبي"],
  ["أريد إصدار رخصة تجارية في دبي", /issue-trade-license-dubai/, "licensing", "دبي"],
  ["أريد أجدد الرخصة في دبي", /renew-business-license-dubai/, "licensing", "دبي"],
  ["أريد تعديل الرخصة في دبي", /amend-business-license-dubai/, "licensing", "دبي"],
  ["أريد أضيف نشاط على رخصة دبي", /add-business-activity-dubai/, "activities", "دبي"],
  ["أريد أضيف شريك في شركة بدبي", /add-remove-partner-dubai/, "companies", "دبي"],
  ["أريد ألغي شركتي في دبي", /cancel-business-license-dubai/, "companies", "دبي"],
  ["أريد أحجز اسم تجاري في دبي", /reserve-trade-name-dubai/, "licensing", "دبي"],
  ["أريد إصدار رخصة اقتصادية في أبوظبي", /abu-dhabi-economic-license-issuance/, "licensing", "أبوظبي"],
  ["أريد أجدد رخصة اقتصادية في أبوظبي", /abu-dhabi-economic-license-renewal/, "licensing", "أبوظبي"],
  ["أريد أحجز اسم تجاري في أبوظبي", /abu-dhabi-trade-name-reservation/, "licensing", "أبوظبي"],
  ["أريد إصدار رخصة في الشارقة", /sharjah-economic-license-issuance/, "licensing", "الشارقة"],
  ["أريد أجدد رخصة في الشارقة", /sharjah-economic-license-renewal|renew-business-license-sharjah/, "licensing", "الشارقة"],
  ["أريد أحجز اسم تجاري في الشارقة", /sharjah-issue-trade-name|sharjah-trade-name/, "licensing", "الشارقة"],
  ["أريد إصدار رخصة تجارية في عجمان", /ajman-commercial-license-issuance/, "licensing", "عجمان"],
  ["أريد أجدد رخصة في عجمان", /ajman-commercial-license-renewal|renew-business-license-ajman/, "licensing", "عجمان"],
  ["أريد إصدار رخصة في رأس الخيمة", /ras-al-khaimah-license-issuance/, "licensing", "رأس الخيمة"],
  ["أريد أضيف نشاط في رخصة رأس الخيمة", /ras-al-khaimah-change-license-activities/, "activities", "رأس الخيمة"],
  ["أريد تأسيس شركة في أم القيوين", /umm-al-quwain-mainland-licensing-official-path/, "companies", "أم القيوين"],
  ["أريد حجز اسم تجاري في أم القيوين", /umm-al-quwain-trade-name-official-path/, "licensing", "أم القيوين"],
  ["أريد إصدار رخصة اقتصادية في الفجيرة", /fujairah-economic-license-issuance/, "licensing", "الفجيرة"],
  ["أريد تأسيس شركة في المنطقة الحرة بالفجيرة", /تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة|fujairah-free-zone-company-registration/, "companies", "الفجيرة"],
  ["أريد تصريح عمل جديد لموظف خارج الإمارات", /new-work-permit-overseas-uae/, "employment", "اتحادي"],
  ["أريد أنقل موظف من شركة لشركة", /transfer-work-permit-uae/, "employment", "اتحادي"],
  ["أريد ألغي موظف", /cancel-work-permit-uae/, "employment", "اتحادي"],
  ["أريد تصريح عمل جزئي", /part-time-work-permit-uae/, "employment", "اتحادي"],
  ["أريد تصريح عمل مؤقت", /temporary-work-permit-uae/, "employment", "اتحادي"],
  ["أريد تصريح عمل لشخص على كفالة أهله", /family-sponsored-work-permit-uae/, "employment", "اتحادي"],
  ["أريد أشتكي لأن راتبي متأخر", /register-labour-complaints-private-sector-employees/, "employment", "اتحادي"],
  ["أريد أجدد إقامة زوجتي في دبي", /تجديد-إقامة-أفراد-الأسرة-في-دبي/, "family", "دبي"],
  ["أريد إصدار إقامة لزوجتي في دبي", /family-residency-uae/, "family", "دبي"],
  ["أريد إصدار إقامة لموظف في دبي", /إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي/, "residency", "دبي"],
  ["أريد أجدد إقامة موظف في دبي", /تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي/, "residency", "دبي"],
  ["أريد ألغي إقامة صادرة من دبي", /cancel-residency-permit-uae/, "residency", "دبي"],
  ["أريد إقامة مستثمر في دبي", /green-residence-partner-investor-dubai/, "residency", "دبي"],
  ["أريد الإقامة الذهبية في دبي", /golden-residency-uae/, "residency", "دبي"],
  ["أريد زيارة قريب في دبي", /تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي/, "visas", "دبي"],
  ["أريد تأشيرة سياحية خارج دبي", /تأشيرة-سياحية-عبر-icp-خارج-دبي/, "visas", "خارج دبي"],
  ["أريد أجدد الهوية الإماراتية", /renew-emirates-id-uae/, "identity", "اتحادي"],
  ["أريد إصدار الهوية لأول مرة", /issue-emirates-id-uae/, "identity", "اتحادي"],
  ["فقدت هويتي وأريد بدل فاقد", /بدل-فاقد-أو-تالف-للهوية/, "identity", "اتحادي"],
  ["أريد أجدد جواز السفر الإماراتي", /renew-uae-passport-icp/, "identity", "اتحادي"],
  ["أريد تسجيل أو تجديد إيجاري في دبي", /register-renew-ejari-contract-dubai/, "property", "دبي"],
  ["أريد نقل ملكية عقار في دبي", /title-transfer-dubai/, "property", "دبي"],
  ["أريد تقييم عقار في دبي", /property-valuation-dubai/, "property", "دبي"],
  ["أريد أجدد رخصة القيادة في دبي", /renew-driving-license-dubai/, "transport", "دبي"],
  ["أريد أجدد ملكية السيارة في دبي", /renew-vehicle-ownership-dubai/, "transport", "دبي"],
  ["أريد أسجل شركتي في جمارك دبي", /dubai-customs-business-registration/, "customs", "دبي"],
  ["أريد تصديق مستند شخصي داخل الإمارات", /تصديق-مستند-شخصي-داخل-الإمارات/, "federal", "اتحادي"],
  ["أريد التسجيل في ضريبة القيمة المضافة", /vat-registration-uae/, "federal", "اتحادي"]
];

const englishJourneyQueries = [
  "start a cleaning company in Dubai", "issue a trade license in Dubai", "renew my trade license in Dubai",
  "amend my trade license in Dubai", "add an activity to my Dubai license", "add a partner to my Dubai company",
  "cancel my company in Dubai", "reserve a trade name in Dubai", "issue an economic license in Abu Dhabi",
  "renew an economic license in Abu Dhabi", "reserve a trade name in Abu Dhabi", "issue an economic license in Sharjah",
  "renew my license in Sharjah", "reserve a trade name in Sharjah", "issue a commercial license in Ajman",
  "renew my commercial license in Ajman", "issue a license in Ras Al Khaimah", "add an activity to my RAK license",
  "start a company in Umm Al Quwain", "reserve a trade name in Umm Al Quwain", "issue an economic license in Fujairah",
  "start a free zone company in Fujairah", "new work permit for employee outside UAE", "transfer employee to another company",
  "cancel employee work permit", "part time work permit", "temporary work permit", "work permit for family sponsored resident",
  "complain about unpaid salary", "renew my wife's residence in Dubai", "issue family residence for my wife in Dubai",
  "issue employee residence in Dubai", "renew employee residence in Dubai", "cancel Dubai residence",
  "investor residence Dubai", "golden residence Dubai", "visit visa for relative in Dubai", "tourist visa outside Dubai",
  "renew Emirates ID", "issue Emirates ID first time", "replace lost Emirates ID", "renew UAE passport",
  "register or renew Ejari in Dubai", "transfer property title in Dubai", "property valuation in Dubai",
  "renew driving license in Dubai", "renew vehicle ownership in Dubai", "register my business with Dubai Customs",
  "attest a personal document in the UAE", "VAT registration UAE"
];
if (baseJourneys.length !== 50 || englishJourneyQueries.length !== 50) throw new Error("Phase 5 requires fifty bilingual journey pairs");
const journeys = baseJourneys.flatMap((journey, index) => [journey, [englishJourneyQueries[index], ...journey.slice(1)]]);
if (journeys.length !== 100) throw new Error(`Expected 100 journeys, received ${journeys.length}`);
const rankingResults = journeys.map(([query, expected, family, emirate]) => {
  const first = rankServices(query, services)[0];
  return { query, family, emirate, slug: first?.s || null, pass: Boolean(first && expected.test(first.s)) };
});

let server;
let baseUrl = process.env.HB_BASE_URL?.replace(/\/$/, "");
if (!baseUrl) server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname.replace(/^\/+/, "") || "index.html");
    const routed = requested.endsWith("/") ? `${requested}index.html` : requested;
    const file = resolve(root, routed);
    if (!file.startsWith(root)) return response.writeHead(403).end("Forbidden");
    const body = await readFile(file);
    response.writeHead(200, { "content-type": types[extname(file).toLowerCase()] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

await mkdir(output, { recursive: true });
if (server) {
  const localPort = Number(process.env.HB_LOCAL_PORT || 3000);
  await new Promise((done) => server.listen(localPort, "127.0.0.1", done));
  baseUrl = `http://127.0.0.1:${localPort}`;
}
const browser = await chromium.launch({ headless: true, executablePath: browserPath });

const conversationalScenarios = [
  ["أريد أجدد إقامة زوجتي في دبي", /gdrfa-family-residence-renew|تجديد-إقامة-أفراد-الأسرة-في-دبي/, "family", "دبي"],
  ["أريد أفتح شركة في دبي", /issue-trade-license-dubai/, "companies", "دبي"],
  ["عندي موظف وأريد أنقله إلى شركتي", /transfer-work-permit-uae|mohre-transfer-work-permit/, "employment", "اتحادي"],
  ["أريد إقامة لوالدتي", /family-residency-uae|family-residence|إقامة-أفراد-الأسرة/, "family", "دبي"],
  ["عندي مشكلة في الإقامة", /residen|إقامة|اقامة/, "residency", "دبي"]
];

const browserResults = Array(conversationalScenarios.length);
const screenshots = new Set([0, 3, 4]);

async function waitForNewAnswer(page, previousCount) {
  await page.waitForFunction(
    (count) => document.querySelectorAll(".hb-chat-message--assistant .hb-chat-answer").length > count,
    previousCount,
    { timeout: 30000 }
  );
  await page.waitForTimeout(320);
}

async function runConversationalJourney(index) {
  const [query, expected, family, emirate] = conversationalScenarios[index];
  const profile = index % 2 ? "desktop" : "mobile";
  const context = await browser.newContext(profile === "mobile"
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    const response = await page.goto(`${baseUrl}/?journey=${index + 1}&hb_qa=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await page.locator("[data-hb-ai-brand]").waitFor({ state: "visible", timeout: 15000 });
    await page.locator(".hb-chat-send").waitFor({ state: "visible", timeout: 15000 });

    const composer = page.locator(".hb-conversation-composer");
    const composerBox = await composer.boundingBox();
    const composerInFirstViewport = Boolean(composerBox && composerBox.y >= 0 && composerBox.y < (profile === "mobile" ? 844 : 1000));
    const authBeforeAnalysis = await page.locator(".hb-chat-primary").count();
    const homepageOverflowBefore = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const aiBrand = await page.locator("[data-hb-ai-brand]").count();

    await page.locator("#government-search").fill(query);
    const answersBefore = await page.locator(".hb-chat-message--assistant .hb-chat-answer").count();
    await page.locator(".hb-chat-send").click();
    await page.locator(".hb-chat-message--user").last().waitFor({ state: "visible", timeout: 10000 });
    await waitForNewAnswer(page, answersBefore);

    for (let turn = 0; turn < 2; turn += 1) {
      const serviceLink = page.locator('.hb-chat-actions a.hb-chat-secondary[href^="/services/"]').last();
      if (await serviceLink.count()) break;
      const quick = page.locator(".hb-chat-quick-replies button:not([disabled])").first();
      if (!(await quick.count())) break;
      const before = await page.locator(".hb-chat-message--assistant .hb-chat-answer").count();
      await quick.click();
      await waitForNewAnswer(page, before);
    }

    const serviceLink = page.locator('.hb-chat-actions a.hb-chat-secondary[href^="/services/"]').last();
    const route = await serviceLink.count() ? await serviceLink.getAttribute("href") : null;
    const correct = Boolean(route && expected.test(decodeURIComponent(route)));
    const aiIdentity = await page.locator(".hb-ai-identity-copy strong").last().textContent().catch(() => "");
    const serviceText = await page.locator(".hb-chat-info-block").filter({ has: page.locator("strong", { hasText: "الخدمة المطابقة" }) }).last().textContent().catch(() => "");
    const authorityText = await page.locator(".hb-chat-info-block").filter({ has: page.locator("strong", { hasText: "الجهة المختصة" }) }).last().textContent().catch(() => "");
    const source = page.locator('.hb-chat-source a[href^="https://"]').last();
    const sourceHref = await source.count() ? await source.getAttribute("href") : "";
    const sourceBadge = await page.locator(".hb-ai-source-badge").last().textContent().catch(() => "");
    const trustBadge = await page.locator(".hb-ai-trust-badge").last().textContent().catch(() => "");
    const primary = page.locator(".hb-chat-primary").last();
    const save = page.locator(".hb-chat-save-plan").last();
    const primaryLabel = await primary.count() ? (await primary.textContent() || "").trim() : "";
    const saveLabel = await save.count() ? (await save.textContent() || "").trim() : "";
    const primaryHref = await primary.count() ? await primary.getAttribute("href") : "";
    const homepageOverflowAfter = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

    let navigated = false;
    let requirements = false;
    let officialCount = 0;
    let contactCount = 0;
    let officialLabel = "";
    let contactLabel = "";
    let noOverflow = !homepageOverflowAfter;
    let rtl = await page.evaluate(() => getComputedStyle(document.documentElement).direction === "rtl");

    if (route && await serviceLink.count()) {
      const navigation = page.waitForURL((url) => decodeURIComponent(url.pathname) === decodeURIComponent(route), { timeout: 30000 }).catch(() => null);
      await serviceLink.click();
      await navigation;
      navigated = decodeURIComponent(new URL(page.url()).pathname) === decodeURIComponent(route);
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(450);
      requirements = await page.locator("h2").filter({ hasText: /المستندات|المتطلبات|ما الذي تحتاجه/ }).count() > 0;
      const official = page.locator('[data-government-cta="verified"][href^="https://"]').first();
      officialCount = await official.count();
      const contact = page.locator('[data-commercial-cta="verified"][href^="https://wa.me/"]').first();
      contactCount = await contact.count();
      officialLabel = officialCount ? (await official.innerText()).trim() : "";
      contactLabel = contactCount ? (await contact.innerText()).trim() : "";
      noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      rtl = await page.evaluate(() => getComputedStyle(document.documentElement).direction === "rtl");
    }

    const conversationalPass = response?.status() === 200
      && authBeforeAnalysis === 0
      && aiBrand === 1
      && composerInFirstViewport
      && !homepageOverflowBefore
      && !homepageOverflowAfter
      && aiIdentity?.trim() === "HB AI"
      && Boolean(serviceText)
      && Boolean(authorityText)
      && Boolean(sourceHref?.startsWith("https://"))
      && /مصدر رسمي/.test(sourceBadge || "")
      && /(?:معلومة موثقة|مستند إلى مصدر رسمي)/.test(trustBadge || "")
      && primaryLabel === "ابدأ معاملتي"
      && saveLabel === "احفظ الخطة"
      && Boolean(primaryHref?.startsWith("/auth/?return="));

    const servicePass = correct && navigated && requirements && officialCount === 1 && contactCount === 1
      && /(?:اذهب للجهة الرسمية|ابدأ التنفيذ الحكومي الرسمي|افتح صفحة الخدمة الحكومية|افتح الدليل الحكومي الرسمي|افتح بوابة التنفيذ الحكومية|التقديم الرسمي)/.test(officialLabel)
      && /(?:تواصل معنا لإنجازها|أريد حسام بحر أن ينجزها لي|أنجزها معنا)/.test(contactLabel)
      && noOverflow && rtl;

    const pass = conversationalPass && servicePass && errors.length === 0;
    if (screenshots.has(index)) await page.screenshot({ path: resolve(output, `${String(index + 1).padStart(2, "0")}-ai-${family}-${profile}.png`), fullPage: true });
    browserResults[index] = {
      query, family, emirate, profile, route, correct, navigated, requirements,
      aiIdentity: aiIdentity?.trim() || "", serviceText: (serviceText || "").replace(/\s+/g, " ").trim(),
      authorityText: (authorityText || "").replace(/\s+/g, " ").trim(), sourceHref,
      sourceBadge: (sourceBadge || "").trim(), trustBadge: (trustBadge || "").trim(),
      authBeforeAnalysis, composerInFirstViewport, homepageOverflowBefore, homepageOverflowAfter,
      primaryLabel, saveLabel, authGatedAfterResult: Boolean(primaryHref?.startsWith("/auth/?return=")),
      officialCta: officialCount === 1, contactCta: contactCount === 1, officialLabel, contactLabel,
      noOverflow, rtl, errors, pass
    };
  } catch (error) {
    browserResults[index] = {
      query, family, emirate, profile, route: null, correct: false, navigated: false, requirements: false,
      aiIdentity: "", serviceText: "", authorityText: "", sourceHref: "", sourceBadge: "", trustBadge: "",
      authBeforeAnalysis: -1, composerInFirstViewport: false, homepageOverflowBefore: true, homepageOverflowAfter: true,
      primaryLabel: "", saveLabel: "", authGatedAfterResult: false,
      officialCta: false, contactCta: false, officialLabel: "", contactLabel: "",
      noOverflow: false, rtl: false, errors: [...errors, error?.message || String(error)], pass: false
    };
  } finally {
    await context.close();
  }
}

for (let index = 0; index < conversationalScenarios.length; index += 1) {
  await runConversationalJourney(index);
}

const deviceProfiles = [
  ["mobile-320", 320, 720], ["mobile-360", 360, 800], ["iphone-390", 390, 844],
  ["mobile-430", 430, 900], ["tablet", 768, 1024], ["desktop", 1440, 1000]
];
const responsiveResults = [];
for (const [name, width, height] of deviceProfiles) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/?hb_qa=1`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1950);
  const result = await page.evaluate(() => {
    const search = document.querySelector("form.primary-search");
    const submit = search?.querySelector('button[type="submit"]');
    const rect = search?.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      primarySearches: document.querySelectorAll("form.primary-search").length,
      guidedHelp: document.querySelectorAll("details.transaction-discovery-modes").length,
      aiBrand: document.querySelectorAll("[data-hb-ai-brand]").length,
      searchInFirstViewport: Boolean(rect && rect.top >= 0 && rect.top < window.innerHeight),
      primaryLabel: submit?.textContent?.trim() || "", primaryAriaLabel: submit?.getAttribute("aria-label") || "", lang: document.documentElement.lang, dir: document.documentElement.dir };
  });
  responsiveResults.push({ name, ...result, errors, pass: !result.overflow && result.primarySearches === 1
    && result.guidedHelp === 0 && result.aiBrand === 1 && result.searchInFirstViewport && /إرسال السؤال/.test(result.primaryAriaLabel)
    && result.lang === "ar" && result.dir === "rtl" && errors.length === 0 });
  if (name === "mobile-390" || name === "desktop") await page.screenshot({ path: resolve(output, `homepage-${name}.png`), fullPage: true });
  await page.close();
}

const advisorScenarios = [
  ['أريد مكتب ترجمة عامة', /749904[\s\S]*خدمات الترجمة والتدقيق واللغوي/],
  ['مكتب معاملات حكومية', /مركز إنجاز المعاملات الحكومية/],
  ['خدمات تنظيف', /تنظيف|نظافة|clean/i],
  ['مطعم ومقهى', /مطعم|مقهى|restaurant|cafe/i],
  ['متجر ملابس', /ملابس|أزياء|clothing|garment|fashion/i],
  ['برمجة تطبيقات', /برمج|تطبيق|software|application/i],
  ['استشارات إدارية', /استشار|consult/i],
  ['مقاولات صيانة مباني', /مقاولات|صيانة|مباني|contract|maintenance/i],
  ['نقل وتوصيل', /نقل|توصيل|transport|delivery/i],
  ['تجارة إلكترونية', /الكتروني|إلكتروني|online|ecommerce/i]
];
const advisorResults = [];
const advisorPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
const advisorErrors = [];
advisorPage.on('pageerror', (error) => advisorErrors.push(error.message));
await advisorPage.goto(`${baseUrl}/dubai-business-activities.html?advisor-regression=1&hb_qa=1`, { waitUntil: 'networkidle', timeout: 60000 });
for (const [query, expected] of advisorScenarios) {
  await advisorPage.locator('#businessIdea').fill(query);
  await advisorPage.locator('#activityAdvisorForm button[type="submit"]').click();
  const first = advisorPage.locator('#advisorMatchGrid .advisor-match').first();
  await first.waitFor({ state: 'visible', timeout: 20000 });
  const text = (await first.textContent()) || '';
  advisorResults.push({ query, first: text.replace(/\s+/g, ' ').trim(), pass: expected.test(text) });
}
await advisorPage.close();

await browser.close();
if (server) await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));

const activityChecks = [
  ["514929", "514929"], ["5149", /^5149/], ["ملابس", /ملابس|ألبسة|ثياب/],
  ["clothing", /clothes|clothing|garment|fashion|textile/i], ["تنظيف", /تنظيف|غسيل|clean|wash/i]
].map(([query, expected]) => {
  const first = rankActivities(query, activities)[0];
  const value = `${first?.code || ""} ${first?.nameAr || ""} ${first?.nameEn || ""}`;
  return { query, result: value, pass: typeof expected === "string" ? first?.code === expected : expected.test(value) };
});

const actualEmirates = new Set(registry.services.flatMap((service) => {
  const text = service.emirate || "";
  return ["دبي", "أبوظبي", "الشارقة", "عجمان", "رأس الخيمة", "أم القيوين", "الفجيرة"].filter((name) => text.includes(name));
}));
const report = {
  generatedAt: new Date().toISOString(),
  sourceOfTruth: { registryServices: registry.services.length, summaryServices: summary.services, verified: summary.verified, activities: activities.length, emirates: [...actualEmirates] },
  ranking: { total: rankingResults.length, passed: rankingResults.filter((item) => item.pass).length, failed: rankingResults.filter((item) => !item.pass) },
  journeys: { total: browserResults.length, passed: browserResults.filter((item) => item.pass).length, failed: browserResults.filter((item) => !item.pass) },
  activitySearch: { total: activityChecks.length, passed: activityChecks.filter((item) => item.pass).length, results: activityChecks },
  activityAdvisor: { total: advisorResults.length, passed: advisorResults.filter((item) => item.pass).length, errors: advisorErrors, results: advisorResults },
  responsive: { total: responsiveResults.length, passed: responsiveResults.filter((item) => item.pass).length, results: responsiveResults }
};
await writeFile(resolve(output, "final-platform-acceptance.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ sourceOfTruth: report.sourceOfTruth, ranking: report.ranking, journeys: report.journeys, activitySearch: report.activitySearch, activityAdvisor: report.activityAdvisor, responsive: report.responsive }, null, 2));
if (registry.services.length !== 200 || summary.services !== 200 || activities.length !== 2610 || actualEmirates.size !== 7 || report.ranking.passed !== 100 || report.journeys.passed !== conversationalScenarios.length || report.activitySearch.passed !== report.activitySearch.total || report.activityAdvisor.passed !== report.activityAdvisor.total || advisorErrors.length || report.responsive.passed !== report.responsive.total) process.exit(1);

