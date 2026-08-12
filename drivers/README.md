# OAVCR drivers

**There is no per-device code, and that is the design.** A device's driver is
its `registry/devices/<id>.json` entry: the framing, the byte strings, the IR
protocol and codes are all data, so a controller implements each *transport*
once and every device in the registry works. Adding an amplifier never means
shipping a new module — see `../CONTRIBUTING.md`.

What belongs in this directory is the small amount of code that is genuinely
per-transport rather than per-device, once it is worth factoring out of the
implementations:

```
drivers/
  rs232/   framing, retries, reply matching
  ir/      RC-5 / NEC / Pronto waveform generation for IR emitters
  http/
```

Reference implementations of the first two exist in Lyr's own client of this
registry (`server/link/transports.ts` in the Lyr tree): serial over raw TCP or
a Global Caché IP2SL, and IR via a Global Caché IP2IR, with RC-5 and NEC
waveforms generated from the codes in the registry. They are not vendored back
here yet because they are still being exercised against real hardware.

Contributors: implement against the OAVCR Control Specification. Do not
transliterate YAML or source from pyavcontrol, avprotocol, or LMS-UPnP — write
from your own reading of manufacturer documentation.
