#!/usr/bin/env node
/**
 * Validate every OAVCR registry entry against OCS 1.1.
 *
 * Deliberately DEPENDENCY-FREE. This runs as the public repo's only CI gate, so
 * `node scripts/validate.mjs` must work on a bare checkout with no `npm
 * install`. Do not reach for ajv here — the bundled ajv is draft-07 and the
 * spec is 2020-12, and adding a dependency would put an install step between a
 * contributor and their first green run.
 *
 * The rule that matters most: a control with no *citation* is rejected. An
 * encoding nobody can re-check is worse than a missing one, because it looks
 * like knowledge. Provenance is enforced here rather than trusted to review.
 * The citation may live on the control (`source`) or be inherited from
 * `metadata.sources`; repeating the same PDF URL on every command is not required.
 *
 * Run: npm run oavcr:validate
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const registryDir = path.join(root, "registry");
const indexPath = path.join(registryDir, "index.json");

const CATEGORIES = new Set([
  "streamer", "dac", "preamp", "amplifier", "avr", "processor",
  "network_player", "speaker", "television", "projector", "disc_player",
  "screen", "other",
]);

const TRANSPORTS = new Set([
  "rs232", "rs485", "ir", "ip", "http", "websocket", "usb", "cec", "gpio",
  "bluetooth",
]);

const ACTIONS = new Set([
  "power_on", "power_off", "power_toggle", "standby",
  "volume_up", "volume_down", "set_volume",
  "mute_on", "mute_off", "mute_toggle",
  "balance_left", "balance_right", "balance_reset",
  "input_select", "input_next", "input_previous",
  "play", "pause", "stop", "track_next", "track_previous", "track_select",
  "fast_forward", "rewind", "eject", "repeat_toggle",
  "phase_invert", "filter_select", "upsampling_select", "clock_frequency",
  "display_on", "display_off", "display_brightness",
  "screen_up", "screen_down", "screen_stop",
  "picture_mode", "aspect_ratio", "lens_memory",
  "query_status", "query_volume", "query_input", "query_power",
]);

const ENCODING_KINDS = new Set([
  "ascii", "hex", "rc5", "rc6", "nec", "sirc", "pronto", "vendor", "contact",
]);
const IR_KINDS = new Set(["rc5", "rc6", "nec", "sirc"]);
const IR_CODE_RE = /^(0[xX][0-9a-fA-F]{1,4}|\d{1,5})$/;
const OPTION_ID_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;
const CONTROL_METHODS = new Set([
  "upstream_trigger",
  "contact_bridge",
  "ir_bridge",
  "serial_bridge",
  "power_switch",
  "manual_only",
]);
const REQUIREMENT_KINDS = new Set(["hardware", "chain_device", "wiring", "service"]);
const TRIGGER_DIRECTIONS = new Set(["in", "out", "in_out"]);
const VALUE_KINDS = new Set(["ascii", "hex", "pronto", "vendor"]);

const IR_PROTOCOLS = new Set([
  "rc5", "rc6", "nec", "nec-extended", "sirc", "rca", "raw", "pronto",
  "vendor", "unknown",
]);
const PARITY = new Set(["none", "even", "odd"]);
const FLOW = new Set(["none", "hardware", "software"]);
const CABLE = new Set(["straight", "null-modem", "proprietary", "unknown"]);
const PARAM_TYPES = new Set(["integer", "number", "string", "enum"]);

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HEX_RE = /^[0-9A-Fa-fx\s,]+$/;
const HTTP_URL_RE = /^https?:\/\//;

function isHttpUrl(value) {
  return typeof value === "string" && HTTP_URL_RE.test(value);
}

function deviceHttpSources(dev) {
  const list = dev.metadata && Array.isArray(dev.metadata.sources) ? dev.metadata.sources : [];
  return list.filter(isHttpUrl);
}

function deviceHasCitation(dev) {
  const list = dev.metadata && Array.isArray(dev.metadata.sources) ? dev.metadata.sources : [];
  return list.some((s) => typeof s === "string" && s.trim().length > 0);
}

function validateControlCitation(c, at, dev) {
  if (isHttpUrl(c.source)) return;
  if (c.source == null || c.source === "") {
    if (deviceHttpSources(dev).length) return;
    if (c.verified === true && deviceHasCitation(dev)) return;
    fail(
      `${at} has no citation — set source to a document URL, or omit it and list the document in metadata.sources`,
    );
    return;
  }
  if (c.verified === true && typeof c.source === "string" && c.source.trim().length >= 8) return;
  fail(
    `${at}.source "${c.source}" is not a usable URL — non-URL notes are only for verified hardware captures`,
  );
}

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  errors += 1;
}

function warn(msg) {
  console.warn(`WARN:  ${msg}`);
  warnings += 1;
}

function validateSerial(serial, label, where) {
  if (typeof serial !== "object" || serial === null) {
    fail(`${label}: connection.${where} must be an object`);
    return;
  }
  if (serial.baud != null && !Number.isInteger(serial.baud)) {
    fail(`${label}: connection.${where}.baud must be an integer`);
  }
  if (serial.dataBits != null && ![7, 8].includes(serial.dataBits)) {
    fail(`${label}: connection.${where}.dataBits must be 7 or 8`);
  }
  if (serial.parity != null && !PARITY.has(serial.parity)) {
    fail(`${label}: connection.${where}.parity "${serial.parity}" invalid`);
  }
  if (serial.stopBits != null && ![1, 1.5, 2].includes(serial.stopBits)) {
    fail(`${label}: connection.${where}.stopBits must be 1, 1.5 or 2`);
  }
  if (serial.flowControl != null && !FLOW.has(serial.flowControl)) {
    fail(`${label}: connection.${where}.flowControl "${serial.flowControl}" invalid`);
  }
  if (serial.cable != null && !CABLE.has(serial.cable)) {
    fail(`${label}: connection.${where}.cable "${serial.cable}" invalid`);
  }
  if (serial.baud != null && serial.cable == null) {
    warn(`${label}: connection.${where} gives baud but no cable type — the cable is the most common integration failure, record "straight", "null-modem" or "unknown"`);
  }
}

function validateEncoding(enc, label, idx) {
  const at = `${label}: controls[${idx}].encoding`;
  if (typeof enc !== "object" || enc === null) {
    fail(`${at} must be an object`);
    return;
  }
  if (!ENCODING_KINDS.has(enc.kind)) {
    fail(`${at}.kind "${enc.kind}" is not a known encoding kind`);
    return;
  }
  if (VALUE_KINDS.has(enc.kind) && !enc.value) {
    fail(`${at}.value is required for kind "${enc.kind}"`);
  }
  if (IR_KINDS.has(enc.kind) && !enc.command) {
    fail(`${at}.command is required for IR kind "${enc.kind}"`);
  }
  // Radix must be self-evident. Manufacturers publish RC-5 codes in both hex
  // and decimal, and "10" meaning sixteen is a silent, untraceable wrong-command
  // bug for whoever consumes this. Hex must carry its 0x.
  if (IR_KINDS.has(enc.kind)) {
    for (const field of ["address", "command"]) {
      const v = enc[field];
      if (v == null) continue;
      if (!IR_CODE_RE.test(String(v))) {
        fail(
          `${at}.${field} "${v}" must be 0x-prefixed hex or bare decimal — a bare hex string leaves the radix ambiguous`,
        );
      }
    }
  }
  if (enc.kind === "hex" && enc.value && !HEX_RE.test(enc.value)) {
    fail(`${at}.value must be hex bytes for kind "hex" (got "${enc.value}")`);
  }
  if (enc.kind === "vendor" && !enc.note) {
    warn(`${at} uses kind "vendor" without a note — say what the notation is, or that it is unidentified, so a consumer is not left guessing`);
  }
  if (enc.expectsReply && !enc.reply) {
    warn(`${at} sets expectsReply but records no reply pattern`);
  }
}

function validateParam(p, label, idx, pidx) {
  const at = `${label}: controls[${idx}].params[${pidx}]`;
  if (typeof p !== "object" || p === null) {
    fail(`${at} must be an object`);
    return;
  }
  if (!p.name) fail(`${at}.name is required`);
  if (!PARAM_TYPES.has(p.type)) {
    fail(`${at}.type "${p.type}" invalid`);
  }
  if (p.type === "enum" && !Array.isArray(p.options)) {
    fail(`${at} is type "enum" but declares no options`);
  }
  if (Array.isArray(p.options)) {
    for (const [oi, o] of p.options.entries()) {
      if (!o || typeof o !== "object" || o.value == null || !o.label) {
        fail(`${at}.options[${oi}] needs both value and label`);
      }
    }
  }
  if (p.min != null && p.max != null && p.min > p.max) {
    fail(`${at} has min > max`);
  }
}

function validateControls(dev, label) {
  if (dev.controls == null) return;
  if (!Array.isArray(dev.controls)) {
    fail(`${label}: controls must be an array`);
    return;
  }
  const declared = new Set(Array.isArray(dev.transports) ? dev.transports : []);
  for (const [idx, c] of dev.controls.entries()) {
    const at = `${label}: controls[${idx}]`;
    if (typeof c !== "object" || c === null) {
      fail(`${at} must be an object`);
      continue;
    }
    if (!ACTIONS.has(c.action)) {
      fail(`${at}.action "${c.action}" is not in the canonical action vocabulary — add it to the spec rather than inventing a local name, or the generated UI cannot render it`);
    }
    if (!TRANSPORTS.has(c.transport)) {
      fail(`${at}.transport "${c.transport}" invalid`);
    } else if (declared.size && !declared.has(c.transport)) {
      fail(`${at}.transport "${c.transport}" is not listed in this device's transports[]`);
    }
    // The anti-fabrication gate. An encoding without a citation is not a fact.
    // Per-command `source` is optional when metadata.sources already names a
    // document URL; a non-URL note is allowed only on a verified capture.
    validateControlCitation(c, at, dev);
    if (c.verified != null && typeof c.verified !== "boolean") {
      fail(`${at}.verified must be a boolean`);
    }
    validateEncoding(c.encoding, label, idx);
    if (c.params != null) {
      if (!Array.isArray(c.params)) {
        fail(`${at}.params must be an array`);
      } else {
        for (const [pidx, p] of c.params.entries()) validateParam(p, label, idx, pidx);
      }
    }
  }
}

function validateControlOptions(dev, label) {
  if (dev.controlOptions == null) return;
  if (!Array.isArray(dev.controlOptions)) {
    fail(`${label}: controlOptions must be an array`);
    return;
  }
  const seen = new Set();
  for (const [idx, o] of dev.controlOptions.entries()) {
    const at = `${label}: controlOptions[${idx}]`;
    if (typeof o !== "object" || o === null) {
      fail(`${at} must be an object`);
      continue;
    }
    if (!o.id || !OPTION_ID_RE.test(o.id)) {
      fail(`${at}.id "${o.id}" must match ${OPTION_ID_RE}`);
    } else if (seen.has(o.id)) {
      fail(`${at}.id "${o.id}" is duplicated`);
    } else {
      seen.add(o.id);
    }
    if (!CONTROL_METHODS.has(o.method)) {
      fail(`${at}.method "${o.method}" invalid`);
    }
    for (const k of ["title", "summary"]) {
      if (!o[k] || typeof o[k] !== "string") fail(`${at}.${k} is required`);
    }
    if (o.provides != null) {
      if (!Array.isArray(o.provides)) {
        fail(`${at}.provides must be an array`);
      } else {
        for (const a of o.provides) {
          if (!ACTIONS.has(a)) fail(`${at}.provides "${a}" is not in the action vocabulary`);
        }
      }
    }
    // A route that claims to deliver actions but names nothing to buy or wire is
    // not actionable advice. `manual_only` is the honest exception: its whole
    // point is that no arrangement works.
    const provides = Array.isArray(o.provides) ? o.provides : [];
    const requires = Array.isArray(o.requires) ? o.requires : [];
    if (o.method === "manual_only") {
      if (provides.length) {
        fail(`${at} is manual_only but claims to provide actions — if something works, it is not manual-only`);
      }
    } else if (provides.length === 0) {
      warn(`${at} provides no actions — say which actions the route delivers, or use method "manual_only"`);
    }
    if (o.method !== "manual_only" && o.method !== "upstream_trigger" && requires.length === 0) {
      warn(`${at} needs external hardware but requires[] is empty — an owner cannot act on this without knowing what to buy`);
    }
    for (const [ridx, r] of requires.entries()) {
      const rat = `${at}.requires[${ridx}]`;
      if (typeof r !== "object" || r === null) {
        fail(`${rat} must be an object`);
        continue;
      }
      if (!REQUIREMENT_KINDS.has(r.kind)) fail(`${rat}.kind "${r.kind}" invalid`);
      if (!r.name || typeof r.name !== "string") fail(`${rat}.name is required`);
      if (r.examples != null) {
        if (!Array.isArray(r.examples)) {
          fail(`${rat}.examples must be an array`);
        } else {
          for (const [eidx, ex] of r.examples.entries()) {
            if (typeof ex !== "object" || ex === null || !ex.name) {
              fail(`${rat}.examples[${eidx}] needs a name`);
            } else if (ex.url && !isHttpUrl(ex.url)) {
              fail(`${rat}.examples[${eidx}].url "${ex.url}" is not a usable URL`);
            }
          }
        }
      }
    }
    if (o.source != null && !isHttpUrl(o.source)) {
      fail(`${at}.source "${o.source}" is not a usable URL`);
    }
    if (o.preference != null && !Number.isInteger(o.preference)) {
      fail(`${at}.preference must be an integer`);
    }
  }
}

function validateTrigger(t, label) {
  if (typeof t !== "object" || t === null) {
    fail(`${label}: connection.trigger must be an object`);
    return;
  }
  if (t.direction != null && !TRIGGER_DIRECTIONS.has(t.direction)) {
    fail(`${label}: connection.trigger.direction "${t.direction}" invalid`);
  }
  if (t.levelHeld != null && typeof t.levelHeld !== "boolean") {
    fail(`${label}: connection.trigger.levelHeld must be a boolean`);
  }
  // Polarity is what stops an installer putting 12 V on the sleeve of a live
  // input. If the maker publishes it, it belongs here; if not, "unknown" says
  // so deliberately, the same way an unknown serial cable type does.
  if ((t.direction === "in" || t.direction === "in_out") && t.polarity == null) {
    warn(`${label}: connection.trigger is an input but records no polarity — give it, or set it to "unknown" to record that the maker does not publish one`);
  }
}

function validateDevice(obj, label) {
  for (const k of ["id", "manufacturer", "model", "category", "displayName"]) {
    if (!obj[k] || typeof obj[k] !== "string") {
      fail(`${label}: missing or invalid "${k}"`);
    }
  }
  if (obj.id && !ID_RE.test(obj.id)) {
    fail(`${label}: id "${obj.id}" must match ${ID_RE}`);
  }
  if (obj.category && !CATEGORIES.has(obj.category)) {
    fail(`${label}: unknown category "${obj.category}"`);
  }
  if (obj.transports != null) {
    if (!Array.isArray(obj.transports)) {
      fail(`${label}: transports must be an array`);
    } else {
      for (const t of obj.transports) {
        if (!TRANSPORTS.has(t)) fail(`${label}: unknown transport "${t}"`);
      }
      if (new Set(obj.transports).size !== obj.transports.length) {
        fail(`${label}: transports has duplicates`);
      }
    }
  }
  if (obj.connection != null) {
    if (typeof obj.connection !== "object") {
      fail(`${label}: connection must be an object`);
    } else {
      if (obj.connection.rs232) validateSerial(obj.connection.rs232, label, "rs232");
      if (obj.connection.rs485) validateSerial(obj.connection.rs485, label, "rs485");
      if (obj.connection.ir) {
        const ir = obj.connection.ir;
        if (ir.protocol != null && !IR_PROTOCOLS.has(ir.protocol)) {
          fail(`${label}: connection.ir.protocol "${ir.protocol}" invalid`);
        }
        if (ir.carrierKhz != null && (ir.carrierKhz < 20 || ir.carrierKhz > 60)) {
          fail(`${label}: connection.ir.carrierKhz ${ir.carrierKhz} is outside 20–60 kHz`);
        }
      }
      if (obj.connection.trigger) validateTrigger(obj.connection.trigger, label);
    }
  }
  validateControls(obj, label);
  validateControlOptions(obj, label);

  // A device with no commands and no routes is a dead end for an owner. Say
  // what would make it controllable, even if the answer is "nothing does".
  const hasControls = Array.isArray(obj.controls) && obj.controls.length > 0;
  const hasOptions = Array.isArray(obj.controlOptions) && obj.controlOptions.length > 0;
  if (!hasControls && !hasOptions) {
    warn(`${label}: no controls and no controlOptions — record how (or state that it cannot) be controlled`);
  }

  if (Array.isArray(obj.controls) && obj.controls.length > 0) {
    const serialControls = obj.controls.some((c) => c && (c.transport === "rs232" || c.transport === "rs485"));
    if (serialControls && !(obj.connection && (obj.connection.rs232 || obj.connection.rs485))) {
      warn(`${label}: declares serial controls but no connection.rs232 — an implementation would not know what baud to open`);
    }
  }
  if (!obj.metadata || !Array.isArray(obj.metadata.sources) || obj.metadata.sources.length === 0) {
    warn(`${label}: metadata.sources is empty — record where this entry came from`);
  }
}

let index;
try {
  index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
} catch (e) {
  fail(`Cannot read ${indexPath}: ${e.message}`);
  process.exit(1);
}

if (!index.version || !Array.isArray(index.devices)) {
  fail("index.json must have version and devices[]");
  process.exit(1);
}

// Every file on disk must be indexed. An orphan file is invisible to consumers,
// which is a silent way to lose work.
const devicesDir = path.join(registryDir, "devices");
const onDisk = fs.existsSync(devicesDir)
  ? new Set(fs.readdirSync(devicesDir).filter((f) => f.endsWith(".json")))
  : new Set();

const seenIds = new Set();
let controlCount = 0;
let withControls = 0;

for (const entry of index.devices) {
  if (!entry.id || !entry.file) {
    fail(`index entry missing id or file: ${JSON.stringify(entry)}`);
    continue;
  }
  if (seenIds.has(entry.id)) fail(`duplicate index id: ${entry.id}`);
  seenIds.add(entry.id);
  onDisk.delete(path.basename(entry.file));

  const filePath = path.join(registryDir, entry.file);
  if (!fs.existsSync(filePath)) {
    fail(`missing device file: ${entry.file}`);
    continue;
  }
  let dev;
  try {
    dev = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    fail(`${entry.file}: invalid JSON — ${e.message}`);
    continue;
  }
  if (dev.id !== entry.id) {
    fail(`${entry.file}: id "${dev.id}" !== index id "${entry.id}"`);
  }
  if (entry.category && dev.category && entry.category !== dev.category) {
    fail(`${entry.file}: category "${dev.category}" disagrees with index "${entry.category}"`);
  }
  validateDevice(dev, entry.file);
  if (Array.isArray(dev.controls) && dev.controls.length) {
    withControls += 1;
    controlCount += dev.controls.length;
  }
}

for (const orphan of onDisk) {
  fail(`devices/${orphan} exists but is not listed in index.json`);
}

if (errors) {
  console.error(`\nValidation FAILED — ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(
  `OAVCR registry OK — ${index.devices.length} devices (v${index.version}), ` +
    `${withControls} with control sets, ${controlCount} commands, ${warnings} warning(s)`,
);
