# OAVCR actions

An OAVCR entry does not describe a device's remote control. It describes what
the device can be **told to do**, using a fixed vocabulary, so that any
implementation can build a control surface from the registry alone and never
ship per-device UI code.

That constraint is the whole point. A Rotel calls its input switch one thing and
a JVC projector calls it another; both declare `input_select`. If your device's
manual uses a word that isn't here, translate it — do not invent a local action
name. The validator rejects unknown actions precisely so that a consumer can
render every entry without a lookup table of synonyms.

## The vocabulary

### Power

| Action | Meaning |
|---|---|
| `power_on` | Discrete on. Only use when the device has a genuine discrete command. |
| `power_off` | Discrete off. |
| `power_toggle` | One command that flips state. Common on IR. |
| `standby` | Low-power state distinct from off, where the device has one. |

**Never model a toggle as `power_on`.** A great deal of real equipment — most
IR-controlled gear, including the Chord DAVE — only offers a toggle. Declaring
that as `power_on` makes an implementation believe it can assert a state it
cannot, and the first thing a user notices is the device switching off when they
asked it to switch on. If the only command is a toggle, say `power_toggle` and
let the consumer decide how to present it.

### Volume

| Action | Meaning |
|---|---|
| `volume_up` / `volume_down` | Single relative step. |
| `set_volume` | Absolute level. Declare a `params` entry giving `min`, `max`, `step` and `unit`. |
| `mute_on` / `mute_off` | Discrete. |
| `mute_toggle` | Single command that flips mute. |

`set_volume` without a parameter definition is unusable, because a consumer has
no idea what range to send. The units are the device's own — if it takes 0–99
steps, say so; if it takes dB, say `unit: "dB"` and give the real range,
including negatives.

### Inputs

| Action | Meaning |
|---|---|
| `input_select` | Choose an input. |
| `input_next` / `input_previous` | Cycle. |

Two shapes are both legitimate. A device with one parameterised command gets a
single `input_select` with an `enum` param. A device with a separate command per
input gets **several** `input_select` controls, each with its own `label` and
`encoding`. Do not force the second shape into a fake parameter.

### Transport

`play`, `pause`, `stop`, `track_next`, `track_previous`, `fast_forward`,
`rewind`, `eject`, `repeat_toggle` — for disc players and anything else with a
transport. `track_select` takes an integer param and jumps straight to a track,
which is a different thing from stepping with `track_next`.

Note that `play` and `pause` are separate actions even though a great many
remotes only send one combined code. When a device has a single Play/Pause
toggle, declare it as `play` with a `label` saying so, rather than inventing a
`play_pause` action or claiming two commands exist.

### Audio-specific

| Action | Meaning |
|---|---|
| `phase_invert` | Absolute phase flip. |
| `filter_select` | Reconstruction/digital filter choice (common on DACs). |
| `upsampling_select` | Upsampling or PCM/DSD conversion mode. |
| `clock_frequency` | Output frequency of a master clock (44.1 kHz, 48 kHz, …). |

### Display and video

`display_on`, `display_off`, `display_brightness` for a device's own front
panel. `picture_mode`, `aspect_ratio`, `lens_memory` for projectors and TVs.

### Screens

`screen_up`, `screen_down`, `screen_stop`. Many screens are driven by contact
closure rather than a data protocol — use `encoding.kind: "contact"` for those,
and record which pins close in `encoding.note`.

### Queries

`query_status`, `query_volume`, `query_input`, `query_power` read state back.
They are never rendered as buttons. IR devices should not declare them at all:
IR has no return path, which is what `connection.ir.oneWay` records.

## Provenance is not optional

Every control carries a `source` URL naming the document its encoding came from,
and the validator fails the build without one. This is not bureaucracy. A
command byte that nobody can re-check is indistinguishable from a guess, and a
wrong byte sent to a power amplifier is not a cosmetic bug. If you cannot cite
it, leave it out — an entry with accurate metadata and no controls is genuinely
useful, and a fabricated encoding is worse than nothing.

`verified` means something narrower and stronger: the command has been executed
against the real hardware and did what it claims. Documented-but-untested stays
`false`. Most of the registry is `false`, and that is honest.
