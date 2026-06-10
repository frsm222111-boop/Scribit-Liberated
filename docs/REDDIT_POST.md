# Reddit post — draft

Post to r/scribit (and consider crossposting to r/plotters, r/functionalprint, r/3Dprinting for reach).
Reddit hates ads — keep it personal and useful, lead with the story, put links at the bottom.

**Before posting:** attach a short **GIF/video of the robot drawing** (single most important thing) and
2–3 screenshots of the UI (the gallery, the paint-mode color picker, a finished multi-color drawing on
the wall). Reddit ranks image/video posts far higher than link posts.

---

## Title (pick one)

- **My Scribit was bricked when the company died — so I rebuilt the software. It now runs 100% offline, free. (multi-color, gallery, paint-your-own)**
- **Brought a dead Scribit back to life: local-only firmware + browser control panel, no cloud, no account. Open source + pay-what-you-want.**

## Body

When Scribit's company folded, the cloud went dark and our robots turned into expensive wall ornaments — no app, no website, nothing. I refused to let mine become a brick, so I’ve been rebuilding the software around the open-source UnBrickIt project.

It now runs **100% locally** — the control panel is served straight off the robot's own flash, so you just connect to its Wi-Fi and open it in any browser. No account, no internet, nothing phoning home.

What it does now:

- **Guided calibration** that works at *any* anchor spacing (you don't need the original nail template)
- **Multi-color drawing** — tell it which marker is in each carousel slot and it routes colors to the right pen
- **Paint mode** — upload an SVG and *click or drag to color individual shapes* with the pen you want
- **~70 ready-to-draw designs** + a generative art studio (spirographs, flow fields, mazes, Hilbert curves…)
- **Photo → line art**, **text → line art**, **freehand draw**, and **QR codes**
- **Emergency stop** and a stop that actually halts mid-move

It's **free and open source (GPLv3)** and always will be. It also ate hundreds of hours, so it's pay-what-you-want if it saves your robot — totally optional.

Happy to answer questions, help anyone flash theirs, or take feature requests. If your Scribit is bricked, it's very likely recoverable.

**Code & flashing guide:** https://github.com/karimi/unbrickit
**If it saved your robot (optional):** https://ko-fi.com/kshrx

---

## First-comment (drop the "what changed recently" so the main post stays clean)

Recent additions if you've used UnBrickIt before: paint-mode per-shape coloring, the whole UI is now
gzip-compressed (loads way faster over the robot's hotspot), no more stale-cache after updates, an
emergency stop, persistent calibration ("calibrate once"), and a first-run setup guide. Full changelog
is in the repo.
