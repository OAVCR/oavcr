# Legal sources for OAVCR registry enrichment

OAVCR entries record **facts** about devices (manufacturer, model, category,
supported transports). We do **not** copy command strings, YAML protocol
files, or prose from third-party projects.

## Safe to use (facts + attribution)

| Project | URL | Licence | What we take |
|---|---|---|---|
| **avprotocol** / pyavcontrol | https://github.com/rsnodgrass/avprotocol | MIT (PyPI badge) | Device *existence*, manufacturer/model names, transport class (RS232/IP). Cite in `metadata.sources`. |
| **Flipper IRDB** | https://github.com/flipperdevices/IRDB | MIT | IR-capable product names/categories only — not `.ir` signal files in v1. |
| **IRext** | https://github.com/irext/irext | MIT | Product indexing facts; compressed code blobs stay external. |
| **Home Assistant integrations** | https://github.com/home-assistant/core | Apache-2.0 | Integration *existence* and protocol names (YNCA, MusicCast, etc.) — read integration docs for facts, never paste code. |
| **Manufacturer published specs** | Public web | N/A | Published input types, ports, protocol names. |

## Restricted — do not bulk-import

| Project | URL | Issue |
|---|---|---|
| **probonopd/irdb** | https://github.com/probonopd/irdb | Custom licence: requires issue filing, attribution notice, and free product copies to author. Not suitable for silent scraping. |
| **OpenAVC / avprotocol YAML command tables** | https://github.com/rsnodgrass/avprotocol | MIT on library, but command *expression* in YAML may encumber derived works — treat as reference for facts; rewrite any future driver definitions independently. |
| **AVEmu** | https://github.com/avcontrol/avemu | BSL — commercial use requires paid licence. |

## Lyr engineering policy

See `.cursor/rules/third-party-licensing.mdc`: read other projects for **facts**,
never copy **code** or **prose**. Every imported fact gets a `metadata.sources`
entry naming the upstream project URL.

## Suggested import workflow

1. Human reviews upstream device list (e.g. avprotocol `protocols/` tree).
2. Author creates a fresh OAVCR JSON entry with category + transport enums.
3. `metadata.sources` cites upstream; `verified: false` until hardware-tested.
4. `npm run oavcr:validate` before commit.
