from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "content" / "service-guides.json"
OUTPUT = ROOT / "assets" / "images" / "social" / "services"
WIDTH, HEIGHT = 1200, 630

FONT_REGULAR = Path(r"C:\Windows\Fonts\tahoma.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\tahomabd.ttf")

# isolated, final, initial, medial. None means the letter cannot join in that direction.
FORMS = {
    "ء": ("\ufe80", None, None, None), "آ": ("\ufe81", "\ufe82", None, None),
    "أ": ("\ufe83", "\ufe84", None, None), "ؤ": ("\ufe85", "\ufe86", None, None),
    "إ": ("\ufe87", "\ufe88", None, None), "ئ": ("\ufe89", "\ufe8a", "\ufe8b", "\ufe8c"),
    "ا": ("\ufe8d", "\ufe8e", None, None), "ب": ("\ufe8f", "\ufe90", "\ufe91", "\ufe92"),
    "ة": ("\ufe93", "\ufe94", None, None), "ت": ("\ufe95", "\ufe96", "\ufe97", "\ufe98"),
    "ث": ("\ufe99", "\ufe9a", "\ufe9b", "\ufe9c"), "ج": ("\ufe9d", "\ufe9e", "\ufe9f", "\ufea0"),
    "ح": ("\ufea1", "\ufea2", "\ufea3", "\ufea4"), "خ": ("\ufea5", "\ufea6", "\ufea7", "\ufea8"),
    "د": ("\ufea9", "\ufeaa", None, None), "ذ": ("\ufeab", "\ufeac", None, None),
    "ر": ("\ufead", "\ufeae", None, None), "ز": ("\ufeaf", "\ufeb0", None, None),
    "س": ("\ufeb1", "\ufeb2", "\ufeb3", "\ufeb4"), "ش": ("\ufeb5", "\ufeb6", "\ufeb7", "\ufeb8"),
    "ص": ("\ufeb9", "\ufeba", "\ufebb", "\ufebc"), "ض": ("\ufebd", "\ufebe", "\ufebf", "\ufec0"),
    "ط": ("\ufec1", "\ufec2", "\ufec3", "\ufec4"), "ظ": ("\ufec5", "\ufec6", "\ufec7", "\ufec8"),
    "ع": ("\ufec9", "\ufeca", "\ufecb", "\ufecc"), "غ": ("\ufecd", "\ufece", "\ufecf", "\ufed0"),
    "ف": ("\ufed1", "\ufed2", "\ufed3", "\ufed4"), "ق": ("\ufed5", "\ufed6", "\ufed7", "\ufed8"),
    "ك": ("\ufed9", "\ufeda", "\ufedb", "\ufedc"), "ل": ("\ufedd", "\ufede", "\ufedf", "\ufee0"),
    "م": ("\ufee1", "\ufee2", "\ufee3", "\ufee4"), "ن": ("\ufee5", "\ufee6", "\ufee7", "\ufee8"),
    "ه": ("\ufee9", "\ufeea", "\ufeeb", "\ufeec"), "و": ("\ufeed", "\ufeee", None, None),
    "ى": ("\ufeef", "\ufef0", None, None), "ي": ("\ufef1", "\ufef2", "\ufef3", "\ufef4"),
}

PALETTES = {
    "الإقامة والهوية": ("#062e2b", "#0b5a50", "#d7b56d"),
    "العمل والموارد البشرية": ("#071f33", "#0d5c78", "#55c4bb"),
    "الضرائب": ("#17233e", "#29466f", "#d7b56d"),
}
DEFAULT_PALETTE = ("#071f33", "#0b4f4a", "#d7b56d")


def can_join_left(ch: str) -> bool:
    return ch in FORMS and FORMS[ch][2] is not None


def can_join_right(ch: str) -> bool:
    return ch in FORMS and FORMS[ch][1] is not None


def visual_arabic(value: str) -> str:
    """Shape Arabic for Pillow builds without libraqm, then reverse for visual RTL."""
    shaped: list[str] = []
    chars = list(value)
    for index, ch in enumerate(chars):
        if ch not in FORMS:
            shaped.append(ch)
            continue
        prev = chars[index - 1] if index else ""
        nxt = chars[index + 1] if index + 1 < len(chars) else ""
        joins_prev = can_join_left(prev) and can_join_right(ch)
        joins_next = can_join_left(ch) and can_join_right(nxt)
        isolated, final, initial, medial = FORMS[ch]
        if joins_prev and joins_next and medial:
            shaped.append(medial)
        elif joins_prev and final:
            shaped.append(final)
        elif joins_next and initial:
            shaped.append(initial)
        else:
            shaped.append(isolated)
    # Service titles are Arabic. Keep digit/Latin tokens readable if they occur.
    reversed_text = "".join(reversed(shaped))
    tokens = reversed_text.split(" ")
    for i, token in enumerate(tokens):
        if any("0" <= c <= "9" or "A" <= c <= "z" for c in token):
            tokens[i] = token[::-1]
    return " ".join(tokens)


def fit_lines(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont,
              max_width: int, max_lines: int = 3) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), visual_arabic(candidate), font=font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] += "…"
    return lines


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str,
            radius: int = 22, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def create_card(item: dict) -> Path:
    dark, mid, accent = PALETTES.get(item["category"], DEFAULT_PALETTE)
    image = Image.new("RGB", (WIDTH, HEIGHT), dark)
    draw = ImageDraw.Draw(image)

    # Branded, calm geometry that remains legible in small social previews.
    draw.ellipse((-150, 310, 430, 890), fill=mid)
    draw.ellipse((850, -290, 1380, 240), fill=mid)
    draw.rounded_rectangle((68, 58, 1132, 572), radius=36, fill="#ffffff")
    draw.rectangle((68, 58, 88, 572), fill=accent)

    brand_font = ImageFont.truetype(str(FONT_BOLD), 36)
    small_font = ImageFont.truetype(str(FONT_REGULAR), 25)
    label_font = ImageFont.truetype(str(FONT_BOLD), 25)
    title_font = ImageFont.truetype(str(FONT_BOLD), 55)
    chip_font = ImageFont.truetype(str(FONT_BOLD), 22)
    latin_font = ImageFont.truetype(str(FONT_BOLD), 24)

    draw.text((1090, 88), visual_arabic("منصة حسام بحر"), font=brand_font, fill=dark, anchor="ra")
    draw.text((1090, 133), "BUSINESS PLATFORM · UAE", font=latin_font, fill="#5e6c76", anchor="ra")

    label = f"{item['category']}  ·  {item['emirate']}"
    label_visual = visual_arabic(label)
    label_w = draw.textbbox((0, 0), label_visual, font=label_font)[2]
    rounded(draw, (1090 - label_w - 34, 184, 1090, 229), "#edf5f3", radius=18)
    draw.text((1073, 191), label_visual, font=label_font, fill=mid, anchor="ra")

    y = 258
    for line in fit_lines(draw, item["title"], title_font, 850):
        draw.text((1090, y), visual_arabic(line), font=title_font, fill=dark, anchor="ra")
        y += 72

    chips = ["المتطلبات", "الخطوات", "المسار الرسمي"]
    x = 1090
    for chip in chips:
        visual = visual_arabic(chip)
        w = draw.textbbox((0, 0), visual, font=chip_font)[2] + 42
        rounded(draw, (x - w, 472, x, 520), "#f4f6f7", radius=18, outline="#dce4e5")
        draw.text((x - 21, 482), visual, font=chip_font, fill=mid, anchor="ra")
        x -= w + 15

    draw.text((1090, 538), visual_arabic("دليل إرشادي · منصة خاصة"), font=small_font,
              fill="#68767d", anchor="ra")
    draw.text((118, 535), "hossambahr.com", font=latin_font, fill=dark)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT / f"{item['slug']}.png"
    image.save(destination, format="PNG", optimize=True)
    return destination


def main() -> None:
    items = json.loads(DATA.read_text(encoding="utf-8"))
    generated = {create_card(item).name for item in items}
    for stale in OUTPUT.glob("*.png"):
        if stale.name not in generated:
            stale.unlink()
    print(f"Generated {len(generated)} service social cards in {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
