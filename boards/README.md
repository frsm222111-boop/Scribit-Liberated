# Vendored board index

`package_briki_index.json` is a known-good copy of the Briki **MBC-WB** board-manager index.

## Why it's here

Briki's official index URL — `https://www.briki.org/download/resources/package_briki_index.json` —
is **defunct**. It now 301-redirects to an HTML page, so `arduino-cli core update-index`
(and the Arduino IDE Board Manager) read HTML instead of JSON and fail with:

```
Error initializing instance: ... parse error: syntax error near offset 0 of '<!DOCTYPE ...'
Invalid argument passed: Platform 'briki:mbc-wb@2.0.0' not found
```

The board core and toolchain ZIPs this index references are still hosted and **live** on
`download.meteca.org` (Meteca is the company behind Briki) — only the *index* URL died. So
building works fine when arduino-cli is pointed at this vendored copy instead of briki.org.

## How it's used

- **Docker build** (`docker/Dockerfile`): copied into the image and passed as
  `file:///tmp/package_briki_index.json`.
- **Arduino IDE / manual** (`FIRMWARE.md`): add the raw-GitHub URL of this file to
  *Preferences → Additional Board Manager URLs*:
  `https://raw.githubusercontent.com/frsm222111-boop/Scribit-Liberated/main/boards/package_briki_index.json`

If Meteca's servers ever go down too, the 138 MB core would need to be mirrored as well
(the ZIP URLs in this file would then be rewritten to point at the mirror).
