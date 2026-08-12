# OAVCR categories (v1)

| Category | Typical role in chain |
|---|---|
| `dac` | Digital-to-analog converter |
| `preamp` | Line-level preamplifier |
| `amplifier` | Power amplifier |
| `avr` | AV receiver (multi-channel) |
| `processor` | Room correction / bass management / HT processor |
| `speaker` | Active speaker system (passive or powered **without** a vendor app as the control path) |
| `television` | TV display |
| `projector` | Video projector |
| `disc_player` | CD/SACD/Blu-ray transport |
| `screen` | Projection screen or masking |
| `other` | Catch-all |

## Out of scope

| Category | Why it stays in the schema but not the registry |
|---|---|
| `streamer` | A streamer already has Ethernet and a vendor app. OAVCR has nothing to add. |
| `network_player` | Same: UPnP/AirPlay/Cast endpoints are already players in Lyr. |

Do not file entries in those two categories. A box that streams **and** is a
DAC/preamp/amp/AVR belongs in the hardware category, and only if it exposes
RS-232, IR, or a trigger Lyr Link can send.

Stages in a Lyr Link chain are ordered left → right following signal flow
(source-adjacent first, speakers last).
