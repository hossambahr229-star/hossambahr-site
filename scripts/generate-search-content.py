#!/usr/bin/env python3
"""Build the client-side full-text index from public HTML pages.

Run after adding or regenerating service guides:
    python scripts/generate-search-content.py
"""
from __future__ import annotations

import json
import re
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "search-content-data.js"
EXCLUDED_NAMES = {
    "404.html",
    "admin.html",
    "index.html",
    "privacy.html",
    "search-results.html",
    "terms.html",
}
EXCLUDED_PARTS = {".git", ".gh-cli", ".edge-test"}


class PageTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.text_parts: list[str] = []
        self.main_parts: list[str] = []
        self.description = ""
        self._skip_depth = 0
        self._in_title = False
        self._main_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag in {"script", "style", "svg", "noscript"}:
            self._skip_depth += 1
        if tag == "title":
            self._in_title = True
        if tag == "main":
            self._main_depth += 1
        if tag == "meta" and attrs_dict.get("name", "").lower() == "description":
            self.description = attrs_dict.get("content", "") or ""

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "svg", "noscript"} and self._skip_depth:
            self._skip_depth -= 1
        if tag == "title":
            self._in_title = False
        if tag == "main" and self._main_depth:
            self._main_depth -= 1

    def handle_data(self, data: str) -> None:
        clean = re.sub(r"\s+", " ", data).strip()
        if not clean:
            return
        if self._in_title:
            self.title_parts.append(clean)
        if not self._skip_depth:
            self.text_parts.append(clean)
            if self._main_depth:
                self.main_parts.append(clean)


def infer_emirate(text: str) -> str:
    for emirate in ("دبي", "أبوظبي", "الشارقة", "عجمان", "رأس الخيمة", "أم القيوين", "الفجيرة"):
        if emirate in text:
            return emirate
    return "اتحادي"


def parse_page(path: Path) -> dict[str, str]:
    parser = PageTextParser()
    parser.feed(path.read_text(encoding="utf-8"))
    title = " ".join(parser.title_parts).split("|")[0].strip()
    body = " ".join(parser.main_parts or parser.text_parts)
    body = re.sub(r"\s+", " ", body).strip()
    relative = path.relative_to(ROOT).as_posix()
    return {
        "id": "content-" + re.sub(r"[^a-z0-9]+", "-", relative.lower()).strip("-"),
        "title": title or path.stem.replace("-", " "),
        "description": parser.description or body[:240],
        "content": body[:9000],
        "url": relative,
        "emirate": infer_emirate(f"{title} {body[:1000]}"),
        "updated": date.fromtimestamp(path.stat().st_mtime).isoformat(),
    }


def main() -> None:
    pages = []
    for path in sorted(ROOT.rglob("*.html")):
        if path.name in EXCLUDED_NAMES or any(part in EXCLUDED_PARTS for part in path.parts):
            continue
        pages.append(parse_page(path))
    payload = {"generated": date.today().isoformat(), "pages": pages}
    OUTPUT.write_text(
        "window.HB_SEARCH_CONTENT=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT.name}: {len(pages)} public pages")


if __name__ == "__main__":
    main()
