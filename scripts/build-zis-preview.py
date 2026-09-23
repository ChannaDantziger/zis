"""Build a review copy; keep the supplied bundled prototype untouched."""
import base64
import gzip
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "prototypes" / "zis-review"
SECTIONS = "6bb30b1e-e5bd-4e9d-aadc-c02476f78ca4"


def main():
    source = (PREVIEW / "source-original.html").read_text(encoding="utf-8")
    manifest = read_block(source, "manifest")
    sections = decode_asset(manifest[SECTIONS])
    start = sections.index("function Logo(")
    end = sections.index("\n//", start)
    sections = sections[:start] + '''function Logo({ size = 28, tone = 'dark' }) {
  return (
    <a href="#top" className={`logo logo-${tone}`} aria-label="זיס — לדף הבית">
      <img src={`./assets/zis-logo-${tone}.png`} alt="זיס — איכות שנותנת טעם"
        width="948" height="693" style={{ width: size === 36 ? 156 : 104 }} />
    </a>
  );
}
''' + sections[end:]
    sections = sections.replace('<Logo size={36} />', '<Logo size={36} tone="light" />')
    encode_asset(manifest[SECTIONS], sections)
    for entry in manifest.values():
        if entry["mime"] != "application/javascript":
            continue
        code = decode_asset(entry).replace("Lis Patisserie", "ZIS Patisserie")
        code = code.replace("ליס", "זיס")
        code = code.replace("משלוח לכל הארץ", "משלוח עד הבית").replace("Nationwide", "Home delivery")
        code = code.replace("מירושלים", "ירושלים · ביתר · בית שמש")
        code = code.replace("From Jerusalem", "Jerusalem · Beitar · Beit Shemesh")
        code = code.replace("חינם מעל 2,500₪", "מחיר משלוח לפי אזור")
        code = code.replace("Free over ₪2,500", "Delivery priced by area")
        code = code.replace("משלוח עד 14 יום", "הזמנה עד 7 ימים מראש")
        code = code.replace("Up to 14 day lead", "Order up to 7 days ahead")
        encode_asset(entry, code)
    template = read_block(source, "template")
    template = re.sub(r"<title>.*?</title>", "<title>זיס — תצוגה לבדיקה</title>", template)
    template = template.replace("</head>", '<link rel="stylesheet" href="./review.css"></head>')
    source = write_block(source, "manifest", manifest)
    source = write_block(source, "template", template)
    (PREVIEW / "index.html").write_text(source, encoding="utf-8")
    print("Built prototypes/zis-review/index.html")


def read_block(source, name):
    pattern = rf'<script type="__bundler/{name}">(.*?)</script>'
    return json.loads(re.search(pattern, source, re.S).group(1))


def write_block(source, name, value):
    pattern = rf'(<script type="__bundler/{name}">).*?(</script>)'
    payload = json.dumps(value, ensure_ascii=True).replace("</", "<\\/")
    return re.sub(pattern, lambda match: match[1] + payload + match[2], source, flags=re.S)


def decode_asset(entry):
    data = base64.b64decode(entry["data"])
    return (gzip.decompress(data) if entry.get("compressed") else data).decode("utf-8")


def encode_asset(entry, source):
    data = source.encode("utf-8")
    if entry.get("compressed"):
        data = gzip.compress(data, mtime=0)
    entry["data"] = base64.b64encode(data).decode("ascii")


if __name__ == "__main__":
    main()
