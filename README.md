<p align="center">
  <img src="assets/oavcr-logo.png" alt="OAVCR — Open Audio Visual Control Registry" width="420" />
</p>

# OAVCR — Open Audio Visual Control Registry

**An open, community-maintained standard and device registry for controlling
audio and visual equipment over RS-232, infrared, IP, triggers, and more.**

OAVCR records *facts* about real hardware: which transports a product exposes,
how to open the port, and what bytes or IR codes to send for power, volume,
inputs, and transport control. Controllers implement each transport once; every
device in the registry is data.

| Layer | Name |
|---|---|
| **Project** | OAVCR — Open Audio Visual Control Registry |
| **Schema** | [OAVCR Control Specification (OCS)](spec/oavcr-1.1.schema.json) |
| **Database** | OAVCR Device Registry (`registry/devices/*.json`) |
| **Reference UI** | [lyr.app/oavcr](https://lyr.app/oavcr/) (directory + device pages) |
| **First consumer** | [Lyr Link](https://lyr.app) — Lyr's physical chain control |

## Why this exists

Most high-end AV gear still ships with RS-232 or IR even when it has no app.
Streamers and network players already have Ethernet and a vendor app — they
are out of scope. Integrators re-type the same command tables into Crestron,
Control4, and Savant drivers. OAVCR is the neutral layer: one JSON file per
product, validated against a published schema, with a **citation on every
command** (inherited from `metadata.sources` unless a control names its own)
so anyone can audit where an encoding came from.

A **driver** in OAVCR is not code — it is a single JSON file. No plugins, no
compile step, no vendor lock-in.

## Layout

```
spec/              OCS JSON Schema + action/transport/category docs
registry/
  index.json       catalogue
  devices/         one JSON file per product (= the driver)
scripts/           validate.mjs — dependency-free CI gate
drivers/           shared transport helpers (future)
assets/            project logo
```

## Quick start

```bash
node scripts/validate.mjs          # validate every registry entry
```

Inside the Lyr app monorepo (private):

```bash
npm run oavcr:validate
npm run oavcr:build-site             # regenerate the lyr.app/oavcr site data
```

## Contributing a device

1. Add `registry/devices/<id>.json` matching `spec/oavcr-1.1.schema.json`
2. Add one line to `registry/index.json`
3. Run `node scripts/validate.mjs`

Every command needs a citation: `metadata.sources` by default, or a per-control
`source` when it differs. `verified: true` means **you sent it to the device** —
not that you read it in a PDF. Devices with only a 12 V trigger get
`controlOptions` instead of `controls`.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full walkthrough and import
policy ([SOURCES.md](spec/SOURCES.md)).

## Infrared: protocol facts are shared, commands are not

RC-5 is common enough across high-end audio to invite a shared command table —
"address 16 command 16 = volume up", inherited by every address-16 device. The
registry refuses that, because meanings are not stable within an address and an
inherited code has no document behind it for *this* device.

What is shared is the code *space*. `connection.ir.codeset` labels it, so a
consumer that knows the whole chain can see that two boxes listen on the same
address and will hear each other's frames — Nagra's HD PREAMP and MELODY both
answer RC-5 address 16. `needsDirectEmitter` says the fix is an emitter per
device rather than a room blaster. Neither field carries commands.

Full reasoning and the frame layout: **[spec/RC5.md](spec/RC5.md)**.

## Manufacturer information and trademarks

OAVCR is an independent, community-maintained interoperability registry.
Manufacturer and product names are used solely for identification and
compatibility purposes. All trademarks are the property of their respective
owners. **OAVCR is not affiliated with or endorsed by the manufacturers listed in
the registry unless expressly stated** — where a manufacturer has contributed
their own data, the entry says so in `metadata.contributedBy` and the device page
displays it; the absence of that field means no involvement.

Control commands, protocol parameters and other interoperability data are
recorded as factual technical information. Contributors must not submit
copyrighted documentation, confidential information, or material obtained in
breach of an NDA or other legal obligation. Contributors must submit
interoperability information from lawful sources and must not copy substantial
portions of third-party databases or copyrighted documentation.

If you are a rights holder and believe an entry oversteps this, open an issue and
we will act on it rather than argue about it.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [spec/SOURCES.md](spec/SOURCES.md) for
what may and may not be used as a source.

## Licence

MIT — schema and registry JSON in this repository. The licence covers this
project's own compilation of facts and the schema, not any third party's
trademarks.
