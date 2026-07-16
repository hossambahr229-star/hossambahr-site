from pathlib import Path
from urllib.parse import urlsplit
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://hossambahr.com/"
EXCLUDED = {"404.html", "admin.html", "command-center.html"}
errors = []
warnings = []
titles = {}
descriptions = {}


def capture(html: str, pattern: str) -> str:
    match = re.search(pattern, html, re.I | re.S)
    return match.group(1).strip() if match else ""


pages = []
for path in ROOT.rglob("*.html"):
    relative = path.relative_to(ROOT)
    if any(part.startswith(".") for part in relative.parts) or relative.as_posix() in EXCLUDED:
        continue
    pages.append((path, relative))

expected_urls = set()
for path, relative in pages:
    html = path.read_text(encoding="utf-8")
    public_path = "" if relative.as_posix() == "index.html" else relative.as_posix()
    expected = BASE + public_path
    expected_urls.add(expected)
    title = capture(html, r"<title>(.*?)</title>")
    description = capture(html, r'<meta\s+name="description"\s+content="([^"]+)"')
    canonical = capture(html, r'<link\s+rel="canonical"\s+href="([^"]+)"')
    if not title:
        errors.append(f"{relative}: missing title")
    elif title in titles:
        errors.append(f"{relative}: duplicate title with {titles[title]}")
    else:
        titles[title] = relative
    if not description:
        errors.append(f"{relative}: missing description")
    elif description in descriptions:
        errors.append(f"{relative}: duplicate description with {descriptions[description]}")
    else:
        descriptions[description] = relative
    if canonical != expected:
        errors.append(f"{relative}: canonical is {canonical}, expected {expected}")
    if len(re.findall(r"<h1[\s>]", html, re.I)) != 1:
        errors.append(f"{relative}: must contain exactly one h1")
    if not re.search(r'<html[^>]+lang="ar"[^>]+dir="rtl"', html, re.I):
        errors.append(f"{relative}: missing Arabic RTL document attributes")
    ids = re.findall(r'\sid="([^"]+)"', html, re.I)
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    if duplicates:
        errors.append(f"{relative}: duplicate ids {duplicates}")
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.I | re.S):
        try:
            json.loads(block)
        except json.JSONDecodeError:
            errors.append(f"{relative}: invalid JSON-LD")
    for tag in re.findall(r'<a\b[^>]*target="_blank"[^>]*>', html, re.I):
        if not re.search(r'rel="[^"]*noopener', tag, re.I):
            errors.append(f"{relative}: target blank link missing noopener")
    for target in re.findall(r'(?:href|src)="([^"]+)"', html, re.I):
        if target.startswith(("http:", "https:", "mailto:", "tel:", "#", "data:", "javascript:")):
            continue
        clean = urlsplit(target).path
        resolved = (path.parent / clean).resolve()
        outside = ROOT.resolve() not in resolved.parents and resolved != ROOT.resolve()
        if clean and (outside or not resolved.exists()):
            errors.append(f"{relative}: broken local link {target}")
    if len(title) > 65:
        warnings.append(f"{relative}: title length {len(title)}")
    if not 70 <= len(description) <= 180:
        warnings.append(f"{relative}: description length {len(description)}")

root = ET.parse(ROOT / "sitemap.xml").getroot()
namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
sitemap_urls = {node.text for node in root.findall("s:url/s:loc", namespace)}
for missing in sorted(expected_urls - sitemap_urls):
    errors.append(f"sitemap missing {missing}")
for extra in sorted(sitemap_urls - expected_urls):
    errors.append(f"sitemap extra {extra}")

for path in list(ROOT.glob("*.html")) + list(ROOT.glob("*.js")) + list((ROOT / "services").glob("*.html")):
    content = path.read_text(encoding="utf-8", errors="ignore")
    for number in re.findall(r"(?:05\d{8}|9715\d{8})", content):
        if number not in {"0503780460", "971503780460"}:
            errors.append(f"{path.relative_to(ROOT)}: nonstandard phone {number}")

print(f"PUBLIC={len(pages)} SITEMAP={len(sitemap_urls)} ERRORS={len(errors)} WARNINGS={len(warnings)}")
for error in errors:
    print(f"ERROR: {error}")
for warning in warnings:
    print(f"WARNING: {warning}")
if errors or warnings:
    sys.exit(1)
