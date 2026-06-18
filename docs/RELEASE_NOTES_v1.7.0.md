# Scribit Liberated v1.7.0

A big reliability + UX release. Drawings no longer die partway through, pens stay seated on long
jobs, and the whole control panel got reorganized and polished — plus new tools you asked for.

**Flashing:** download `ScribitESP.ino.bin` below and follow the flashing guide
(`docs/FLASHING.md`). It's an over-the-air flash — hold the LED button to enter update mode.

## ✨ New
- **Calibration Test** (Setup → Test) — 5 built-in patterns (vertical, horizontal, square + diagonals,
  circle, crosshair), drawn with **all four pens** or a **single pen**, with a live color preview.
- **Pause / Resume mid-draw** — stop to swap a dried marker or make an adjustment, then resume right
  where you left off. No restart.
- **Live wall-preview** — a mini-canvas fills in the drawing on-screen as the robot plots it
  (progress %, completed path highlighted).
- **Persistent action bar** — Pause and Stop are always one tap away while drawing, from any tab.
- **Screen wake-lock** while drawing, so a sleeping phone/laptop screen can't stall the feed.

## 🛠 Changed
- **Control panel reorganized** — 12 flat tabs collapsed into **4 areas** (Home / Create / Setup /
  Our Story) with a contextual sub-switcher, plus a cohesive visual facelift on the blueprint theme.
- Removed the old single-pen "Draw Test Pattern" (superseded by the new Calibration Test).

## 🐞 Fixed
- **Drawings dying partway through.** A single dropped/slow Wi-Fi request used to abort the entire job.
  Lines are now streamed with sequence numbers and **retried idempotently** — the firmware dedupes
  resends, so a retried *relative* move is never drawn twice. A flaky hotspot no longer kills a drawing.
- **Pens stopping mid-draw (robot moves but nothing marks).** The motion controller auto-disabled the
  **Z stepper** (the pen carousel/cam) after 120s of inactivity, which un-seats the pen so it only
  rotates instead of pressing. Every drawing now sends **`M84 S0`** at startup to keep the pen-cam
  energized and seated through pauses.

## ⚠️ Notes
- The robot's control panel is served over its own Wi-Fi AP (`ScribIt-xxxxxx`, open network) at
  `http://192.168.240.1:8888/`. Drive a *drawing* from one device at a time — the on-robot web server
  is single-threaded.

Full details in [`CHANGELOG.md`](../CHANGELOG.md).
