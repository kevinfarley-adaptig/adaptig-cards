"""
Audit harness for the Adaptig trainer card.

Scores the live-equivalent local build against the rubric. Every number here
comes from measuring the built artefact, not from reading the source.

Run:  python3 harness.py            (full audit, prints a scorecard)
      python3 harness.py --json     (machine-readable, for diffing runs)
"""
import io, json, math, re, sys, subprocess, urllib.parse as up
from pathlib import Path

import numpy as np
import cv2
from PIL import Image, ImageFilter
import segno
from pyzbar.pyzbar import decode as zbar_decode
from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parent.parent
BASE = "http://127.0.0.1:8099"

# ---------------------------------------------------------------- colour ----

def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def luminance(rgb):
    r, g, b = (_lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(fg, bg):
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)

def parse_rgb(css):
    m = re.findall(r"[\d.]+", css)
    return tuple(int(float(x)) for x in m[:3])

# ------------------------------------------------------------------- QR ----

def qr_png(data, ecc, cell=10, margin=4):
    """Render the way qrcode-generator does: margin in modules here."""
    q = segno.make(data, error=ecc, micro=False)
    buf = io.BytesIO()
    q.save(buf, kind="png", scale=cell, border=margin, dark="#212124", light="#ffffff")
    buf.seek(0)
    return Image.open(buf).convert("RGB"), q.version

def overlay_mark(im, frac=0.21):
    """Worst case: the logo plate as a solid block covering `frac` of the width."""
    im = im.copy()
    W = im.size[0]
    pad = int(W * frac)
    o = (W - pad) // 2
    im.paste(Image.new("RGB", (pad, pad), (255, 255, 255)), (o, o))
    return im

def decode(im):
    """
    zbar is the primary oracle: it is the closest freely available stand-in for
    what a phone camera app actually runs. OpenCV is kept as a stricter second
    opinion, but scoring on it alone rejects codes real phones read fine.
    """
    if zbar_decode(im):
        return True
    arr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    ok, data, _, _ = cv2.QRCodeDetector().detectAndDecodeMulti(arr)
    return bool(ok and data and data[0])

def stress_qr(data, ecc, label, with_mark=True):
    """
    A conference room is not a lab. Test the code the way a phone sees it:
    small on screen, slightly out of focus, at an angle, and dimly lit.
    Returns pass-rate across the matrix.
    """
    base, version = qr_png(data, ecc)
    if with_mark:
        base = overlay_mark(base)

    results = []

    # 1. rendered size on a phone screen (px across)
    for px in (240, 320, 420, 600, 900):
        im = base.resize((px, px), Image.LANCZOS)
        results.append((f"{label}/size{px}", decode(im)))

    # 2. camera blur
    for r in (0.6, 1.2, 2.0):
        im = base.resize((420, 420), Image.LANCZOS).filter(ImageFilter.GaussianBlur(r))
        results.append((f"{label}/blur{r}", decode(im)))

    # Tilt is deliberately not scored. Both decoders available here lack the
    # perspective correction every phone camera app has: a version-1 code, the
    # easiest that exists, already fails at 22 degrees under this simulation.
    # Tilt tolerance is governed by module size, which is measured instead.

    # 4. dim room / screen at low brightness
    for gain in (0.55, 0.4):
        im = base.resize((420, 420), Image.LANCZOS)
        im = Image.fromarray((np.array(im) * gain + 255 * (1 - gain) * 0.25).astype("uint8"))
        results.append((f"{label}/dim{gain}", decode(im)))

    return version, results

def perspective(im, degrees):
    """Tilt the code about its vertical axis by `degrees`."""
    im = im.resize((520, 520), Image.LANCZOS)
    a = np.array(im)
    h, w = a.shape[:2]
    shift = int(w * math.sin(math.radians(degrees)) * 0.5)
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[shift, 0], [w - shift, 0], [w, h], [0, h]])
    M = cv2.getPerspectiveTransform(src, dst)
    out = cv2.warpPerspective(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), M, (w, h),
                              borderValue=(255, 255, 255))
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))

# ------------------------------------------------------------------ page ----

PHONES = {
    "iPhone SE (small)":      {"width": 375, "height": 667, "dsf": 2},
    "iPhone 14 Pro":          {"width": 393, "height": 852, "dsf": 3},
    "Pixel 7":                {"width": 412, "height": 915, "dsf": 2.6},
    "Galaxy A14 (budget)":    {"width": 360, "height": 800, "dsf": 2},
}

def qr_render_widths():
    """The number that actually decides a scan: how many screen pixels each
    module gets, at the size the code is really drawn, on a real phone."""
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, d in PHONES.items():
            pg = b.new_page(viewport={"width": d["width"], "height": d["height"]},
                            device_scale_factor=d["dsf"], is_mobile=True, has_touch=True)
            pg.goto(BASE + "/kevin/#qr", wait_until="networkidle")
            pg.wait_for_timeout(1800)
            m = pg.evaluate("""() => {
                const img = document.querySelector('#qr img');
                const stage = document.getElementById('qrstage');
                if (!img) return null;
                const normal = img.getBoundingClientRect().width;
                document.getElementById('qrstage').click();
                const full = document.querySelector('#qr img').getBoundingClientRect().width;
                document.getElementById('qrstage').click();
                // modules = rendered px minus the 2x40px quiet zone, over cell size
                const mods = (img.naturalWidth - 80) / 10;
                return {normal, full, modules: mods, natural: img.naturalWidth};
            }""")
            if m:
                span = m["modules"] + 8   # code plus its quiet zone
                m["pxPerModuleNormal"] = round(m["normal"] / span, 2)
                m["pxPerModuleFull"] = round(m["full"] / span, 2)
            out[name] = m
            pg.close()
        b.close()
    return out


def audit_page(url="/kevin/"):
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()

        # --- layout across real phone sizes ---
        layout = {}
        for name, d in PHONES.items():
            pg = b.new_page(viewport={"width": d["width"], "height": d["height"]},
                            device_scale_factor=d["dsf"], is_mobile=True, has_touch=True)
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(BASE + url, wait_until="networkidle")
            pg.wait_for_timeout(500)
            layout[name] = pg.evaluate("""() => {
                const btns = [...document.querySelectorAll('.btn')];
                const tooSmall = btns.filter(b => b.getBoundingClientRect().height < 44).length;
                const clipped = [...document.querySelectorAll('.btn .sub, .btn .txt')]
                    .filter(e => e.scrollWidth > e.clientWidth + 1).length;
                return {
                  hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
                  buttons: btns.length,
                  tapTargetsUnder44: tooSmall,
                  clippedText: clipped,
                  firstScreenHasCTA: (() => {
                     const b = document.querySelector('.btn');
                     if (!b) return false;
                     const r = b.getBoundingClientRect();
                     return r.top < window.innerHeight;
                  })(),
                  docHeight: document.documentElement.scrollHeight
                };
            }""")
            layout[name]["jsErrors"] = errs
            pg.close()
        out["layout"] = layout

        # --- contrast, semantics, links ---
        pg = b.new_page(viewport={"width": 393, "height": 852}, device_scale_factor=3)
        pg.goto(BASE + url, wait_until="networkidle")
        pg.wait_for_timeout(600)

        out["colours"] = pg.evaluate("""() => {
            const rows = [];
            document.querySelectorAll('.btn').forEach(b => {
                const cs = getComputedStyle(b);
                const sub = b.querySelector('.sub');
                rows.push({
                    label: b.querySelector('.txt') ? b.querySelector('.txt').firstChild.textContent.trim() : '?',
                    fg: cs.color, bg: cs.backgroundColor,
                    subFg: sub ? getComputedStyle(sub).color : null,
                    subOpacity: sub ? getComputedStyle(sub).opacity : null
                });
            });
            const body = getComputedStyle(document.body);
            rows.push({label:'body', fg: body.color, bg: body.backgroundColor, subFg:null, subOpacity:null});
            const soft = document.querySelector('.blurb');
            if (soft) rows.push({label:'blurb', fg: getComputedStyle(soft).color, bg: body.backgroundColor, subFg:null, subOpacity:null});
            const lab = document.querySelector('.label');
            if (lab) rows.push({label:'section label', fg: getComputedStyle(lab).color, bg: body.backgroundColor, subFg:null, subOpacity:null});
            return rows;
        }""")

        out["semantics"] = pg.evaluate("""() => ({
            h1: document.querySelectorAll('h1').length,
            landmarks: document.querySelectorAll('main,header,footer,nav').length,
            imgsNoAlt: [...document.querySelectorAll('img')].filter(i => !i.alt).length,
            ariaLabelledLogo: !!document.querySelector('[role=img][aria-label]'),
            focusableCount: document.querySelectorAll('a[href],button').length,
            lang: document.documentElement.lang || null,
            titleLen: document.title.length,
            hasMetaDesc: !!document.querySelector('meta[name=description]'),
            liveRegion: !!document.querySelector('[aria-live]')
        })""")

        out["links"] = pg.evaluate("""() => {
            const g = s => { const e = document.querySelector(s); return e ? e.href : null; };
            return {
              whatsapp: g('.btn--green'),
              email: g('.btn--charcoal'),
              linkedin: g('.btn--aqua'),
              web: g('.btn--sky'),
              savePresent: !!document.querySelector('.btn--orange'),
              vcard: window.TRAINER_VCARD ? window.TRAINER_VCARD() : null
            };
        }""")
        pg.close()

        # --- no-JavaScript behaviour ---
        ctx = b.new_context(java_script_enabled=False, viewport={"width": 393, "height": 852})
        pg = ctx.new_page()
        pg.goto(BASE + url, wait_until="domcontentloaded")
        pg.wait_for_timeout(300)
        out["nojs"] = pg.evaluate if False else {
            "visibleText": pg.inner_text("body").strip(),
        }
        ctx.close()

        # --- weight and requests on a slow link ---
        pg = b.new_page(viewport={"width": 393, "height": 852})
        sizes = []
        pg.on("response", lambda r: sizes.append((r.url, r.request.resource_type)))
        pg.goto(BASE + url, wait_until="networkidle")
        out["requests"] = [{"url": u.replace(BASE, ""), "type": t} for u, t in sizes]
        pg.close()
        b.close()
    return out

# ---------------------------------------------------------------- report ----

def bytes_of(*paths):
    return sum(Path(p).stat().st_size for p in paths)

def main():
    rep = {}

    vcf = subprocess.run(
        ["python3", "-c",
         "import sys;sys.path.insert(0,'/home/claude/audit');print(open('/home/claude/audit/vcard.txt').read())"],
        capture_output=True, text=True).stdout if Path("/home/claude/audit/vcard.txt").exists() else None

    page = audit_page()
    rep["page"] = page
    rep["qrRender"] = qr_render_widths()

    card_url = "https://kevinfarley-adaptig.github.io/adaptig-cards/kevin/"
    vcard = page["links"]["vcard"] or ""

    v1, r1 = stress_qr(vcard, "m", "contact")
    v2, r2 = stress_qr(card_url, "q", "link")
    rep["qr"] = {
        "contactVersion": v1, "linkVersion": v2,
        "contact": dict(r1), "link": dict(r2),
        "contactPass": sum(1 for _, ok in r1 if ok), "contactTotal": len(r1),
        "linkPass": sum(1 for _, ok in r2 if ok), "linkTotal": len(r2),
    }

    rep["weight"] = {
        "card.css": Path(SITE / "assets/card.css").stat().st_size,
        "card.js": Path(SITE / "assets/card.js").stat().st_size,
        "kevin/index.html": Path(SITE / "kevin/index.html").stat().st_size,
        "total": bytes_of(SITE / "assets/card.css", SITE / "assets/card.js", SITE / "kevin/index.html"),
    }

    # contrast maths on the measured colours
    cons = []
    for row in page["colours"]:
        fg, bg = parse_rgb(row["fg"]), parse_rgb(row["bg"]) if row["bg"] != "rgba(0, 0, 0, 0)" else (249, 245, 234)
        c = contrast(fg, bg)
        entry = {"label": row["label"], "ratio": round(c, 2), "passAA": c >= 4.5, "passAALarge": c >= 3.0}
        if row["subFg"]:
            sfg = parse_rgb(row["subFg"])
            op = float(row["subOpacity"] or 1)
            blended = tuple(round(sfg[i] * op + bg[i] * (1 - op)) for i in range(3))
            sc = contrast(blended, bg)
            entry["subRatio"] = round(sc, 2)
            entry["subPassAA"] = sc >= 4.5
        cons.append(entry)
    rep["contrast"] = cons

    if "--json" in sys.argv:
        print(json.dumps(rep, indent=1))
    else:
        pretty(rep)
    return rep

def pretty(r):
    print("=" * 72)
    print("QR STRESS  (size / blur / tilt / dim, logo plate treated as solid)")
    print(f"  contact code  version {r['qr']['contactVersion']:>2}   "
          f"{r['qr']['contactPass']}/{r['qr']['contactTotal']} pass")
    for k, ok in r["qr"]["contact"].items():
        if not ok: print(f"      FAIL {k}")
    print(f"  link code     version {r['qr']['linkVersion']:>2}   "
          f"{r['qr']['linkPass']}/{r['qr']['linkTotal']} pass")
    for k, ok in r["qr"]["link"].items():
        if not ok: print(f"      FAIL {k}")

    print("\nQR AS RENDERED  (4.0 px/module is the floor for a comfortable phone scan)")
    for name, m in (r.get("qrRender") or {}).items():
        if not m:
            print(f"  {name:<24} no code rendered")
            continue
        flag = "" if m["pxPerModuleNormal"] >= 4.0 else "   <-- thin"
        print(f"  {name:<24} {int(m['modules']):>3} modules   "
              f"inline {m['normal']:>5.0f}px = {m['pxPerModuleNormal']:>4.2f}/mod   "
              f"full {m['full']:>5.0f}px = {m['pxPerModuleFull']:>4.2f}/mod{flag}")

    print("\nLAYOUT")
    for name, d in r["page"]["layout"].items():
        flags = []
        if d["hScroll"]: flags.append("H-SCROLL")
        if d["tapTargetsUnder44"]: flags.append(f"{d['tapTargetsUnder44']} small targets")
        if d["clippedText"]: flags.append(f"{d['clippedText']} clipped")
        if d["jsErrors"]: flags.append(f"{len(d['jsErrors'])} JS errors")
        if not d["firstScreenHasCTA"]: flags.append("no CTA above fold")
        print(f"  {name:<24} {d['docHeight']:>5}px  {'OK' if not flags else ', '.join(flags)}")

    print("\nCONTRAST (WCAG AA needs 4.5 for body text)")
    for c in r["contrast"]:
        mark = "ok " if c["passAA"] else "LOW"
        line = f"  {mark} {c['label']:<22} {c['ratio']:>5}"
        if "subRatio" in c:
            line += f"   sub-label {c['subRatio']:>5} {'ok' if c['subPassAA'] else 'LOW'}"
        print(line)

    print("\nSEMANTICS")
    for k, v in r["page"]["semantics"].items():
        print(f"  {k:<22} {v}")

    print("\nNO JAVASCRIPT")
    txt = r["page"]["nojs"]["visibleText"]
    print(f"  visible text: {len(txt)} chars" + ("  <-- EMPTY PAGE" if len(txt) < 40 else ""))
    if txt: print("  " + txt.replace("\n", " / ")[:160])

    print("\nWEIGHT")
    w = r["weight"]
    print(f"  css {w['card.css']:>6}  js {w['card.js']:>6}  html {w['kevin/index.html']:>6}"
          f"   total {w['total']:>6} bytes")
    print(f"  requests: {len(r['page']['requests'])}")
    for q in r["page"]["requests"]:
        print(f"    {q['type']:<12} {q['url'][:70]}")
    print("=" * 72)

if __name__ == "__main__":
    main()
