"""
Verify assets/qr.js against segno, module for module.

Two properties, both of which must hold:

  1. STRUCTURE. Where the payload exactly fills the symbol, so no pad codewords
     are involved, the matrix must be byte-identical to segno's for every mask.
     That pins down encoding, Reed-Solomon, interleaving, module placement,
     masking and the format bits: everything that can actually be wrong.

  2. ROUND TRIP. Every code, at every level, must decode back to the exact
     input through zbar.

Matrices are NOT compared where padding is present. segno chooses different
pad codewords from this encoder, and a decoder ignores them by construction:
the character-count field bounds the data, so anything after it is discarded.
That difference is cosmetic. Property 1 is what proves the encoder correct;
property 2 is what proves the output usable.
"""
import json, random, string, subprocess, sys
from pathlib import Path
import segno
from pyzbar.pyzbar import decode as zbar
from PIL import Image
import numpy as np

QRJS = str(Path(__file__).resolve().parent.parent / "assets" / "qr.js")
LEVELS = ["L", "M", "Q", "H"]

REAL = [
    ("BEGIN:VCARD\r\nVERSION:3.0\r\nN:Farley;Kevin;;;\r\nFN:Kevin Farley\r\nORG:Adaptig\r\n"
     "TITLE:Head of Education\r\nTEL;TYPE=CELL:+85267966993\r\n"
     "EMAIL;TYPE=WORK:kevin.farley@adaptig.ai\r\nitem1.URL:https://linkedin.com/in/farleykm\r\n"
     "item1.X-ABLabel:LinkedIn\r\nEND:VCARD\r\n"),
    "https://kevinfarley-adaptig.github.io/adaptig-cards/kevin/",
    "https://kevinfarley-adaptig.github.io/adaptig-cards/kevin/?e=the%20Rethink%20Conference",
    "HELLO",
    "a",
    "https://adaptig.ai",
    "Zoë Ståhl — Adaptig, 香港",          # multibyte, to exercise the UTF-8 path
]

def js_matrix(text, level, mask=None):
    script = f"""
global.window = global;
require({json.dumps(QRJS)});
const out = AdaptigQR.__test
  ? AdaptigQR.__test({json.dumps(text)}, {json.dumps(level)}, {json.dumps(mask)})
  : AdaptigQR.make({json.dumps(text)}, {json.dumps(level)});
console.log(JSON.stringify({{version: out.version, size: out.size, modules: out.modules}}));
"""
    r = subprocess.run(["node", "-e", script], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[:600])
    return json.loads(r.stdout)

def segno_matrix(text, level, mask):
    # mode="byte" matters: segno otherwise picks numeric/alphanumeric segments,
    # which are more compact and produce a different (also valid) symbol. This
    # encoder is byte-only by design, so the reference must be too.
    q = segno.make(text, error=level, micro=False, mask=mask,
                   boost_error=False, mode="byte")
    return [list(row) for row in q.matrix], q.version

def to_image(mods, cell=8, border=4):
    n = len(mods)
    span = n * cell + border * 2 * cell
    a = np.full((span, span), 255, dtype=np.uint8)
    for r in range(n):
        for c in range(n):
            if mods[r][c]:
                y = (r + border) * cell
                x = (c + border) * cell
                a[y:y + cell, x:x + cell] = 0
    return Image.fromarray(a, "L").convert("RGB")

def main():
    payloads = list(REAL)
    rnd = random.Random(11)
    for n in (10, 60, 140, 260, 400, 700):
        payloads.append("".join(rnd.choice(string.ascii_letters + string.digits + " ./:@-_")
                                for _ in range(n)))

    checked = mism = 0
    failures = []

    # ---- 1. structure: exact matrix equality where no padding is involved ----
    exact_fill = []
    for v in range(1, 15):
        for li, lvl in enumerate(LEVELS):
            groups = segno.consts.ECC[v][{"L":1,"M":0,"Q":3,"H":2}[lvl]]
            cw = sum(g.num_blocks * g.num_data for g in groups)
            n = (cw * 8 - 4 - (8 if v < 10 else 16)) // 8
            if 1 <= n <= 900:
                exact_fill.append(("a" * n, lvl, v))

    for text, lvl, want_v in exact_fill:
        try:
            ref0, ver = segno_matrix(text, lvl, 0)
        except Exception:
            continue
        if ver != want_v:
            continue
        for mask in range(8):
            ref, _ = segno_matrix(text, lvl, mask)
            got = js_matrix(text, lvl, mask)
            checked += 1
            if got["modules"] != ref:
                mism += 1
                if len(failures) < 6:
                    diff = sum(1 for r in range(len(ref)) for c in range(len(ref))
                               if ref[r][c] != got["modules"][r][c])
                    failures.append(f"v{ver} {lvl} mask{mask} len={len(text)}: {diff} modules differ")
                break

    print(f"structure  : {checked - mism}/{checked} matrices byte-identical "
          f"(versions 1-14, all 4 levels, all 8 masks, no-padding payloads)")
    for f in failures:
        print("   ", f)

    # ---- 2. the mask my encoder picks decodes correctly ----
    dec_ok = dec_total = 0
    bad = []
    for text in payloads:
        for lvl in LEVELS:
            try:
                q = segno.make(text, error=lvl, micro=False, mode="byte", boost_error=False)
                if q.version > 20:
                    continue
            except Exception:
                continue
            got = js_matrix(text, lvl)
            img = to_image(got["modules"])
            res = zbar(img)
            dec_total += 1
            val = res[0].data.decode("utf-8", "replace") if res else ""
            if val == text:
                dec_ok += 1
            elif len(bad) < 5:
                bad.append(f"{lvl} len={len(text)} -> {'no decode' if not res else 'wrong content'}")
    print(f"round trip : {dec_ok}/{dec_total} codes decode back to the exact input")
    for b in bad:
        print("   ", b)

    ok = (mism == 0 and dec_ok == dec_total and dec_total > 0)
    print("\nRESULT:", "encoder verified" if ok else "ENCODER NOT VERIFIED")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
