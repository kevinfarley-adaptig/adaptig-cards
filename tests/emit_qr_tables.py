"""Emit the QR tables for assets/qr.js, taken from segno so they are not
retyped by hand, and sanity-checked against the values in the spec."""
import segno.consts as C
import json

L, M, Q, H = C.ERROR_LEVEL_L, C.ERROR_LEVEL_M, C.ERROR_LEVEL_Q, C.ERROR_LEVEL_H
ORDER = [("L", L), ("M", M), ("Q", Q), ("H", H)]
MAXV = 20

# --- block structure -------------------------------------------------------
blocks = {}
for v in range(1, MAXV + 1):
    per = []
    for _, lv in ORDER:
        groups = C.ECC[v][lv]
        per.append([[g.num_blocks, g.num_total, g.num_data] for g in groups])
    blocks[v] = per

# --- alignment pattern centres --------------------------------------------
align = {1: []}
for v in range(2, MAXV + 1):
    align[v] = list(C.ALIGNMENT_POS[v - 2])

# --- format info -----------------------------------------------------------
# Spec: L=01 M=00 Q=11 H=10. segno indexes its own ints; map explicitly.
fmt = {}
for name, lv in ORDER:
    fmt[name] = [C.FORMAT_INFO[lv * 8 + m] for m in range(8)]

# --- version info (v7+) ----------------------------------------------------
ver = {v: C.VERSION_INFO[v - 7] for v in range(7, MAXV + 1)}

# Known-good spot checks straight from ISO/IEC 18004.
assert fmt["L"][0] == 0x77C4, hex(fmt["L"][0])
assert fmt["M"][0] == 0x5412, hex(fmt["M"][0])
assert fmt["Q"][0] == 0x355F, hex(fmt["Q"][0])
assert fmt["H"][0] == 0x1689, hex(fmt["H"][0])
assert ver[7] == 0x07C94, hex(ver[7])
assert blocks[1][3] == [[1, 26, 9]], blocks[1][3]      # v1-H: 1 block, 26 total, 9 data
assert blocks[5][2] == [[2, 33, 15], [2, 34, 16]], blocks[5][2]  # v5-Q: two groups

js = []
js.append("/* Tables from ISO/IEC 18004, emitted from a reference encoder.")
js.append("   Versions 1 to %d, which covers every payload this card produces." % MAXV)
js.append("   B[v][lvl] = [[blocks, totalCodewords, dataCodewords], ...] per group. */")
js.append("var B=" + json.dumps([blocks[v] for v in range(1, MAXV + 1)], separators=(",", ":")) + ";")
js.append("var AL=" + json.dumps([align[v] for v in range(1, MAXV + 1)], separators=(",", ":")) + ";")
js.append("var FMT=" + json.dumps([fmt[n] for n, _ in ORDER], separators=(",", ":")) + ";")
js.append("var VER=" + json.dumps([ver.get(v, 0) for v in range(1, MAXV + 1)], separators=(",", ":")) + ";")

open("/home/claude/audit/qr_tables.js", "w").write("\n".join(js) + "\n")
print("tables emitted, %d bytes" % len("\n".join(js)))
print("v14 Q groups:", blocks[14][2])
print("v5  Q groups:", blocks[5][2])
