from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path
from urllib.parse import quote
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "content" / "service-guides.json"
OUTPUT = ROOT / "services"
BASE = "https://hossambahr.com"
PHONE = "971503780460"
TODAY = date.today().isoformat()
PUBLISHED = "2026-07-16"


def text(value: str) -> str:
    return escape(value, quote=True)


def list_items(values: list[str], ordered: bool = False) -> str:
    tag = "ol" if ordered else "ul"
    return f"<{tag}>" + "".join(f"<li>{text(value)}</li>" for value in values) + f"</{tag}>"


def json_ld(item: dict) -> str:
    canonical = f"{BASE}/services/{item['slug']}.html"
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service",
                "name": item["title"],
                "description": item["summary"],
                "url": canonical,
                "areaServed": {"@type": "Country", "name": "United Arab Emirates"},
                "provider": {"@type": "Organization", "name": "Hossam Bahr Business Services", "url": BASE},
                "serviceType": item["category"],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": question,
                        "acceptedAnswer": {"@type": "Answer", "text": answer},
                    }
                    for question, answer in item["faq"]
                ],
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "الرئيسية", "item": BASE + "/"},
                    {"@type": "ListItem", "position": 2, "name": "أدلة الخدمات", "item": BASE + "/service-guides.html"},
                    {"@type": "ListItem", "position": 3, "name": item["title"], "item": canonical},
                ],
            },
        ],
    }
    return json.dumps(graph, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def discovery_markup(item: dict) -> str:
    canonical = f"{BASE}/services/{item['slug']}.html"
    title = f"{item['title']} | دليل حسام بحر"
    description = f"دليل {item['title']}: المتطلبات والخطوات والرسوم والمدة والمشكلات الشائعة، مع الرابط الحكومي وخيار تجهيز الملف."
    web_page = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": canonical + "#webpage",
        "url": canonical,
        "name": item["title"],
        "description": description,
        "inLanguage": "ar-AE",
        "datePublished": PUBLISHED,
        "dateModified": TODAY,
        "isPartOf": {"@type": "WebSite", "@id": BASE + "/#website", "name": "منصة حسام بحر"},
        "about": {"@type": "Thing", "name": item["category"]},
    }
    structured = json.dumps(web_page, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'<meta property="og:type" content="article"><meta property="og:locale" content="ar_AE"><meta property="og:site_name" content="منصة حسام بحر"><meta property="og:title" content="{text(title)}"><meta property="og:description" content="{text(description)}"><meta property="og:url" content="{canonical}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="{text(title)}"><meta name="twitter:description" content="{text(description)}"><meta property="article:published_time" content="{PUBLISHED}"><meta property="article:modified_time" content="{TODAY}"><script type="application/ld+json">{structured}</script>'


def enhance_page_html(html: str, item: dict) -> str:
    return html.replace("</head>", discovery_markup(item) + "</head>", 1)


def enhance_hub_html(html: str) -> str:
    title = "خدمات الشركات والعمل والإقامة في الإمارات | حسام بحر"
    description = "أدلة معاملات الشركات والعمل والإقامة في الإمارات: المستندات والخطوات والرسوم والمدة والرابط الحكومي وخيار تجهيز وتنفيذ الخدمة."
    html = html.replace("أدلة معاملات الإمارات خطوة بخطوة | حسام بحر", title, 1)
    html = html.replace("أدلة مستقلة لأهم معاملات الشركات والعمل والإقامة في الإمارات، تعرض المستندات والخطوات والرسوم والمدة والرابط الحكومي وخيار تنفيذ الخدمة.", description, 1)
    social = f'<meta property="og:type" content="website"><meta property="og:locale" content="ar_AE"><meta property="og:site_name" content="منصة حسام بحر"><meta property="og:title" content="{text(title)}"><meta property="og:description" content="{text(description)}"><meta property="og:url" content="{BASE}/service-guides.html"><meta name="twitter:card" content="summary"><link rel="alternate" type="application/rss+xml" title="أحدث أدلة خدمات حسام بحر" href="{BASE}/feed.xml">'
    return html.replace("</head>", social + "</head>", 1)


def page(item: dict, related: list[dict]) -> str:
    title = text(item["title"])
    canonical = f"{BASE}/services/{item['slug']}.html"
    description = text(f"دليل {item['title']}: شرح مبسط للمتطلبات والخطوات والرسوم والمدة والمشكلات الشائعة، مع الرابط الحكومي وطلب تجهيز الملف.")
    message = quote(f"مرحباً، أريد مراجعة وتجهيز ملف خدمة: {item['title']}")
    related_html = "".join(f'<a href="{text(row["slug"])}.html">{text(row["title"])} ←</a>' for row in related)
    faq_html = "".join(f"<article><h3>{text(q)}</h3><p>{text(a)}</p></article>" for q, a in item["faq"])
    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#071f33"><title>{title} | دليل حسام بحر</title><meta name="description" content="{description}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{canonical}"><link rel="icon" href="../favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="../service-page.css"><link rel="stylesheet" href="../generated-service.css"><script type="application/ld+json">{json_ld(item)}</script></head><body><a class="skip-link" href="#main">تجاوز إلى المحتوى</a><div class="top"><span>دليل معاملات الإمارات · آخر مراجعة {TODAY}</span><a href="tel:+971503780460" dir="ltr">0503780460</a></div><header class="header"><a class="brand" href="../index.html">حسام بحر<small>BUSINESS PLATFORM · UAE</small></a><nav><a href="../service-guides.html">أدلة الخدمات</a><a href="../uae-service-catalog.html">كل المعاملات</a><a href="../platform-tools.html#selector">حدد خدمتك</a></nav><a href="https://wa.me/{PHONE}" target="_blank" rel="noopener">واتساب</a></header><div class="breadcrumb"><a href="../index.html">الرئيسية</a> ← <a href="../service-guides.html">أدلة الخدمات</a> ← {title}</div><main id="main"><section class="hero-service generated-hero"><div><span>{text(item['category'])} · {text(item['emirate'])}</span><h1>{title}</h1><p>{text(item['summary'])}</p><div class="service-proof"><b>متاحة للتجهيز</b><span>آخر مراجعة {TODAY}</span><span>مصدر رسمي مرفق</span></div><div class="hero-actions"><a class="cta" href="#routes">اختر طريقة التنفيذ ←</a><a class="soft-cta" href="#requirements">راجع المستندات</a></div></div><div class="quick-card"><b>الخلاصة السريعة</b><dl><div><dt>الجهة</dt><dd>{text(item['authority'])}</dd></div><div><dt>الرسوم الحكومية</dt><dd>{text(item['fee'])}</dd></div><div><dt>رسوم فريقنا</dt><dd>تُحدد كتابةً بعد مراجعة نطاق العمل وقبل البدء.</dd></div><div><dt>الإجمالي</dt><dd>يظهر في عرض واضح يفصل الرسوم الحكومية عن أتعاب التجهيز.</dd></div><div><dt>المدة</dt><dd>{text(item['duration'])}</dd></div></dl></div></section><div class="content"><article><section><span class="section-label">بشرح بسيط</span><h2>ما الخدمة ولماذا تحتاجها؟</h2><p>{text(item['why'])}</p></section><section id="requirements"><span class="section-label">قبل أن تبدأ</span><h2>المستندات والمعلومات الأساسية</h2>{list_items(item['requirements'])}<p class="source-note">قد تطلب الجهة مستندات إضافية حسب الشكل القانوني أو حالة الأطراف أو النشاط. لا ترفع وثائقك داخل هذا الموقع العام.</p></section><section><span class="section-label">خطوة بخطوة</span><h2>مسار الإنجاز المقترح</h2>{list_items(item['steps'], ordered=True)}</section><section class="problem-box"><span class="section-label">تجنب التعطل</span><h2>المشكلة الأكثر شيوعاً</h2><p>{text(item['problem'])}</p></section><section class="faq"><span class="section-label">إجابات سريعة</span><h2>الأسئلة الشائعة</h2>{faq_html}</section></article><aside class="prep-card"><span>فحص جاهزيتك</span><h3>هل جهزت الأساسيات؟</h3>{''.join(f'<label><input type="checkbox"><span>{text(req)}</span></label>' for req in item['requirements'])}<a href="https://wa.me/{PHONE}?text={message}" target="_blank" rel="noopener" data-track="service-request">اطلب مراجعة الملف ←</a><small>لا ترسل جوازاً أو هوية قبل الاتفاق على قناة آمنة.</small></aside></div><section class="choice-center" id="routes" aria-labelledby="routesTitle"><div class="choice-heading"><span>مساران محفوظان دائماً</span><h2 id="routesTitle">اختر طريقة إنجاز المعاملة</h2><p>جهّز الملف أولاً، ثم قدّم بنفسك أو اطلب من فريقنا مراجعته ومتابعة خطواته.</p></div><div class="choice-grid"><article class="official-choice"><i>01</i><span>المسار الحكومي</span><h3>التقديم بنفسك</h3><p>تنتقل إلى المصدر الرسمي وتراجع المتطلبات الحالية ثم ترفع وتدفع داخل بوابة الجهة فقط.</p><a class="route-button" href="{text(item['official'])}" target="_blank" rel="noopener nofollow" data-track="official-service">افتح الخدمة الرسمية ↗</a><small>الجهة الرسمية هي المرجع النهائي للشروط والرسوم.</small></article><article class="team-choice"><i>02</i><span>مسار حسام بحر</span><h3>تجهيز ومراجعة الملف</h3><p>نحدد النواقص والجهة والخطوة التالية قبل دخول البوابة الرسمية.</p><a href="https://wa.me/{PHONE}?text={message}" target="_blank" rel="noopener" data-track="service-request">اطلب تنفيذ الخدمة ←</a><small>التواصل على الرقم الموحد 0503780460.</small></article></div><div class="service-commitment"><b>قبل بدء التنفيذ</b><span>نؤكد نطاق العمل والنواقص.</span><span>نفصل الرسوم الحكومية عن أتعابنا.</span><span>لا نطلب مستندات حساسة عبر صفحة عامة.</span></div><footer>آخر مراجعة: {TODAY} · المعلومات إرشادية وقد تتغير لدى الجهة المختصة.</footer></section><section class="related"><span class="section-label">خدمات مرتبطة</span><h2>تابع رحلتك</h2><div class="related-grid">{related_html}<a href="../platform-tools.html#selector">حدد معاملة أخرى ←</a></div></section></main><div class="disclaimer">منصة خاصة وليست جهة حكومية. التقديم والسداد الرسميان يتمان داخل بوابة الجهة المختصة.</div><footer><span>© 2026 Hossam Bahr Business Services</span><a href="../privacy.html">سياسة الخصوصية</a><a href="../terms.html">الشروط</a></footer><a class="floating-guide-wa" href="https://wa.me/{PHONE}?text={message}" target="_blank" rel="noopener" aria-label="اطلب مراجعة الخدمة عبر واتساب" data-track="service-request">واتساب</a><script src="../analytics.js"></script><script src="../service-guide-progress.js"></script></body></html>'''


def hub(items: list[dict]) -> str:
    cards = "".join(
        f'<article><span>{text(item["category"])} · {text(item["emirate"])}</span><h2><a href="services/{text(item["slug"])}.html">{text(item["title"])}</a></h2><p>{text(item["summary"])}</p><footer><small>{text(item["authority"])}</small><a href="services/{text(item["slug"])}.html">افتح الدليل ←</a></footer></article>'
        for item in items
    )
    schema = json.dumps({"@context":"https://schema.org","@type":"CollectionPage","name":"أدلة معاملات الإمارات","url":BASE+"/service-guides.html","mainEntity":{"@type":"ItemList","numberOfItems":len(items),"itemListElement":[{"@type":"ListItem","position":i+1,"url":f"{BASE}/services/{item['slug']}.html","name":item["title"]} for i,item in enumerate(items)]}}, ensure_ascii=False, separators=(",", ":"))
    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#071f33"><title>أدلة معاملات الإمارات خطوة بخطوة | حسام بحر</title><meta name="description" content="أدلة مستقلة لأهم معاملات الشركات والعمل والإقامة في الإمارات، تعرض المستندات والخطوات والرسوم والمدة والرابط الحكومي وخيار تنفيذ الخدمة."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{BASE}/service-guides.html"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="service-guides.css"><script type="application/ld+json">{schema}</script></head><body><a class="skip-link" href="#main">تجاوز إلى المحتوى</a><div class="guide-top"><span>قاعدة معرفة عملية · الإمارات</span><a href="tel:+971503780460" dir="ltr">0503780460</a></div><header><a class="guide-brand" href="index.html"><i>HB</i><span><b>حسام بحر</b><small>BUSINESS GUIDES</small></span></a><nav><a href="uae-service-catalog.html">كل المعاملات</a><a href="platform-tools.html#selector">حدد خدمتك</a><a href="knowledge-hub.html">مركز المعرفة</a></nav><a class="outline" href="https://wa.me/{PHONE}" target="_blank" rel="noopener">تواصل معنا</a></header><main id="main"><section class="guide-hero"><div><span>لا تبدأ المعاملة وأنت غير متأكد</span><h1>أدلة معاملات الإمارات<br><em>خطوة بخطوة.</em></h1><p>اختر معاملتك لتعرف ما هي، لماذا تحتاجها، ماذا تجهز، وأين تقدم — مع الاحتفاظ دائماً بالمسار الرسمي ومسار فريقنا.</p></div><aside><b>{len(items)}</b><span>دليلاً متخصصاً الآن</span><small>ويستمر التوسع بالمصادر الرسمية.</small></aside></section><section class="guide-filter"><label for="guideSearch">ابحث داخل الأدلة</label><input id="guideSearch" type="search" placeholder="مثال: نقل موظف، شريك، تجديد إقامة" autocomplete="off"><p id="guideCount">{len(items)} دليلاً متاحاً</p></section><section class="guide-grid" id="guideGrid">{cards}</section><section class="guide-rescue" id="guideRescue" hidden><h2>لم تجد معاملتك؟</h2><p>استخدم محدد الخدمة لاقتراح أقرب مسار، أو اكتب هدفك لفريقنا.</p><a href="platform-tools.html#selector">استخدم محدد الخدمة ←</a><a href="https://wa.me/{PHONE}" target="_blank" rel="noopener">تواصل عبر واتساب</a></section></main><footer><div><b>منصة حسام بحر</b><span>دليل مستقل وليست جهة حكومية.</span></div><div><a href="privacy.html">الخصوصية</a><a href="terms.html">الشروط</a></div><p>© 2026</p></footer><script src="service-guides.js"></script><script src="analytics.js"></script></body></html>'''


def update_sitemap(items: list[dict]) -> None:
    path = ROOT / "sitemap.xml"
    current = path.read_text(encoding="utf-8")
    current = re.sub(r"\n  <url><loc>https://hossambahr\.com/service-guides\.html</loc>.*?</url>", "", current)
    current = re.sub(r"\n  <url><loc>https://hossambahr\.com/services/[^<]+</loc>.*?</url>", "", current)
    current = re.sub(r"\s*</urlset>\s*$", "\n</urlset>\n", current)
    entries = [f"  <url><loc>{BASE}/service-guides.html</loc><lastmod>{TODAY}</lastmod></url>"]
    entries.extend(f"  <url><loc>{BASE}/services/{item['slug']}.html</loc><lastmod>{TODAY}</lastmod></url>" for item in items)
    current = current.replace("</urlset>", "\n".join(entries) + "\n</urlset>")
    path.write_text(current, encoding="utf-8", newline="\n")


def write_discovery_feeds(items: list[dict]) -> None:
    urls = [f"{BASE}/service-guides.html"] + [f"{BASE}/services/{item['slug']}.html" for item in items]
    entries = "\n".join(f"  <url><loc>{url}</loc><lastmod>{TODAY}</lastmod></url>" for url in urls)
    service_sitemap = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{entries}\n</urlset>\n'
    (ROOT / "sitemap-services.xml").write_text(service_sitemap, encoding="utf-8", newline="\n")
    feed_items = "".join(f'<item><title>{text(item["title"])}</title><link>{BASE}/services/{item["slug"]}.html</link><guid isPermaLink="true">{BASE}/services/{item["slug"]}.html</guid><description>{text(item["summary"])}</description><pubDate>Thu, 16 Jul 2026 00:00:00 +0400</pubDate></item>' for item in items)
    feed = f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>أدلة خدمات حسام بحر</title><link>{BASE}/service-guides.html</link><description>أحدث أدلة معاملات الشركات والعمل والإقامة في الإمارات</description><language>ar-AE</language><lastBuildDate>Thu, 16 Jul 2026 00:00:00 +0400</lastBuildDate>{feed_items}</channel></rss>\n'
    (ROOT / "feed.xml").write_text(feed, encoding="utf-8", newline="\n")


def update_homepage_links(items: list[dict]) -> None:
    path = ROOT / "index.html"
    html = path.read_text(encoding="utf-8")
    priority_slugs = [
        "renew-business-license-dubai", "renew-business-license-abu-dhabi",
        "transfer-work-permit-uae", "new-work-permit-overseas-uae",
        "employment-contract-uae", "investor-residency-dubai",
        "family-residency-uae", "golden-residency-uae",
        "renew-residency-permit-uae", "renew-emirates-id-uae",
        "corporate-tax-registration-uae", "vat-registration-uae",
    ]
    by_slug = {item["slug"]: item for item in items}
    priority = [by_slug[slug] for slug in priority_slugs if slug in by_slug]
    links = "".join(
        f'<a href="services/{text(item["slug"])}.html">{text(item["title"])}</a>'
        for item in priority
    )
    pattern = r'(<nav aria-label="أهم أدلة معاملات الإمارات">).*?(</nav>)'
    html, count = re.subn(pattern, rf'\1{links}\2', html, count=1, flags=re.S)
    if count != 1:
        raise SystemExit("Homepage service guide navigation was not found")
    html = re.sub(r'<div><b>\d+</b><span>(?:صفحة عامة منشورة|دليلاً تفصيلياً)</span></div>', f'<div><b>{len(items)}</b><span>دليلاً تفصيلياً</span></div>', html, count=1)
    path.write_text(html, encoding="utf-8", newline="\n")


def main() -> None:
    items = json.loads(DATA.read_text(encoding="utf-8"))
    slugs = [item["slug"] for item in items]
    if len(slugs) != len(set(slugs)):
        raise SystemExit("Duplicate service guide slug")
    OUTPUT.mkdir(exist_ok=True)
    expected = set()
    for item in items:
        expected.add(f"{item['slug']}.html")
        related = [row for row in items if row["slug"] != item["slug"] and row["category"] == item["category"]][:2]
        if len(related) < 2:
            related.extend(row for row in items if row["slug"] != item["slug"] and row not in related)
        rendered = enhance_page_html(page(item, related[:2]), item)
        (OUTPUT / f"{item['slug']}.html").write_text(rendered, encoding="utf-8", newline="\n")
    for stale in OUTPUT.glob("*.html"):
        if stale.name not in expected:
            stale.unlink()
    (ROOT / "service-guides.html").write_text(enhance_hub_html(hub(items)), encoding="utf-8", newline="\n")
    update_homepage_links(items)
    update_sitemap(items)
    write_discovery_feeds(items)
    print(f"Generated {len(items)} service guides and hub")


if __name__ == "__main__":
    main()
