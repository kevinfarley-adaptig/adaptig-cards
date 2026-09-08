/* Adaptig trainer card — QR encoder.

   Byte mode, versions 1 to 20, correction levels L/M/Q/H. Enough for every
   payload this card produces and nothing more.

   It is here rather than on a CDN for three reasons: some of the networks
   these cards get used on block third-party script hosts, a card that cannot
   draw its own code is useless at the moment it is needed, and a bundled file
   can actually be tested. Every matrix this produces is checked module for
   module against a reference encoder before release.

   Implements ISO/IEC 18004. MIT-style: use it, no warranty.
*/
(function (global) {
  "use strict";

  /* Tables from ISO/IEC 18004, emitted from a reference encoder.
     Versions 1 to 20, which covers every payload this card produces.
     B[v][lvl] = [[blocks, totalCodewords, dataCodewords], ...] per group. */
  var B=[[[[1,26,19]],[[1,26,16]],[[1,26,13]],[[1,26,9]]],[[[1,44,34]],[[1,44,28]],[[1,44,22]],[[1,44,16]]],[[[1,70,55]],[[1,70,44]],[[2,35,17]],[[2,35,13]]],[[[1,100,80]],[[2,50,32]],[[2,50,24]],[[4,25,9]]],[[[1,134,108]],[[2,67,43]],[[2,33,15],[2,34,16]],[[2,33,11],[2,34,12]]],[[[2,86,68]],[[4,43,27]],[[4,43,19]],[[4,43,15]]],[[[2,98,78]],[[4,49,31]],[[2,32,14],[4,33,15]],[[4,39,13],[1,40,14]]],[[[2,121,97]],[[2,60,38],[2,61,39]],[[4,40,18],[2,41,19]],[[4,40,14],[2,41,15]]],[[[2,146,116]],[[3,58,36],[2,59,37]],[[4,36,16],[4,37,17]],[[4,36,12],[4,37,13]]],[[[2,86,68],[2,87,69]],[[4,69,43],[1,70,44]],[[6,43,19],[2,44,20]],[[6,43,15],[2,44,16]]],[[[4,101,81]],[[1,80,50],[4,81,51]],[[4,50,22],[4,51,23]],[[3,36,12],[8,37,13]]],[[[2,116,92],[2,117,93]],[[6,58,36],[2,59,37]],[[4,46,20],[6,47,21]],[[7,42,14],[4,43,15]]],[[[4,133,107]],[[8,59,37],[1,60,38]],[[8,44,20],[4,45,21]],[[12,33,11],[4,34,12]]],[[[3,145,115],[1,146,116]],[[4,64,40],[5,65,41]],[[11,36,16],[5,37,17]],[[11,36,12],[5,37,13]]],[[[5,109,87],[1,110,88]],[[5,65,41],[5,66,42]],[[5,54,24],[7,55,25]],[[11,36,12],[7,37,13]]],[[[5,122,98],[1,123,99]],[[7,73,45],[3,74,46]],[[15,43,19],[2,44,20]],[[3,45,15],[13,46,16]]],[[[1,135,107],[5,136,108]],[[10,74,46],[1,75,47]],[[1,50,22],[15,51,23]],[[2,42,14],[17,43,15]]],[[[5,150,120],[1,151,121]],[[9,69,43],[4,70,44]],[[17,50,22],[1,51,23]],[[2,42,14],[19,43,15]]],[[[3,141,113],[4,142,114]],[[3,70,44],[11,71,45]],[[17,47,21],[4,48,22]],[[9,39,13],[16,40,14]]],[[[3,135,107],[5,136,108]],[[3,67,41],[13,68,42]],[[15,54,24],[5,55,25]],[[15,43,15],[10,44,16]]]];
  var AL=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90]];
  var FMT=[[30660,29427,32170,30877,26159,25368,27713,26998],[21522,20773,24188,23371,17913,16590,20375,19104],[13663,12392,16177,14854,9396,8579,11994,11245],[5769,5054,7399,6608,1890,597,3340,2107]];
  var VER=[0,0,0,0,0,0,31892,34236,39577,42195,48118,51042,55367,58893,63784,68472,70749,76311,79154,84390];

  /* ---------- GF(256), primitive polynomial 0x11D ---------- */

  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1, i;
    for (i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function generator(degree) {
    var g = [1];
    for (var i = 0; i < degree; i++) {
      var next = new Array(g.length + 1);
      for (var k = 0; k < next.length; k++) next[k] = 0;
      for (var j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = next;
    }
    return g;
  }

  function ecc(data, ecLen) {
    var gen = generator(ecLen);
    var res = new Array(data.length + ecLen);
    for (var i = 0; i < res.length; i++) res[i] = i < data.length ? data[i] : 0;
    for (i = 0; i < data.length; i++) {
      var f = res[i];
      if (f !== 0) for (var j = 0; j < gen.length; j++) res[i + j] ^= mul(gen[j], f);
    }
    return res.slice(data.length);
  }

  /* ---------- bit buffer ---------- */

  function Bits() { this.buf = []; this.len = 0; }
  Bits.prototype.put = function (num, length) {
    for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
  };
  Bits.prototype.putBit = function (bit) {
    var i = Math.floor(this.len / 8);
    if (this.buf.length <= i) this.buf.push(0);
    if (bit) this.buf[i] |= 0x80 >>> (this.len % 8);
    this.len++;
  };

  function utf8(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c < 0xd800 || c >= 0xe000) { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
      else {
        i++;
        c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    }
    return out;
  }

  var LEVEL = { L: 0, M: 1, Q: 2, H: 3 };

  function dataCapacity(version, lvl) {
    var groups = B[version - 1][lvl], n = 0;
    for (var i = 0; i < groups.length; i++) n += groups[i][0] * groups[i][2];
    return n;
  }

  function countBits(version) { return version < 10 ? 8 : 16; }

  /* ---------- codewords ---------- */

  function codewords(bytes, version, lvl) {
    var total = dataCapacity(version, lvl);
    var bits = new Bits();
    bits.put(4, 4);                          // byte mode
    bits.put(bytes.length, countBits(version));
    for (var i = 0; i < bytes.length; i++) bits.put(bytes[i], 8);

    var cap = total * 8;
    for (i = 0; i < 4 && bits.len < cap; i++) bits.putBit(false);   // terminator
    while (bits.len % 8 !== 0) bits.putBit(false);

    var out = bits.buf.slice();
    var pad = [0xEC, 0x11], p = 0;
    while (out.length < total) out.push(pad[p++ % 2]);

    // Split into blocks, generate error correction, then interleave both.
    var groups = B[version - 1][lvl];
    var blocks = [], off = 0, maxData = 0, maxEc = 0;
    for (var g = 0; g < groups.length; g++) {
      var count = groups[g][0], totalCw = groups[g][1], dataCw = groups[g][2];
      for (var b = 0; b < count; b++) {
        var d = out.slice(off, off + dataCw); off += dataCw;
        var e = ecc(d, totalCw - dataCw);
        blocks.push({ d: d, e: e });
        if (d.length > maxData) maxData = d.length;
        if (e.length > maxEc) maxEc = e.length;
      }
    }
    var seq = [];
    for (i = 0; i < maxData; i++)
      for (b = 0; b < blocks.length; b++)
        if (i < blocks[b].d.length) seq.push(blocks[b].d[i]);
    for (i = 0; i < maxEc; i++)
      for (b = 0; b < blocks.length; b++)
        if (i < blocks[b].e.length) seq.push(blocks[b].e[i]);
    return seq;
  }

  /* ---------- matrix ---------- */

  function build(version, lvl, seq, mask) {
    var size = version * 4 + 17;
    var m = [], reserved = [], r, c;
    for (r = 0; r < size; r++) {
      m.push(new Array(size).fill(0));
      reserved.push(new Array(size).fill(0));
    }
    function set(rr, cc, v) { m[rr][cc] = v ? 1 : 0; reserved[rr][cc] = 1; }

    // finder patterns and their separators
    [[0, 0], [size - 7, 0], [0, size - 7]].forEach(function (p) {
      for (r = -1; r <= 7; r++) for (c = -1; c <= 7; c++) {
        var rr = p[0] + r, cc = p[1] + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        set(rr, cc, on);
      }
    });

    // timing patterns
    for (var i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }

    // alignment patterns, skipping the three that clash with finders
    var pos = AL[version - 1];
    for (var a = 0; a < pos.length; a++) for (var b2 = 0; b2 < pos.length; b2++) {
      var ar = pos[a], ac = pos[b2];
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 9) || (ar >= size - 9 && ac <= 8)) continue;
      for (r = -2; r <= 2; r++) for (c = -2; c <= 2; c++)
        set(ar + r, ac + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
    }

    // dark module, then reserve the format and version areas
    set(size - 8, 8, true);
    for (i = 0; i <= 8; i++) {
      if (!reserved[8][i]) reserved[8][i] = 1;
      if (!reserved[i][8]) reserved[i][8] = 1;
    }
    for (i = 0; i < 8; i++) { reserved[8][size - 1 - i] = 1; reserved[size - 1 - i][8] = 1; }
    if (version >= 7) {
      for (i = 0; i < 6; i++) for (var j = 0; j < 3; j++) {
        reserved[size - 11 + j][i] = 1; reserved[i][size - 11 + j] = 1;
      }
    }

    // data, bottom-right upward in a two-module-wide boustrophedon
    var bit = 0, dir = -1, row = size - 1;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;                       // the vertical timing column
      while (true) {
        for (var k = 0; k < 2; k++) {
          var cc2 = col - k;
          if (!reserved[row][cc2]) {
            var dark = false;
            if (bit < seq.length * 8) dark = ((seq[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1;
            if (maskFn(mask, row, cc2)) dark = !dark;
            m[row][cc2] = dark ? 1 : 0;
            bit++;
          }
        }
        row += dir;
        if (row < 0 || row >= size) { row -= dir; dir = -dir; break; }
      }
    }

    // format information, both copies
    var fmt = FMT[lvl][mask];
    for (i = 0; i < 15; i++) {
      var on = ((fmt >> i) & 1) === 1;
      if (i < 6) m[i][8] = on ? 1 : 0;
      else if (i < 8) m[i + 1][8] = on ? 1 : 0;
      else m[size - 15 + i][8] = on ? 1 : 0;
      if (i < 8) m[8][size - 1 - i] = on ? 1 : 0;
      else if (i < 9) m[8][15 - i - 1 + 1] = on ? 1 : 0;
      else m[8][15 - i - 1] = on ? 1 : 0;
    }
    m[size - 8][8] = 1;

    if (version >= 7) {
      var vi = VER[version - 1];
      for (i = 0; i < 18; i++) {
        var vb = ((vi >> i) & 1) === 1 ? 1 : 0;
        m[Math.floor(i / 3)][size - 11 + (i % 3)] = vb;
        m[size - 11 + (i % 3)][Math.floor(i / 3)] = vb;
      }
    }
    return m;
  }

  function maskFn(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
    return false;
  }

  /* ---------- mask penalty, the four rules from the spec ---------- */

  function penalty(m) {
    var n = m.length, score = 0, r, c, i, run, dark = 0;

    for (r = 0; r < n; r++) {
      run = 1;
      for (c = 1; c < n; c++) {
        if (m[r][c] === m[r][c - 1]) { run++; }
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
    for (c = 0; c < n; c++) {
      run = 1;
      for (r = 1; r < n; r++) {
        if (m[r][c] === m[r - 1][c]) { run++; }
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }

    for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) {
      var s = m[r][c] + m[r][c + 1] + m[r + 1][c] + m[r + 1][c + 1];
      if (s === 0 || s === 4) score += 3;
    }

    var pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function match(get, len) {
      var hits = 0;
      for (var s2 = 0; s2 + 11 <= len; s2++) {
        var ok1 = true, ok2 = true;
        for (var k = 0; k < 11; k++) {
          var v = get(s2 + k);
          if (v !== pat1[k]) ok1 = false;
          if (v !== pat2[k]) ok2 = false;
        }
        if (ok1) hits++;
        if (ok2) hits++;
      }
      return hits;
    }
    for (r = 0; r < n; r++) score += 40 * match(function (i2) { return m[r][i2]; }, n);
    for (c = 0; c < n; c++) score += 40 * match(function (i2) { return m[i2][c]; }, n);

    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (m[r][c]) dark++;
    var pct = (dark * 100) / (n * n);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  /* ---------- public ---------- */

  function make(text, level) {
    var lvl = LEVEL[(level || "Q").toUpperCase()];
    if (lvl === undefined) lvl = LEVEL.Q;
    var bytes = utf8(String(text));
    var version = 0;
    for (var v = 1; v <= B.length; v++) {
      var cap = dataCapacity(v, lvl) * 8;
      if (4 + countBits(v) + bytes.length * 8 <= cap) { version = v; break; }
    }
    if (!version) throw new Error("Too much data for this encoder (max version " + B.length + ")");

    var seq = codewords(bytes, version, lvl);
    var best = null, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      var m = build(version, lvl, seq, mask);
      var s = penalty(m);
      if (s < bestScore) { bestScore = s; best = m; }
    }
    return {
      version: version,
      size: best.length,
      modules: best,
      isDark: function (r, c) { return best[r][c] === 1; }
    };
  }

  /* Render as a data-URI GIF so press-and-hold saves it to Photos, which a
     canvas does not reliably allow on iOS. Margin is in PIXELS. */
  function toImgSrc(qr, cell, marginPx) {
    var n = qr.size, span = n * cell + marginPx * 2;
    var cvs = document.createElement("canvas");
    cvs.width = cvs.height = span;
    var ctx = cvs.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, span, span);
    ctx.fillStyle = "#212124";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
      if (qr.isDark(r, c)) ctx.fillRect(marginPx + c * cell, marginPx + r * cell, cell, cell);
    return cvs.toDataURL("image/png");
  }

  /* Test hook: force a specific mask so the matrix can be compared against a
     reference encoder. Not used by the card itself. */
  function __test(text, level, mask) {
    if (mask === null || mask === undefined) return make(text, level);
    var lvl = LEVEL[(level || "Q").toUpperCase()];
    var bytes = utf8(String(text));
    var version = 0;
    for (var v = 1; v <= B.length; v++) {
      if (4 + countBits(v) + bytes.length * 8 <= dataCapacity(v, lvl) * 8) { version = v; break; }
    }
    var m = build(version, lvl, codewords(bytes, version, lvl), mask);
    return { version: version, size: m.length, modules: m };
  }

  global.AdaptigQR = { make: make, toImgSrc: toImgSrc, __test: __test };
})(typeof window !== "undefined" ? window : this);
