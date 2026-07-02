# Reddit post — draft (v1.7.0)

Post to r/scribit (and consider crossposting to r/plotters, r/functionalprint, r/3Dprinting for reach).
Reddit hates ads — keep it personal and useful, lead with the story, put links at the bottom.

**Before posting:** attach a short **GIF/video of the robot drawing** (single most important thing) and
2–3 screenshots of the UI (the gallery, the paint-mode color picker, a finished multi-color drawing on
the wall). Reddit ranks image/video posts far higher than link posts.

---

## Title (pick one)

- **My Scribit got bricked when the company folded — so I rebuilt the software. It now runs 100% offline and free: multi-color, a gallery, paint-your-own, and it draws on any wall.**
- **Brought a dead Scribit back to life — local-only firmware + a full browser control panel. No cloud, no account. Open source, pay-what-you-want.**
- **They killed the cloud and bricked thousands of Scribits. I rebuilt it to run entirely on your own wall — multi-color, generative art, live drawing preview. (open source)**

## Body

When Scribit's company folded, the cloud went dark and our robots turned into expensive wall ornaments — no app, no website, nothing. I refused to let mine become a brick, so I’ve been rebuilding the software around the open-source UnBrickIt project.

> **One thing up front (people keep asking):** you do **not** flash "UnBrickIt" first. **Scribit Liberated _is_ the firmware you flash** — UnBrickIt is just the open-source project it's built on, not a separate step. It works on a brand-new/stock Scribit *and* one already converted to local mode; the only difference is how you put it into update mode, and the flashing guide covers both.

It now runs **100% locally** — the control panel is served straight off the robot's own flash, so you just connect to its Wi-Fi and open it in any browser. No account, no internet, nothing phoning home.

What it does now:

- **Guided calibration** that works at *any* anchor spacing (you don't need the original nail template)
- **Multi-color drawing** — tell it which marker is in each carousel slot and it routes colors to the right pen
- **Paint mode** — upload an SVG and *click or drag to color individual shapes* with the pen you want
- **~70 ready-to-draw designs** + a generative art studio (spirographs, flow fields, mazes, Hilbert curves…)
- **Photo → line art**, **text → line art**, **freehand draw**, and **QR codes**
- **A built-in Calibration Test** — 5 patterns (lines, square, circle, crosshair) on one pen or all four, to dial in squareness and roundness
- **Pause & resume mid-drawing** — stop to swap a dried marker or make an adjustment, then pick up right where it left off
- **A live on-screen preview** that fills in as the robot plots, with progress and an always-handy Stop
- **Rock-solid over Wi-Fi** — drawings used to die partway through on a flaky hotspot; now a hiccup just pauses and resumes instead of killing the job
- **Emergency stop** and a stop that actually halts mid-move

It's **free and open source (GPLv3)** and always will be. It also ate hundreds of hours, so it's pay-what-you-want if it saves your robot — totally optional.

Happy to answer questions, help anyone flash theirs, or take feature requests. If your Scribit is bricked, it's very likely recoverable.

**Code & flashing guide:** https://github.com/frsm222111-boop/Scribit-Liberated
**Ready-to-flash firmware (v1.7.0):** https://github.com/frsm222111-boop/Scribit-Liberated/releases/tag/v1.7.0
**If it saved your robot (optional):** https://ko-fi.com/kshrx

---

## Pinned/first-comment FAQ — "do I need to flash UnBrickIt first?"

> Short answer: **no.** Scribit Liberated **is** the firmware — you flash it directly, whether your Scribit is brand-new/stock or already converted. There's no separate "UnBrickIt" install in between (it's just the open-source project this is built on). Grab two files from the [Releases page](https://github.com/frsm222111-boop/Scribit-Liberated/releases/latest) — the firmware `ScribitESP.ino.bin` **and** the bundled `espota.py` (use that one, not a random copy) — and follow the [Flashing guide](https://github.com/frsm222111-boop/Scribit-Liberated/blob/main/docs/FLASHING.md). The only thing that changes between a stock unit and an already-converted one is **how you enter update (OTA) mode**: a stock unit gets *told* to over Wi-Fi (POST your creds to `:8888`); an already-local unit enters by **holding the LED button** through power-on. Both are written out step-by-step in the guide.

## Pinned/first-comment FAQ — "connects and says Drawing but never moves (no motor sound)?"

> Your Scribit has **two** chips: the Wi-Fi board (`ScribitESP.ino.bin`, what you normally flash) and a **separate motor-control chip (SAMD21)** running `MK4duo.ino.bin`. If the web UI works and drawings reach 100% but the robot never physically moves, some units ship with **generic motor firmware** that acks commands but can't drive the motors — and updating only the Wi-Fi board won't fix it. **Quick check:** POST `M777` to `:8888/gcode`, then read `:8888/samd` — if it replies `Unknown command: "M777"`, the motor chip needs flashing. **Fix:** flash the `MK4duo.ino.bin` from the [Releases page](https://github.com/frsm222111-boop/Scribit-Liberated/releases/latest) to the motor board (the UnBrickIt desktop app does this as its "2/2 SAMD21" step; or manually via `espota.py … -c -f MK4duo.ino.bin`). Full steps in the [Flashing guide](https://github.com/frsm222111-boop/Scribit-Liberated/blob/main/docs/FLASHING.md).

## First-comment (drop the "what changed recently" so the main post stays clean)

Recent additions in v1.7.0 if you've used UnBrickIt before: the whole control panel was reorganized
(12 tabs → 4 clean areas) and got a facelift; a built-in Calibration Test (5 designs, single pen or
all 4); Pause/Resume mid-draw; a live wall-preview that fills in as it plots; and a big reliability
fix — drawings are streamed line-by-line and now retry on a Wi-Fi hiccup instead of aborting, plus a
fix for pens that would stop pressing on long jobs (the motion chip was auto-disabling the pen-cam
after 120s idle). Earlier additions: paint-mode per-shape coloring, gzip-compressed UI (loads fast
over the robot's hotspot), no stale-cache after updates, emergency stop, persistent calibration
("calibrate once"), and a first-run setup guide. Full changelog is in the repo.
