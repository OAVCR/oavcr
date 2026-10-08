# Bluetooth profile: `schiit-forkbeard`

Schiit's optional **Forkbeard** module adds Bluetooth LE control to Forkbeard-capable
preamps (Freya+ F, Kara F, Saga 2). Schiit publish no protocol. This profile was decoded
from the Schiit iOS app's traffic (Apple PacketLogger) and checked on a Freya+ F from a
Raspberry Pi running BlueZ, 2026-10-08.

## Finding the device

- Advertises service `2da00001-9f4c-4a75-bdec-fcc5c2877bbf` with **no name**. The GAP name
  `Forkbeard` appears only after connecting. Manufacturer data key `0x0d45`.
- No pairing or bonding is needed.
- It takes **one connection at a time**. Disconnect when idle, or the Schiit app cannot connect.

## Characteristics

| UUID | Use |
| --- | --- |
| `2da00002-9f4c-4a75-bdec-fcc5c2877bbf` | commands. **Write with response (write request).** A write command was ignored. |
| `2da00003-9f4c-4a75-bdec-fcc5c2877bbf` | reports (notify) |
| `8d53dc1d-1db7-4cd3-868b-8a527460aa84` / `da2e7828-…` | MCUmgr/SMP firmware update. **Do not use.** |
| `67136e01-58db-f39b-3446-fdde58c0813a` / `67136e02-…` | unknown. **Do not write.** |

## Frames

```
command  = header(4) record checksum(2)
record   = u16-LE length, then payload (op param [value])
checksum = ~(byte sum of record) & 0xFFFF, little-endian
header   = x, 0x7F, payload[-2] ^ 0xF4, payload[-1] ^ 0xF3
           x is chosen so the XOR of every byte of the command is
           0x24 (3-byte payload) or 0x64 (2-byte payload)
report   = record... checksum(2)     (no header; several records per notification)
```

Malformed commands make the module **drop the connection**. A command whose header is wrong
is silently ignored.

## Commands (payload)

| Payload | Meaning |
| --- | --- |
| `41 06 vv` | volume, absolute (0x52–0x57 seen at normal listening) |
| `41 02 n` | input `n` |
| `41 03 n` | output mode `n` |
| `31 04` / `21 04` | mute on / off |
| `01 01` | report full state |

Changes made over Bluetooth are **not** reported back. Changes from the remote or the front
panel are. For relative volume, request the state, then write the new absolute level.

## Reports

| Record | Meaning |
| --- | --- |
| `c1 06 vv` | volume (streams while the motor turns) |
| `c1 02 n` | input |
| `c1 03 n` | output mode |
| `b1 04` / `a1 04` | muted / not muted |
| `a2 c9 nn`, `b2 c9 nn`, `a2 15 nn`, `a2 e6 nn` | seen in state reports. Meaning unknown. |

## Controller commands (registry `vendor` values)

Registry controls on this profile carry a `vendor` encoding whose `value` is one of:
`volume_up <step>`, `volume_down <step>`, `set_volume <level>`, `mute_on`, `mute_off`,
`mute_toggle`, `input_select <n>`, `input_next <count>`, `output_mode_next <count>`,
`query_status`. Relative and toggle commands read the state first.

A reference implementation is Lyr Bridge (`forkbeard.py`).
