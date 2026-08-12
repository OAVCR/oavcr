# OAVCR transports (v1)

| Transport | Description |
|---|---|
| `rs232` | RS-232 serial (DE-9, phoenix, etc.) |
| `rs485` | RS-485 multi-drop serial |
| `ir` | Infrared remote codes |
| `ip` | Raw TCP/UDP socket protocol |
| `http` | HTTP/REST control API |
| `websocket` | WebSocket control channel |
| `usb` | USB serial or HID |
| `cec` | HDMI Consumer Electronics Control |
| `gpio` | GPIO trigger lines |
| `bluetooth` | BLE / classic BT control profile |

Driver implementations live in `drivers/` (future). Registry entries declare
which transports a device *supports*; Lyr Link (or other hosts) load drivers
separately.
