#!/usr/bin/env node
// Parse the OEM KB.ini [KEY] / [FN1] sections into f75-keymap.json.
//   [KEY]  K<n>=x,y,w,h, <page>, <vk>, 0x00, <index>
//   [FN1]  K<n>=0x09,0x01,<0xHHHHHHHH>   (32-bit: page<<16 | usage)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INI = join(ROOT, "assets/oem/Dev/kb/1/KB.ini");
const OUT = join(ROOT, "web/src/data/f75-keymap.json");

const LOCKED_INDICES = [12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78];

function section(ini, name) {
  // Section body = from the header to the next "\n[" (or EOF for the last section).
  const m = new RegExp(`^\\[${name}\\]`, "m").exec(ini);
  if (!m) return "";
  const start = m.index + m[0].length;
  const next = ini.indexOf("\n[", start);
  return next < 0 ? ini.slice(start) : ini.slice(start, next);
}
const toInt = (s) => parseInt(s.trim(), 16);

function parseKeyLine(line) {
  // "K1=30,30,55,57, 0x02,0x1B,0x00,0"
  const body = line.split("=")[1].trim();
  const p = body.split(",").map((s) => s.trim());
  if (p.length !== 8) return null;
  const [x, y, w, h, , vk, , index] = p;
  return {
    index: parseInt(index, 10),
    vk: toInt(vk), x: parseInt(x, 10), y: parseInt(y, 10),
    w: parseInt(w, 10), h: parseInt(h, 10),
  };
}

function parseFnLine(line) {
  // Long form:  "K1=0x09,0x01,0x07000004"   -> prefix(1) 0x00 usageHi usageLo
  // Short form: "K29=0x02,0x2D,0x00"        -> page(1) usage(1) 0x00
  const body = line.split("=")[1].trim();
  const p = body.split(",").map((s) => s.trim());
  if (p.length !== 3) return null;
  const isLong = /^0x[0-9a-f]{8}$/i.test(p[2]);
  const usage = isLong ? (toInt(p[2]) & 0xffff) : toInt(p[1]);
  if (usage > 0xff) return null; // one-byte usage id only (vendor >0xFF / OSD not supported)
  // Prefix -> AULA wire page byte (0x00 = keyboard, 0x02 = consumer).
  const prefix = isLong ? ((toInt(p[2]) >>> 24) & 0xff) : toInt(p[0]);
  const aulaPage = prefix === 0x02 ? 0x02 : prefix === 0x07 || prefix === 0x00 ? 0x00 : null;
  if (aulaPage === null) return null;
  return [aulaPage, usage];
}
function lineLength(l) { return l[0] === "K" && l.includes("="); }

const ini = readFileSync(INI, "utf8").replace(/\r/g, "");
const keySec = section(ini, "KEY");
const fnSec = section(ini, "FN1");

const fnOverrides = new Map();
for (const line of fnSec.split("\n")) {
  if (!lineLength(line)) continue;
  const n = parseInt(line.slice(1, line.indexOf("=")), 10);
  const v = parseFnLine(line);
  if (v !== null) fnOverrides.set(n, v);
}

const keys = [];
let n = 1;
for (const line of keySec.split("\n")) {
  if (!lineLength(line)) continue;
  const k = parseKeyLine(line);
  if (k === null) continue; // skip malformed / comments start with ";"
  if (k.w === 0 || k.h === 0) continue; // phantom matrix node (no physical keycap), e.g. index 84
  const fnHid = fnOverrides.get(n) ?? null;
  keys.push({ ...k, fnHid, locked: LOCKED_INDICES.includes(k.index) });
  n++;
}

// Names/labels derived from the Windows VK code of each key's base-layer
// default (authoritative in the KB.ini) — NOT from matrix index, which varies
// per board. Fall back to a stable "key<index>" id when the VK is unknown.
const VK_SPECIAL = {
  0x08: ["bksp", "Bksp"], 0x09: ["tab", "Tab"], 0x0d: ["enter", "Enter"],
  0x14: ["caps", "Caps"], 0x1b: ["esc", "Esc"], 0x20: ["space", "Space"],
  0x21: ["pgup", "PgUp"], 0x22: ["pgdn", "PgDn"], 0x23: ["end", "End"],
  0x24: ["home", "Home"], 0x25: ["left", "←"], 0x26: ["up", "↑"],
  0x27: ["right", "→"], 0x28: ["down", "↓"], 0x2d: ["ins", "Ins"],
  0x2e: ["del", "Del"], 0x5b: ["lwin", "Win"], 0x5c: ["rwin", "Win"],
  0xa0: ["lshift", "LShift"], 0xa1: ["rshift", "RShift"],
  0xa2: ["lctrl", "LCtrl"], 0xa3: ["fn", "Fn"], 0xa4: ["lalt", "LAlt"],
  0xa5: ["rctrl", "RCtrl"], 0xfa: ["ralt", "RAlt"],
  0xba: ["semicolon", ";"], 0xbb: ["equals", "="], 0xbc: ["comma", ","],
  0xbd: ["minus", "-"], 0xbe: ["period", "."], 0xbf: ["slash", "/"],
  0xc0: ["grave", "`"], 0xdb: ["lbracket", "["], 0xdc: ["backslash", "\\"],
  0xdd: ["rbracket", "]"], 0xde: ["apostrophe", "'"],
};
const VK_FN = (i) => [`f${i + 1}`, `F${i + 1}`]; // 0x70..0x7b

function vkName(vk) {
  const num = vk >>> 0;
  if (num >= 0x70 && num <= 0x7b) return VK_FN(num - 0x70);
  if (num >= 0x30 && num <= 0x39) return [`d${num - 0x30}`, String.fromCharCode(num)];
  if (num >= 0x41 && num <= 0x5a) return [String.fromCharCode(num + 32), String.fromCharCode(num)];
  return VK_SPECIAL[num] ?? null;
}

for (const k of keys) {
  const pair = vkName(k.vk);
  k.name = pair ? pair[0] : `key${k.index}`;
  k.label = pair ? pair[1] : k.name;
}
// Locked F1–F12 names/labels are enforced regardless of VK.
for (let i = 0; i < LOCKED_INDICES.length; i++) {
  for (const k of keys) {
    if (k.index === LOCKED_INDICES[i]) {
      k.name = `f${i + 1}`;
      k.label = `F${i + 1}`;
    }
  }
}

const out = { version: "1", source: INI.replace(`${ROOT}/`, ""), keys };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${keys.length} keys -> ${OUT}`);