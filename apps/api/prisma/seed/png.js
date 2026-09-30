// Tiny PNG writer for seed images: soft aurora-style gradient art for event banners, profile
// covers and space covers. No dependencies (zlib for compression).
import zlib from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Encode RGB pixels (`pixel(x, y) -> [r, g, b]`) as a PNG. */
export function encodePng(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    raw[i++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[i++] = r;
      raw[i++] = g;
      raw[i++] = b;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const hex = (h) => [Number.parseInt(h.slice(1, 3), 16), Number.parseInt(h.slice(3, 5), 16), Number.parseInt(h.slice(5, 7), 16)];

export const PALETTES = {
  violet: { base: "#0b0a1d", blobs: ["#7c3aed", "#d946ef", "#f59e0b"] },
  sky: { base: "#07142b", blobs: ["#0ea5e9", "#6366f1", "#22d3ee"] },
  emerald: { base: "#04150f", blobs: ["#10b981", "#14b8a6", "#a3e635"] },
  amber: { base: "#1a0d02", blobs: ["#f59e0b", "#f43f5e", "#fb923c"] },
  rose: { base: "#1a0510", blobs: ["#f43f5e", "#d946ef", "#fb7185"] },
  indigo: { base: "#080a24", blobs: ["#6366f1", "#8b5cf6", "#38bdf8"] },
  fuchsia: { base: "#16061a", blobs: ["#d946ef", "#8b5cf6", "#f472b6"] },
  teal: { base: "#031616", blobs: ["#14b8a6", "#0ea5e9", "#34d399"] },
};

/**
 * Soft glowing blobs over a dark base with a faint grid, like the app's stage hero.
 * @param {{ width: number, height: number, palette: keyof PALETTES, seed?: number }} opts
 */
export function gradientArt({ width, height, palette = "violet", seed = 1 }) {
  const { base, blobs } = PALETTES[palette] ?? PALETTES.violet;
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const baseRgb = hex(base);
  const spots = blobs.map((color, i) => ({
    rgb: hex(color),
    x: width * (0.15 + 0.7 * rand()),
    y: height * (i === 2 ? 0.75 + 0.2 * rand() : 0.1 + 0.5 * rand()),
    r: Math.max(width, height) * (0.35 + 0.25 * rand()),
    strength: i === 2 ? 0.55 : 0.85,
  }));
  const grid = Math.round(Math.min(width, height) / 9);
  return encodePng(width, height, (x, y) => {
    let r = baseRgb[0];
    let g = baseRgb[1];
    let b = baseRgb[2];
    for (const spot of spots) {
      const d = Math.hypot(x - spot.x, y - spot.y) / spot.r;
      const w = spot.strength * Math.exp(-d * d * 2.2);
      r += (spot.rgb[0] - r) * w;
      g += (spot.rgb[1] - g) * w;
      b += (spot.rgb[2] - b) * w;
    }
    // Faint grid that fades towards the bottom
    if (x % grid === 0 || y % grid === 0) {
      const fade = 0.07 * (1 - y / height);
      r += (255 - r) * fade;
      g += (255 - g) * fade;
      b += (255 - b) * fade;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  });
}
