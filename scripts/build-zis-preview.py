"""Build the visual review from Lis-standalone.html only."""
import base64
import gzip
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "prototypes" / "zis-review"
DATA = "7aa53857-c5bf-4450-9402-2d2b83961145"
SECTIONS = "63912e6f-9e1f-4a71-8a6e-b42b85733528"
APP = "8f2f4d22-29b9-4222-8697-9938e727fd79"


def main():
    source = (PREVIEW / "source-standalone.html").read_text(encoding="utf-8")
    manifest = read_block(source, "manifest")
    image_map = export_images(manifest, read_block(source, "ext_resources"))
    data = decode_asset(manifest[DATA])
    data = re.sub(
        r"const R = .*?;",
        "const PREVIEW_IMAGES = " + json.dumps(image_map) + ";\n"
        "const R = (id, fallback) => PREVIEW_IMAGES[id] || fallback;",
        data,
        count=1,
    )
    gallery = """const GALLERY = [
  { src: IMG.event1, alt: { he: 'תמונה 1', en: 'Image 1' } },
  { src: IMG.event2, alt: { he: 'תמונה 2', en: 'Image 2' } },
  { src: IMG.event3, alt: { he: 'תמונה 3', en: 'Image 3' } },
  { src: IMG.event4, alt: { he: 'תמונה 4', en: 'Image 4' } },
  { src: IMG.atmosphere1, alt: { he: 'תמונה 5', en: 'Image 5' } },
  { src: IMG.atmosphere2, alt: { he: 'תמונה 6', en: 'Image 6' } },
];
"""
    data = data.replace("const CATEGORIES =", gallery + "\nconst CATEGORIES =", 1)
    data = data.replace("{ IMG, CATEGORIES,", "{ IMG, GALLERY, CATEGORIES,", 1)
    data = data.replace("Lis Patisserie", "ZIS").replace("ליס", "זיס")
    data = data.replace("משלוח לכל הארץ", "משלוח עד הבית").replace("Nationwide", "Home delivery")
    data = data.replace("מירושלים", "לערים פעילות").replace("From Jerusalem", "In active cities")
    data = data.replace("בכשרות בד״ץ העדה החרדית · ירושלים", "זיס · קינוחים בעבודת יד")
    data = data.replace("חינם מעל 2,500₪", "מחיר לפי אזור").replace("Free over ₪2,500", "Price by area")
    encode_asset(manifest[DATA], data)
    sections = decode_asset(manifest[SECTIONS])
    start = sections.index("function Logo(")
    end = sections.index("\n//", start)
    sections = sections[:start] + '''function Logo({ size = 28, tone = 'dark' }) {
  return <a href="#top" className={`logo logo-${tone}`} aria-label="זיס — לדף הבית">
    <img src={`./assets/zis-logo-${tone}.png`} alt="זיס — איכות שנותנת טעם"
      width="948" height="693" style={{ width: size === 36 ? 156 : 104 }} />
  </a>;
}
''' + sections[end:]
    sections = replace_function(sections, "Gallery", "Brands", (ROOT / "scripts" / "preview-gallery.jsx").read_text(encoding="utf-8") + "\n")
    sections = replace_function(sections, "Footer", "MobileTabBar", '''function Footer() {
  const { lang, t } = U.useLang();
  return <footer className="footer">
    <div className="container footer-grid">
      <div className="footer-brand"><Logo size={36} tone="light" />
        <p>{lang === 'he' ? 'זיס · קינוחים בעבודת יד' : 'ZIS · Handmade desserts'}</p>
      </div>
      <nav aria-label={lang === 'he' ? 'ניווט תחתון' : 'Footer navigation'}>
        <h5>{lang === 'he' ? 'ניווט' : 'Navigate'}</h5>
        <ul><li><a href="#products">{t.nav.catalog}</a></li>
          <li><a href="#events">{t.nav.events}</a></li>
          <li><a href="#gallery">{lang === 'he' ? 'גלריה' : 'Gallery'}</a></li>
          <li><a href="#faq">{t.nav.faq}</a></li></ul>
      </nav>
    </div>
    <div className="container footer-bottom"><span>© 2026 ZIS</span></div>
  </footer>;
}

''')
    sections = sections.replace("    { id: 'contact', label: t.nav.contact },\n", "")
    sections = sections.replace('href="#contact"', 'href="#events"')
    sections = sections.replace(" style={{ transform: 'scale(0.9)', transformOrigin: 'top center', marginBottom: '-10vh' }}", '')
    sections = re.sub(r'\s*<div className="hero-feature">\s*<span className="hero-feat-icon"><U.Icon.check /></span>.*?</div>', '', sections, count=1, flags=re.S)
    sections = re.sub(r'\s*<div className="hero-badge">.*?</div>', '', sections, count=1, flags=re.S)
    sections = sections.replace('משלוח לכל הארץ', 'משלוח עד הבית').replace('Nationwide', 'Home delivery')
    sections = sections.replace('מירושלים', 'באזורים הפעילים').replace('From Jerusalem', 'In active areas')
    sections = re.sub(r'\s*<button className="cart-trigger".*?</button>', '', sections, count=1, flags=re.S)
    sections = re.sub(r"\s*\{ id: 'cart', he: 'סל'.*?\},\n", "\n", sections, count=1)
    sections = sections.replace('<U.ParallaxImg src={p.img} ratio="4/5" amount={0.08} />', '<U.ParallaxImg src={p.img} alt={p[lang].name} ratio="4/5" amount={0} />')
    sections = sections.replace('<U.ParallaxImg src={p.img} ratio="5/4" amount={0.12} />', '<U.ParallaxImg src={p.img} alt={p[lang].name} ratio="5/4" amount={0} />')
    sections = re.sub(r'<button className="lbtn lbtn-primary lbtn-md" onClick=\{\(e\) => \{ e.stopPropagation\(\); addItem\(p\); \}\}>.*?</button>', '<span className="card-more">{lang === \'he\' ? \'עוד…\' : \'More…\'}</span>', sections, count=1, flags=re.S)
    sections = re.sub(r'<button className="lbtn lbtn-primary lbtn-md" onClick=\{\(e\) => \{ e.stopPropagation\(\); addPackage\(p\); \}\}>.*?</button>', '<span className="card-more">{lang === \'he\' ? \'עוד…\' : \'More…\'}</span>', sections, count=1, flags=re.S)
    sections = re.sub(r'<button className="lbtn lbtn-primary lbtn-lg" onClick=\{\(\) => \{ addItem\(selectedProduct\).*?</button>', '', sections, count=1, flags=re.S)
    sections = re.sub(r'<button className="lbtn lbtn-primary lbtn-lg" onClick=\{\(\) => \{ addPackage\(selectedPackage\).*?</button>', '', sections, count=1, flags=re.S)
    sections = sections.replace('onClick={() => setSelectedProduct(p)} style={{ cursor:', 'onClick={() => setSelectedProduct(p)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedProduct(p); } }} role="button" tabIndex={0} style={{ cursor:')
    sections = sections.replace('onClick={() => setSelectedPackage(p)} style={{ cursor:', 'onClick={() => setSelectedPackage(p)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPackage(p); } }} role="button" tabIndex={0} style={{ cursor:')
    tab_start = sections.index('function MobileTabBar()')
    tab_end = sections.index('window.LIS_SECTIONS', tab_start)
    sections = sections[:tab_start] + '''function MobileTabBar() {
  const { lang } = U.useLang();
  const tabs = [
    { id: 'home', he: 'בית', en: 'Home', icon: U.Icon.home, href: '#top' },
    { id: 'catalog', he: 'קטלוג', en: 'Catalogue', icon: U.Icon.grid, href: '#products' },
    { id: 'gallery', he: 'גלריה', en: 'Gallery', icon: U.Icon.grid, href: '#gallery' },
  ];
  return <nav className="mtab" aria-label={lang === 'he' ? 'ניווט נייד' : 'Mobile navigation'}>
    <div className="mtab-row">{tabs.map(tb => <a key={tb.id} className="mtab-btn" href={tb.href}>
      <tb.icon /><span>{tb[lang]}</span>
    </a>)}</div>
  </nav>;
}

''' + sections[tab_end:]
    encode_asset(manifest[SECTIONS], sections)

    app = '''const A = window.LIS_UI;
const { Header, Hero, ProductsGrid, Packages, Gallery, FaqSection, Footer, MobileTabBar } = window.LIS_SECTIONS;
function App() {
  return <A.LangProvider><A.CartProvider>
    <Header />
    <main><Hero /><ProductsGrid /><Packages /><Gallery /><FaqSection /></main>
    <Footer /><MobileTabBar />
  </A.CartProvider></A.LangProvider>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
'''
    encode_asset(manifest[APP], app)
    template = read_block(source, "template")
    template = re.sub(r"<title>.*?</title>", "<title>זיס — תצוגה לבדיקה</title>", template)
    template = template.replace("</head>", '<link rel="stylesheet" href="./review.css"></head>')
    source = write_block(source, "manifest", manifest)
    source = write_block(source, "template", template)
    (PREVIEW / "index.html").write_text(source, encoding="utf-8")
    print("Built prototypes/zis-review/index.html from Lis-standalone.html")


def read_block(source, name):
    pattern = rf'<script type="__bundler/{name}">(.*?)</script>'
    return json.loads(re.search(pattern, source, re.S).group(1))


def export_images(manifest, resources):
    mapping = {}
    for resource in resources:
        if not resource["id"].startswith("img"):
            continue
        key = re.sub(r"(?<!^)(?=[A-Z])", "_", resource["id"]).lower()
        filename = f"standalone-{key}.jpg"
        entry = manifest[resource["uuid"]]
        data = base64.b64decode(entry["data"])
        (PREVIEW / "assets" / filename).write_bytes(gzip.decompress(data) if entry.get("compressed") else data)
        mapping[key] = f"./assets/{filename}"
    return mapping


def replace_function(source, start_name, next_name, replacement):
    start = source.index(f"function {start_name}(")
    end = source.index(f"function {next_name}(", start)
    return source[:start] + replacement + source[end:]


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
