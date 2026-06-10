# Scribit Liberated — What You Get

Your Scribit was a **cloud-dependent** wall-drawing robot: it needed Scribit's servers and app to
do anything. When those servers went dark, the robot was a paperweight. **Scribit Liberated**
reflashes it to run **100% locally** — no cloud, no account, no internet — and then goes far past
what the original ever did.

This is the user-facing summary of what's different. (Developers: see `CHANGELOG.md` for the
detailed, versioned log, and `docs/TROUBLESHOOTING.md` for fixes.)

---

## vs. the original (cloud) Scribit

| | Original Scribit | Scribit Liberated |
|---|---|---|
| Works without internet | ❌ cloud required | ✅ fully local |
| Account / app required | ✅ | ❌ none |
| Still works (servers gone) | ❌ bricked | ✅ |
| Control | phone app via cloud | **browser UI on your network** |
| Make your own art | limited | **7 built-in tools** (below) |
| Multi-color | manual | **automatic pen-switching** |
| Open / self-hostable | ❌ | ✅ open, pay-what-you-want |

---

## A real drawing engine

- **Straight lines stay straight.** The converter segments moves in Cartesian space and does the
  string-bot math properly, so shapes don't bow into arcs.
- **Multi-color drawings** with automatic carousel **pen-switching** between colors.
- **Stream mode** feeds the drawing line-by-line into RAM, **bypassing the broken/tiny SPIFFS**
  that stalled the original upload path — so any size drawing works.
- **Clean pen handling** — travel moves lift clear of the wall (no stray lines), and the pen
  plunge is tuned so the first press of every shape lands reliably.

## Seven ways to make art (the original had none of these)

- **Upload** your own SVG or G-code
- **Generative** art patterns
- **Image → line-art** (photo to plotter drawing)
- **Text** plotting in multiple fonts
- **Gallery** of ready-made designs
- **QR codes** from any link/text
- **Freehand draw** in the browser
- Plus: **click any shape to assign its pen color**, and a **preview tinted to your wall color**
  so dark markers are actually visible before you draw.

## Control & safety

- A complete **browser control panel** — home, pause, resume, calibrate, jog.
- **Stop that actually stops** (aborts moves already in the motion buffer), plus an
  **Emergency Stop** that cuts motor power to halt a jam/grind.

## Setup that works

- **Guided calibration** (anchor distance + pen position) and a **Pen Rack** so each color routes
  to the right marker.
- A documented **SAMD reflash** path that revives units whose pen won't press at all.
- A symptom-first **Troubleshooting / FAQ** guide.

---

*Scribit Liberated is community-built and pay-what-you-want. If it brought your robot back to
life, that's the point.*
