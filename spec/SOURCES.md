# Legal sources for OAVCR registry enrichment

OAVCR records **facts** transcribed from manufacturer documents. There is no
Wikipedia-scale RS-232 dump we can legally scrape into command strings, and
the large IR collections either fail the licence test or fail the provenance
test (`source` URL on every control).

## What actually exists

| Corpus | Size / shape | Can we scrape encodings? |
|---|---|---|
| **Manufacturer PDFs / XLS** (Rotel, NAD, Arcam, Classé, McIntosh, JVC, Sony, Epson, …) | The real RS-232 + IR code sheets | **Yes** — this is the ingest path. Attribute the URL per command. |
| **avprotocol** / pyavcontrol | MIT YAML of RS-232/IP protocols for AVRs, processors, projectors | **No encodings.** Use as a shopping list of which models have serial; rewrite each command from the vendor PDF. |
| **Flipper-IRDB** (Lucaslhm / UberGuidoZ) | Large CC0 collection of captured `.ir` files (TVs, ACs, LEDs, some AV) | **Not as OAVCR controls.** Captured pulses have no manufacturer URL, so they fail the validator's `source` rule. Use only as “this product has IR”. |
| **flipperdevices/IRDB** | Official Flipper tree, MIT | Same: names/categories only, not `.ir` blobs. |
| **probonopd/irdb** | One of the largest IR CSV sets | **No.** Custom licence: file a GitHub issue, ship an attribution notice, and give the author up to three free copies of the product. Silent scrape is a licence breach. |
| **LIRC remotes** | Huge `lircd.conf` tree | **No.** LIRC is GPL-2.0-or-later; do not copy configs. |
| **Global Caché Control Tower** | The professional IR database | **No.** Login-walled; complete code sets are for verified users. Not free to scrape. |
| **Logitech Harmony** | Historically the biggest consumer IR DB | **No.** Proprietary; the Hub API is shut down. |
| **Remote Central** | User-submitted Pronto hex | **No.** Site ToS; not a scrape target. |
| **Crestron / Control4 / Savant / RTI modules** | The integrator RS-232/IR DBs | **No.** Proprietary driver packages. |
| **AVEmu** | Emulator + protocol tables | **No.** BSL — commercial use needs a paid licence. |
| **IRext** | MIT compressed IR blobs | Product indexing only; blobs stay external. |
| **Home Assistant** | Apache-2.0 integrations | Protocol *names* (YNCA, MusicCast, ESC/VP21) — never paste integration code. |

The enrichment loop is: open DB tells us a model exists and has RS-232 or IR →
find the manufacturer protocol sheet → transcribe into a fresh JSON file.
Cite the document in `metadata.sources`; add a per-command `source` only when
it differs.

## Safe to use (facts + attribution)

| Project | URL | Licence | What we take |
|---|---|---|---|
| **avprotocol** / pyavcontrol | https://github.com/rsnodgrass/avprotocol | MIT | Device *existence*, manufacturer/model names, transport class (RS232/IP). Cite in `metadata.sources`. |
| **Flipper IRDB** | https://github.com/Lucaslhm/Flipper-IRDB | CC0-1.0 (post-2319685) | IR-capable product names/categories only — not `.ir` signal files. |
| **IRext** | https://github.com/irext/irext | MIT | Product indexing facts; compressed code blobs stay external. |
| **Home Assistant integrations** | https://github.com/home-assistant/core | Apache-2.0 | Integration *existence* and protocol names — read docs for facts, never paste code. |
| **Manufacturer published specs** | Public web | N/A | Command encodings, serial parameters, IR protocol, ports. |

## Restricted — do not bulk-import

| Project | URL | Issue |
|---|---|---|
| **probonopd/irdb** | https://github.com/probonopd/irdb | Custom licence: issue filing, attribution notice, and free product copies to the author. |
| **OpenAVC / avprotocol YAML command tables** | https://github.com/rsnodgrass/avprotocol | MIT on the library; command *expression* in YAML is still not ours to paste. Rewrite from the vendor PDF. |
| **AVEmu** | https://github.com/avcontrol/avemu | BSL — commercial use requires a paid licence. |
| **LIRC remotes** | https://sourceforge.net/p/lirc-remotes/ | GPL-2.0-or-later. |
| **Global Caché Control Tower** | https://irdb.globalcache.com | Login-walled professional DB. |
| **Logitech Harmony / Remote Central** | — | Proprietary / ToS. |

## Out of scope: streamers and app-controlled network players

A streamer already has Ethernet and a vendor app (or Roon / UPnP / AirPlay).
OAVCR cannot add a control path Lyr Link would use. Do not add `streamer` or
`network_player` entries, and do not keep “network only / no RS-232” stubs for
them. Lyr already talks to those boxes as players.

Hybrids that are primarily a DAC, preamp, amp, or AVR **and** happen to stream
may stay in their hardware category **if** they expose RS-232, IR, or a trigger
Lyr Link can send. Network-only DACs with no serial/IR (Bartók / Rossini as
streamers, etc.) are the same as streamers: leave them out until a non-network
control path is documented.

## Lyr engineering policy

See `.cursor/rules/third-party-licensing.mdc`: read other projects for **facts**,
never copy **code** or **prose**. Every imported fact gets a `metadata.sources`
entry naming the upstream project URL.

## Suggested import workflow

1. Human reviews an upstream device list (e.g. avprotocol `protocols/` tree) as
   a shopping list — not as a command source.
2. Find the manufacturer protocol PDF/XLS.
3. Author a fresh OAVCR JSON entry. Cite the document in `metadata.sources`.
   Per-command `source` only when it differs.
4. `verified: false` until hardware-tested.
5. `npm run oavcr:validate` before commit.
