import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import zlib from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// Paleta del manifest: emerald theme
const BG = [0x05, 0x96, 0x69, 0xff]; // #059669 opaco
const FG = [0xff, 0xff, 0xff, 0xff]; // blanco

function drawHouseIcon(size) {
  const bmp = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 192;
  const setPx = (x, y, rgba) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (y * size + x) * 4;
    bmp[idx] = rgba[0];
    bmp[idx + 1] = rgba[1];
    bmp[idx + 2] = rgba[2];
    bmp[idx + 3] = rgba[3];
  };
  const roundRect = (x0, y0, w, h, r, rgba) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = Math.min(Math.max(x, x0 + r), x0 + w - r);
        const dy = Math.min(Math.max(y, y0 + r), y0 + h - r);
        const d2 = (x - dx) ** 2 + (y - dy) ** 2;
        if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h && d2 <= r * r) {
          setPx(x, y, rgba);
        }
      }
    }
  };
  const fillTriangle = (p1, p2, p3, rgba) => {
    const [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3;
    const minX = Math.max(0, Math.floor(Math.min(x1, x2, x3)));
    const maxX = Math.min(size - 1, Math.ceil(Math.max(x1, x2, x3)));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2, y3)));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(y1, y2, y3)));
    const area = (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w1 = (x * (y3 - y2) + (y2 - y3) * cx + (cx - x) * 0 + 0);
        const a = (x * (y2 - y3) + cx * (y3 - y1) + x3 * (y1 - y2)) / area;
        const b = (x1 * (y - y3) + cx * (y3 - y1) + x3 * (y1 - y)) / area;
        const c = 1 - a - b;
        if (a >= 0 && a <= 1 && b >= 0 && b <= 1 && c >= 0 && c <= 1) setPx(x, y, rgba);
      }
    }
  };
  const fillRect = (x0, y0, w, h, rgba) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        setPx(x, y, rgba);
      }
    }
  };
  const strokePolyline = (pts, rgba, thick) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const steps = Math.ceil(Math.hypot(dx, dy));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = x1 + dx * t;
        const py = y1 + dy * t;
        for (let oy = -Math.ceil(thick / 2); oy <= Math.ceil(thick / 2); oy++) {
          for (let ox = -Math.ceil(thick / 2); ox <= Math.ceil(thick / 2); ox++) {
            if (ox * ox + oy * oy <= (thick / 2) ** 2) setPx(Math.round(px + ox), Math.round(py + oy), rgba);
          }
        }
      }
    }
  };

  // Fondo redondeado (verde)
  const pad = Math.round(0 * scale);
  roundRect(pad, pad, size - 2 * pad, size - 2 * pad, Math.round(42 * scale), BG);

  // Casa blanca (cuerpo)
  const body = [
    Math.round(44 * scale), Math.round(91 * scale), Math.round(104 * scale), Math.round(62 * scale),
  ];
  // techo (triángulo)
  const t1 = [Math.round(39 * scale), Math.round(91 * scale)];
  const t2 = [Math.round(96 * scale), Math.round(44 * scale)];
  const t3 = [Math.round(153 * scale), Math.round(91 * scale)];
  fillTriangle(t1, t2, t3, FG);
  // cuerpo rectángulo + puerta
  fillRect(Math.round(44 * scale), Math.round(91 * scale), Math.round(104 * scale), Math.round(55 * scale), FG);
  fillRect(Math.round(52 * scale), Math.round(100 * scale), Math.round(88 * scale), Math.round(46 * scale), BG);

  // Puerta (casa)
  fillRect(Math.round(78 * scale), Math.round(119 * scale), Math.round(36 * scale), Math.round(38 * scale), [0xa7, 0xf3, 0xd0, 0xff]);

  // Borde superior techo (oscuro)
  strokePolyline([t1, t2, t3], [0x06, 0x4e, 0x3b, 0xff], Math.max(2, Math.round(10 * scale * 0.6)));

  // Círculo del pomo/campana (pequeño)
  const ccx = Math.round(96 * scale);
  const ccy = Math.round(91 * scale);
  const r = Math.max(2, Math.round(10 * scale));
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) setPx(ccx + x, ccy + y, BG);
    }
  }

  return bmp;
}

function makePng(size) {
  const pixels = drawHouseIcon(size);
  const w = size;
  const h = size;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const crc32Table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n >>> 0;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = (crc32Table[(c ^ b) & 0xff] ^ (c >>> 8)) >>> 0;
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const tb = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(tb), 0);
    return Buffer.concat([len, tb, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // filtros 0 por scanline
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    pixels.copy(raw, y * (1 + w * 4) + 1, y * w * 4, y * w * 4 + w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const p192 = makePng(192);
const p512 = makePng(512);
writeFileSync(join(outDir, 'icon-192.png'), p192);
writeFileSync(join(outDir, 'icon-512.png'), p512);
console.log('OK wrote icon-192.png (' + p192.length + 'B) and icon-512.png (' + p512.length + 'B)');
