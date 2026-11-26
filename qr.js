/* Pure zero-dependency ISO/IEC 18004 QR Code SVG Generator (Byte mode, Versions 1-10, ECC-M) */
(function (global) {
  'use strict';

  // GF(256) with primitive polynomial 0x11D (285)
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecCount) {
    const gen = rsGenerator(ecCount);
    const res = new Uint8Array(data.length + ecCount);
    res.set(data, 0);
    for (let i = 0; i < data.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  // Version specs for ECC Level M (1..10):
  // [totalDataCodewords, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data, alignPositions]
  const VERSIONS_M = {
    1:  [16,  10, 1, 16, 0, 0, []],
    2:  [28,  16, 1, 28, 0, 0, [6, 18]],
    3:  [44,  26, 1, 44, 0, 0, [6, 22]],
    4:  [64,  18, 2, 32, 0, 0, [6, 26]],
    5:  [86,  24, 2, 43, 0, 0, [6, 30]],
    6:  [108, 16, 4, 27, 0, 0, [6, 34]],
    7:  [124, 18, 4, 31, 0, 0, [6, 22, 38]],
    8:  [154, 22, 2, 38, 2, 39, [6, 24, 42]],
    9:  [182, 22, 3, 36, 2, 37, [6, 26, 46]],
    10: [216, 26, 4, 43, 1, 44, [6, 28, 50]]
  };

  function encodeDataBits(bytes, version) {
    const [totalData] = VERSIONS_M[version];
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };

    // Byte mode indicator (0100) + char count (8 bits for V1-9, 16 bits for V10+)
    pushBits(0b0100, 4);
    pushBits(bytes.length, version >= 10 ? 16 : 8);
    for (const b of bytes) pushBits(b, 8);

    const maxBits = totalData * 8;
    const termLen = Math.min(4, maxBits - bits.length);
    for (let i = 0; i < termLen; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const pads = [0xec, 0x11];
    let p = 0;
    while (bits.length < maxBits) {
      pushBits(pads[p % 2], 8);
      p++;
    }

    const codewords = new Uint8Array(totalData);
    for (let i = 0; i < totalData; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
      codewords[i] = byte;
    }
    return codewords;
  }

  function interleaveBlocks(dataCodewords, version) {
    const [, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = VERSIONS_M[version];
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;

    for (let i = 0; i < g1Blocks; i++) {
      const slice = dataCodewords.slice(offset, offset + g1Data);
      offset += g1Data;
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, ecPerBlock));
    }
    for (let i = 0; i < g2Blocks; i++) {
      const slice = dataCodewords.slice(offset, offset + g2Data);
      offset += g2Data;
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, ecPerBlock));
    }

    const out = [];
    const maxDataLen = Math.max(g1Data, g2Data);
    for (let col = 0; col < maxDataLen; col++) {
      for (const blk of dataBlocks) {
        if (col < blk.length) out.push(blk[col]);
      }
    }
    for (let col = 0; col < ecPerBlock; col++) {
      for (const blk of ecBlocks) {
        out.push(blk[col]);
      }
    }
    return out;
  }

  function formatInfoBits(mask) {
    // ECC M = 00
    const data = (0b00 << 3) | mask;
    let rem = data << 10;
    const poly = 0b10100110111;
    for (let i = 14; i >= 10; i--) {
      if ((rem >>> i) & 1) rem ^= poly << (i - 10);
    }
    return ((data << 10) | rem) ^ 0b101010000010010;
  }

  function versionInfoBits(version) {
    if (version < 7) return 0;
    let rem = version << 12;
    const poly = 0b1111100100101;
    for (let i = 17; i >= 12; i--) {
      if ((rem >>> i) & 1) rem ^= poly << (i - 12);
    }
    return (version << 12) | rem;
  }

  function buildBaseMatrix(version) {
    const size = version * 4 + 17;
    const grid = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
    const fixed = Array.from({ length: size }, () => new Uint8Array(size));

    function setMod(r, c, val) {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        grid[r][c] = val;
        fixed[r][c] = 1;
      }
    }

    function placeFinder(top, left) {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const r = top + dr;
          const c = left + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const isBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
          const inOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          setMod(r, c, !isBorder && (inOuter || inInner) ? 1 : 0);
        }
      }
    }

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      const bit = i % 2 === 0 ? 1 : 0;
      setMod(6, i, bit);
      setMod(i, 6, bit);
    }

    // Alignment patterns (skip only positions overlapping the 3 finder patterns)
    const align = VERSIONS_M[version][6];
    for (const r of align) {
      for (const c of align) {
        const inFinder =
          (r <= 8 && c <= 8) ||
          (r <= 8 && c >= size - 9) ||
          (r >= size - 9 && c <= 8);
        if (inFinder) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const onEdge = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setMod(r + dr, c + dc, onEdge || isCenter ? 1 : 0);
          }
        }
      }
    }

    // Dark module + reserve format info areas
    setMod(size - 8, 8, 1);
    for (let i = 0; i < 9; i++) {
      if (!fixed[8][i]) fixed[8][i] = 1;
      if (!fixed[i][8]) fixed[i][8] = 1;
    }
    for (let i = size - 8; i < size; i++) {
      fixed[8][i] = 1;
      fixed[i][8] = 1;
    }

    if (version >= 7) {
      const vBits = versionInfoBits(version);
      for (let i = 0; i < 18; i++) {
        const bit = (vBits >>> i) & 1;
        const a = Math.floor(i / 3);
        const b = size - 11 + (i % 3);
        setMod(a, b, bit);
        setMod(b, a, bit);
      }
    }

    return { size, grid, fixed };
  }

  function placeData(grid, fixed, size, codewords) {
    const bits = [];
    for (const cw of codewords) {
      for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);
    }
    let idx = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (let d = 0; d < 2; d++) {
          const c = right - d;
          if (!fixed[r][c]) {
            grid[r][c] = idx < bits.length ? bits[idx++] : 0;
          }
        }
      }
      upward = !upward;
    }
  }

  const MASK_FNS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
  ];

  function applyMaskAndFormat(base, maskId) {
    const { size, grid, fixed } = base;
    const out = grid.map((row) => Int8Array.from(row));
    const fn = MASK_FNS[maskId];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!fixed[r][c] && fn(r, c)) out[r][c] ^= 1;
      }
    }

    const fmt = formatInfoBits(maskId);
    for (let i = 0; i < 15; i++) {
      const bit = (fmt >>> i) & 1;
      // Vertical strip left of finder
      if (i < 6) out[i][8] = bit;
      else if (i < 8) out[i + 1][8] = bit;
      else out[size - 15 + i][8] = bit;

      // Horizontal strip under/right of finders
      if (i < 8) out[8][size - 1 - i] = bit;
      else if (i < 9) out[8][15 - i] = bit;
      else out[8][14 - i] = bit;
    }
    out[size - 8][8] = 1;
    return out;
  }

  function penaltyScore(m) {
    const n = m.length;
    let score = 0;

    // Rule 1: 5+ consecutive same color
    for (let r = 0; r < n; r++) {
      let runR = 1, runC = 1;
      for (let c = 1; c < n; c++) {
        if (m[r][c] === m[r][c - 1]) runR++;
        else { if (runR >= 5) score += 3 + (runR - 5); runR = 1; }
        if (m[c][r] === m[c - 1][r]) runC++;
        else { if (runC >= 5) score += 3 + (runC - 5); runC = 1; }
      }
      if (runR >= 5) score += 3 + (runR - 5);
      if (runC >= 5) score += 3 + (runC - 5);
    }

    // Rule 2: 2x2 blocks
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) {
        const v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }
    }

    // Rule 3: 1:1:3:1:1 finder-like patterns
    const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c <= n - 11; c++) {
        let m1r = true, m2r = true, m1c = true, m2c = true;
        for (let k = 0; k < 11; k++) {
          if (m[r][c + k] !== pat1[k]) m1r = false;
          if (m[r][c + k] !== pat2[k]) m2r = false;
          if (m[c + k][r] !== pat1[k]) m1c = false;
          if (m[c + k][r] !== pat2[k]) m2c = false;
        }
        if (m1r || m2r) score += 40;
        if (m1c || m2c) score += 40;
      }
    }

    // Rule 4: dark ratio
    let dark = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c] === 1) dark++;
    const pct = (dark * 100) / (n * n);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  function generateMatrix(text) {
    const bytes = new TextEncoder().encode(String(text));
    let version = 0;
    for (let v = 1; v <= 10; v++) {
      const overheadBits = 4 + (v >= 10 ? 16 : 8);
      const availBytes = Math.floor((VERSIONS_M[v][0] * 8 - overheadBits) / 8);
      if (bytes.length <= availBytes) {
        version = v;
        break;
      }
    }
    if (!version) {
      throw new Error('URL/texto demasiado largo para QR v10 (máx. ~213 bytes).');
    }

    const dataCw = encodeDataBits(bytes, version);
    const allCw = interleaveBlocks(dataCw, version);
    const base = buildBaseMatrix(version);
    placeData(base.grid, base.fixed, base.size, allCw);

    let bestMatrix = null;
    let bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
      const candidate = applyMaskAndFormat(base, m);
      const s = penaltyScore(candidate);
      if (s < bestScore) {
        bestScore = s;
        bestMatrix = candidate;
      }
    }
    return bestMatrix;
  }

  function toSVG(text, opts = {}) {
    const fg = opts.fg || '#111C1E';
    const bg = opts.bg || '#FFFFFF';
    const quiet = opts.quiet ?? 3;
    const matrix = generateMatrix(text);
    const n = matrix.length;
    const total = n + quiet * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c] === 1) {
          d += `M${c + quiet},${r + quiet}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Código QR de acceso móvil"><rect width="${total}" height="${total}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
  }

  global.QRCodeSVG = { generateMatrix, toSVG };
})(typeof window !== 'undefined' ? window : globalThis);
