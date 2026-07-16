from pathlib import Path
from urllib.parse import urlsplit
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
items = json.loads((ROOT / "content" / "service-guides.json").read_text(encoding="utf-8"))
hub = (ROOT / "service-guides.html").read_text(encoding="utf-8")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
service_sitemap = (ROOT / "sitemap-services.xml").read_text(encoding="utf-8")
homepage = (ROOT / "index.html").read_text(encoding="utf-8")
robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
errors = []
titles = set()
descriptions = set()


def attr(html: str, pattern: str) -> str:
    match = re.search(pattern, html, re.I | re.S)
    return match.group(1).strip() if match else ""


if len(items) < 10:
    errors.append("at least 10 focused guides are required")

for item in items:
    relative = Path("services") / f"{item['slug']}.html"
    path = ROOT / relative
    if not path.is_file():
        errors.append(f"missing generated page: {relative}")
        continue
    html = path.read_text(encoding="utf-8")
    title = attr(html, r"<title>(.*?)</title>")
    description = attr(html, r'<meta\s+name="description"\s+content="([^"]+)"')
    canonical = attr(html, r'<link\s+rel="canonical"\s+href="([^"]+)"')
    expected = f"https://hossambahr.com/{relative.as_posix()}"
    if not title or title in titles:
        errors.append(f"missing or duplicate title: {relative}")
    titles.add(title)
    if not description or description in descriptions or not 70 <= len(description) <= 180:
        errors.append(f"invalid or duplicate description: {relative} ({len(description)})")
    descriptions.add(description)
    if canonical != expected:
        errors.append(f"wrong canonical: {relative}")
    if len(re.findall(r"<h1[\s>]", html, re.I)) != 1:
        errors.append(f"page must have one h1: {relative}")
    if item["official"] not in html:
        errors.append(f"official URL missing: {relative}")
    for phrase in ["المسار الحكومي", "مسار حسام بحر", "0503780460", "لا ترسل جوازاً أو هوية"]:
        if phrase not in html:
            errors.append(f"missing required phrase in {relative}: {phrase}")
    if expected not in sitemap:
        errors.append(f"sitemap missing: {relative}")
    if expected not in service_sitemap:
        errors.append(f"service sitemap missing: {relative}")
    if f'href="services/{item["slug"]}.html"' not in hub:
        errors.append(f"hub link missing: {relative}")
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.I | re.S)
    if not blocks:
        errors.append(f"JSON-LD missing: {relative}")
    for block in blocks:
        try:
            json.loads(block)
        except json.JSONDecodeError:
            errors.append(f"invalid JSON-LD: {relative}")
    if 'property="og:title"' not in html or '"@type":"WebPage"' not in html:
        errors.append(f"discovery metadata missing: {relative}")
    for target in re.findall(r'(?:href|src)="([^"]+)"', html, re.I):
        if target.startswith(("http:", "https:", "mailto:", "tel:", "#", "data:")):
            continue
        clean = urlsplit(target).path
        resolved = (path.parent / clean).resolve()
        outside = ROOT.resolve() not in resolved.parents and resolved != ROOT.resolve()
        if clean and (outside or not resolved.exists()):
            errors.append(f"broken local link in {relative}: {target}")

generated = {path.stem for path in (ROOT / "services").glob("*.html")}
declared = {item["slug"] for item in items}
if generated != declared:
    errors.append(f"generated/data mismatch: generated={len(generated)} declared={len(declared)}")
if "https://hossambahr.com/service-guides.html" not in sitemap:
    errors.append("guide hub missing from sitemap")
if 'href="service-guides.html"' not in homepage:
    errors.append("homepage must link to the service guide hub")
if "Sitemap: https://hossambahr.com/sitemap-services.xml" not in robots:
    errors.append("service sitemap missing from robots.txt")
for xml_name in ["sitemap-services.xml", "feed.xml"]:
    try:
        import xml.etree.ElementTree as ET
        ET.parse(ROOT / xml_name)
    except (ET.ParseError, OSError) as exc:
        errors.append(f"invalid {xml_name}: {exc}")

if errors:
    print(f"Service guide validation failed with {len(errors)} errors")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print(f"Service guide validation passed: {len(items)} guides, unique SEO, dual routes, valid links")
