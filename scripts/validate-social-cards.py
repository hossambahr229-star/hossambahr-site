from __future__ import annotations

import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "content" / "service-guides.json"
BASE = "https://hossambahr.com/assets/images/social/services"


def main() -> None:
    items = json.loads(DATA.read_text(encoding="utf-8"))
    errors: list[str] = []
    for item in items:
        slug = item["slug"]
        image_path = ROOT / "assets" / "images" / "social" / "services" / f"{slug}.png"
        page_path = ROOT / "services" / f"{slug}.html"
        expected = f"{BASE}/{slug}.png"
        if not image_path.exists():
            errors.append(f"missing image: {image_path.relative_to(ROOT)}")
            continue
        with Image.open(image_path) as image:
            if image.size != (1200, 630) or image.format != "PNG":
                errors.append(f"invalid image: {image_path.relative_to(ROOT)} {image.format} {image.size}")
        html = page_path.read_text(encoding="utf-8")
        for attribute in ('property="og:image"', 'property="og:image:secure_url"', 'name="twitter:image"'):
            pattern = rf'<meta {attribute} content="{re.escape(expected)}">'
            if not re.search(pattern, html):
                errors.append(f"{page_path.name}: missing {attribute} -> {expected}")
        if f'<meta property="og:image:alt" content="دليل {item["title"]} - منصة حسام بحر">' not in html:
            errors.append(f"{page_path.name}: incorrect image alt")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Validated {len(items)} unique 1200x630 social cards and page metadata")


if __name__ == "__main__":
    main()
