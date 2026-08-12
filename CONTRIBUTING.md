# Contributing a device to OAVCR

A "driver" in OAVCR is a **single JSON file**, not code. Everything a controller
needs — how to open the port, what bytes to send, what the reply looks like — is
data, so adding support for a new amplifier is a text edit that any owner of the
device can make and review. There is nothing to compile and no plugin API.

```
registry/
  index.json                 the catalogue — one line per device
  devices/<id>.json          the driver itself
spec/
  oavcr-1.1.schema.json      what a driver may contain
  ACTIONS.md                 the action vocabulary
  TRANSPORTS.md              rs232 / ir / ip / bluetooth / gpio
  CATEGORIES.md              dac / preamp / amplifier / … (no streamers)
  SOURCES.md                 what you may and may not copy from
scripts/validate.mjs         the check CI runs
```

## 1. Write the file

Copy the closest existing device from `registry/devices/` and edit it.
`nagra-hd-preamp.json` is the fullest worked example: two transports, one
device, with the discrepancies between them recorded rather than smoothed over.

```json
{
  "id": "acme-a100",
  "manufacturer": "Acme",
  "model": "A100",
  "category": "amplifier",
  "transports": ["rs232"],
  "connection": {
    "rs232": {
      "baud": 9600, "dataBits": 8, "parity": "none", "stopBits": 1,
      "flowControl": "none",
      "cable": "straight",
      "connector": "DB9 female, rear panel"
    }
  },
  "controls": [
    {
      "action": "power_on",
      "transport": "rs232",
      "encoding": { "kind": "ascii", "value": "PWR ON\\r" },
      "verified": true
    }
  ],
  "metadata": { "sources": ["https://acme.example/A100-manual.pdf"], "verified": true }
}
```

Then add one entry to `registry/index.json` and run:

```bash
node scripts/validate.mjs      # or, inside Lyr: npm run oavcr:validate
```

## 2. The rules that actually get PRs rejected

**Every command needs a citation.** Default is `metadata.sources` (the
manufacturer manual). Put `source` on a control only when it differs — a
second document, a page fragment, or a hardware-capture note. A command with
no citation at all is unreviewable: nobody can tell a transcription slip from
a typo, and a wrong power command sent to a stranger's amplifier is not a
cosmetic bug. This is enforced by the validator, not by reviewers' goodwill.

**Say hex in hex.** IR `address` and `command` values are decimal unless they
carry a `0x` prefix. Manuals print both, often on the same page, and RC-5
command 20 and command 0x20 are different keys. Write what the manual wrote.

**`verified` means you sent it to the device.** Not "the manual says so" —
that is what `source` is for. `verified: false` with a good source is a
perfectly good contribution and is how most entries start; a false `true`
is worse than no entry.

**Record conflicts, don't resolve them.** Where a manufacturer publishes two
different baud rates for the same model (dCS does), both go in a `note`. An
averaged or guessed value looks authoritative and helps nobody.

**Say what you don't know.** `"cable": "unknown"` is a legitimate value and it
is the correct one whenever the manual gives no pinout. Guessing between
straight-through and null-modem produces a device that silently does nothing.

**Write your own description of the protocol.** Facts about a protocol are not
copyrightable, but expression is: read the manufacturer's documentation and
express the commands yourself. Do not paste or transliterate command tables,
YAML, or source from other control projects — several are GPL or unlicensed,
and an unlicensed project grants nothing at all. `spec/SOURCES.md` has the
detail.

## 3. What does not belong

**Streamers and network players are out of scope.** If the product's normal
control path is Ethernet plus a vendor app (Roon, Lightning DS, Linn, Naim,
BluOS, …), Lyr already talks to it as a player. An OAVCR stub that says
“network only — no RS-232” adds nothing. Do not add `streamer` or
`network_player` entries.

A hybrid that is primarily a DAC, preamp, amp, or AVR may be filed in that
hardware category **if** it has RS-232, IR, or a trigger. Network-only
hybrids stay out until a non-network control path is documented.

## 4. Devices you cannot send a command to

Plenty of good equipment has no data connection — a 12V trigger jack and
nothing else. Those are not out of scope; they get `controlOptions` instead of
`controls`, describing the route by which a controller *can* reach them: a
trigger output on an upstream device in the same chain, a network relay bridge,
or an honest `manual_only`. `gryphon-antileon-evo.json` is the worked example.

Where a trigger is involved, `connection.trigger` carries the electrical
detail — voltage, polarity, whether the level is held or pulsed, and which
direction the jack works in. Get this wrong in an installation and you connect
an output to an output. If the manual doesn't state polarity, the value is
`"unknown"`.

## 5. Open the PR

One device per pull request, with the manual linked in the description. Say
whether you own the device and tested it, or worked from documentation only —
both are welcome, and the distinction belongs in `verified`, the PR, and
nowhere else.
