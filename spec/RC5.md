# RC-5, and why the registry does not ship an RC-5 library

Philips RC-5 is the closest thing high-end audio has to a shared IR standard.
Preamps, DACs, upsamplers and AV processors from unrelated makers all speak it,
and that regularity invites an obvious idea: put one RC-5 command table in the
registry, tag each device with "speaks the preamp set", and stop transcribing
codes device by device.

**The registry deliberately does not do that.** This document says what RC-5
facts OAVCR *does* record, why the shared table is a trap, and what the
`codeset` field is for.

## What the protocol is

RC-5 is a 14-bit frame at 36 kHz (some makers ship 36.7 or 37.9 kHz — record what
the maker states, do not assume):

| Field | Bits | Meaning |
|---|---|---|
| Start | 2 | Both `1` in classic RC-5. |
| Toggle | 1 | Flips on each new key press. Lets a receiver tell a held key from a repeated one. |
| System address | 5 | 0–31. Which *class of device* should listen. |
| Command | 6 | 0–63. Which function. |

Bits are Manchester-encoded at 889 µs per half-bit, so a frame is ~24.9 ms, and
frames repeat every ~114 ms while a key is held.

Two consequences matter more than the bit layout:

1. **The toggle bit is part of the frame, not part of the meaning.** A consumer
   must flip it between distinct presses, or a receiver may treat the second
   press as contact bounce and ignore it. Registry entries record address and
   command only; the toggle is the implementation's job.
2. **A frame is a broadcast.** There is no handshake, no acknowledgement and no
   unicast. Every receiver in line of sight that is listening on that system
   address acts on it. This is the root of everything below.

## Addresses are assigned by function group, not by product

Philips allocated system numbers by device *class* — 0 for TV, 5 for VCR, 16 for
preamplifier/audio, 20 for CD, and so on — and manufacturers followed suit.
That is why:

- Nagra's HD PREAMP and MELODY both answer address 16. One is a statement
  preamplifier, the other a valve preamplifier, and to a remote they are the
  same class of thing.
- dCS assign one address per function group across the whole range, so 0x0D
  addresses "DAC" wherever a DAC lives — including the DAC section inside a
  Puccini Player.

So **an address does not identify a box.** Two boxes in one rack sharing an
address is normal, not a misconfiguration.

## Why there is no shared command table

The tempting artefact is a file that says "address 16 command 16 = volume up",
which every address-16 device then inherits. Three separate problems kill it.

**Meanings are not stable within an address.** Makers agree on the address far
more than on the commands. Command 35 is "input select" on one address-16
preamp and unused on the next; some makers reuse a code for different functions
depending on which menu the device is in. A table that is right for one box and
wrong for the next is worse than no table, because it looks like knowledge —
the same reason [`SOURCES.md`](SOURCES.md) refuses bulk imports from scraped IR
databases.

**Provenance cannot be inherited.** Every command in this registry carries a
citation to the document it was read from. A code inherited from a generic table
has no document behind it for *this* device. That is precisely the class of
entry the validator exists to reject.

**Duplicate codes are ambiguous in a way a table cannot express.** Where the
same frame appears twice with different meanings, the disambiguator is device
state, not the code. A flat table has nowhere to put that.

The registry's position is therefore: **RC-5 protocol facts are shared; RC-5
commands are not.** Codes stay transcribed per device, from that device's own
document, with that document cited.

## What OAVCR records instead

### `connection.ir.protocol`, `carrierKhz`, `address`

The protocol facts, as the maker publishes them. Addresses may be written in
either radix, but hex must carry its `0x` — the validator enforces this, because
"10" meaning sixteen is an untraceable wrong-command bug for whoever consumes
the entry.

```json
"ir": {
  "protocol": "rc5",
  "carrierKhz": 36,
  "address": "16",
  "codeset": "rc5-16",
  "needsDirectEmitter": true,
  "oneWay": true
}
```

### `connection.ir.codeset` — the reference layer

`codeset` names the **code space** a device listens on. It is a label for "these
boxes hear each other's frames", and nothing more. It carries no commands, and a
consumer must never use it to look up a code.

- Omit it and a consumer derives `<protocol>-<decimal address>` (`rc5-16`).
  Comparison is numeric, so `16` and `0x10` are one codeset, not two.
- Set it explicitly when a maker publishes a name for the set, or when devices
  that share an address are deliberately **not** interchangeable and should not
  be reported as clashing.

### `connection.ir.needsDirectEmitter`

True when the device needs its own emitter over its receiver window rather than
a shared room blaster. Set it wherever a maker puts several models on one
address: a blaster commands all of them at once, and no amount of software can
separate them.

## What a consumer should do with this

A host that knows the whole signal chain — Lyr Link is one — can do what a flat
registry cannot: notice that two devices in the same chain resolve to the same
codeset, and say so *before* the owner spends an evening wondering why turning
the DAC up also turned the preamp up.

The honest warning is about the medium, not about the software:

> Nagra HD PREAMP and Nagra MELODY both listen on RC5 address 16. An infrared
> command sent to one is received by the other as well. Fit an emitter over each
> device's receiver instead of using a shared blaster.

Note what it does **not** claim. It does not promise to prevent the double
trigger, because IR is a broadcast and nothing in software can stop a second
receiver hearing a frame. It tells the owner the one thing that does fix it,
which is physical.

Within a single device, the analogous case is two commands carrying the same
frame. `findDuplicateIrFrames` (Lyr's consumer-side helper) reports these, and
the registry validator warns on them at contribution time, because firing one is
indistinguishable from firing the other — it is the same burst of light.

## Contributing RC-5 entries

1. Read the codes from the device's own manual or protocol document, and cite it.
2. Keep the radix explicit (`0x0D`, or bare decimal).
3. Record the carrier the maker states rather than assuming 36 kHz.
4. Where the maker documents that a command must be sent more than once to be
   decoded — dCS say three times — put that in `connection.ir.note`.
5. Do **not** copy codes from another device's entry because the addresses match.
   If they genuinely come from a shared document, cite that document on both.
