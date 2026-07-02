# Changelog

All notable changes to this project are documented here.

## [Unreleased]

## [1.7.3] - 2026-07-01

### Fixed
- **"Center on wall" no longer looks broken when the robot is already centered.** If the robot
  is already at (within ~3 mm of) the wall center, there is no distance to travel, so the old
  code silently sent `G1 X0.000 Y-0.000` — no motors moved and it looked like a failure. It now
  detects this, skips the no-op move, still records center as home, and tells you plainly:
  *"Already at center — no travel needed… to test movement, use the jog arrows or draw a test
  pattern."* (`app.js`)
- **Robot no longer gets stuck showing "PRINTING" after a drawing finishes.** If the motor
  board's final acknowledgement was missed at the end of a browser stream, the device could stay
  in PRINTING forever (never returning to IDLE), blocking the next drawing. Added a return-to-IDLE
  watchdog: once the browser has finished feeding, the buffer is drained, and the motor board has
  stayed idle for ~3 s, the stream is force-ended and the device returns to IDLE. The watchdog only
  fires when the draw is genuinely done, so it never cuts a live drawing short.
  (`SISerialManager.cpp`, `SISerialManager.hpp`)

### Added
- **Richer "Report a problem" diagnostics for the "robot won't move" case.** Each draw attempt in
  the diagnostic report now shows: **commanded pen-plane travel** (X/Y mm — instantly flags a
  zero-distance move like an already-centered "Center on wall"), whether the **motor board ever went
  "busy"/executed** during the feed (if travel was commanded but it never executed → points at the
  motor board, not the firmware), and the **raw motor-board serial replies** captured at end of feed.
  Turns "it didn't move" into an actionable software-vs-hardware verdict. (`app.js`)

## [1.7.2] - 2026-06-29

### Fixed
- **Robot reports "Drawing" but never moves (the real fix).** On this generation of Scribit the
  motor board (SAMD) deadlocks — stuck on `busy:processing` forever while the robot keeps reporting
  `PRINTING` and the on-screen percentage climbs — when g-code is streamed into it pipelined/fast.
  This is what 1.7.1's diagnostic warning was catching but not curing. The web UI now **paces the
  stream one command at a time**: after each line is accepted it waits for the motor board to
  actually finish that move (polling `/samd`, flushing with `M114`) before sending the next, and
  retries the slow carousel-home (`G77`) with `M410` if it hangs. Drawings now run start-to-finish
  instead of locking up after the first move. The progress percentage also now tracks real draw
  progress rather than how fast lines were shoved at the robot. (`app.js`)

### Added
- **"Motor board not detected" warning.** The Wi-Fi board and the motor controller (SAMD/MK4duo)
  sync at boot; if that sync fails the robot used to serve the web UI and silently run in "local
  mode" — accepting a drawing and reporting "PRINTING" while never moving or making a sound. The
  firmware now reports the sync result (`samd` field in `/status`), and Device Controls shows the
  motor-board state plus a loud banner telling you to power-cycle. No more phantom "Drawing".
  (`ScribIt.hpp`, `ScribIt.cpp`, `ScribIt_wifi.cpp`, `app.js`, `index.html`, `style.css`)
- **"Report a problem" diagnostic report.** Device Controls now has a panel where you describe the
  issue and download a plain-text report bundling robot info, firmware version, motor-board sync
  state, your calibration/settings, and the **last 2 draw attempts** (lines sent, % reached, result,
  errors, and the first/last g-code lines). Gives support something concrete to read when a drawing
  won't run. The attempt log persists across a disconnect/reconnect. (`app.js`, `index.html`, `style.css`)
- **Post-draw support prompt.** When a drawing finishes — the moment you're happiest with the robot —
  the UI shows one gentle, dismissable card inviting you to support the project. It's **frequency-capped**
  (first completed draw, then at most once a week) and disappears for good once you support or pick
  "Don't show this again." The existing passive links (nav, footer, "Our Story") are unchanged. (`index.html`, `app.js`, `style.css`)
- **Prominent download buttons + live download badge.** The README and flashing guide now lead with a
  clear "⬇️ Download the firmware" call-to-action, and the README shows a live total-downloads badge.
- **GitHub Sponsor button** via `.github/FUNDING.yml` (Ko-fi + UnBrickIt).

## [1.7.0] - 2026-06-16

### Added
- **Reliable drawing over Wi-Fi (idempotent streaming).** Drawings are streamed to the robot
  one g-code line at a time; previously a *single* dropped or slow request aborted the whole job,
  so a drawing would die partway through. Each line is now tagged with a sequence number and
  **retried** on a hiccup, and the firmware **dedupes** resent lines — so a retried *relative*
  move is never drawn twice. A flaky hotspot no longer kills a drawing. (firmware + `app.js`)
- **Calibration Test panel (Setup → Test).** Five built-in test designs — **vertical lines,
  horizontal lines, square + diagonals, circle, and crosshair** — that you can draw with **all
  four pens** at once or a **single pen**, with a live preview in your real marker colours. Great
  for checking squareness/roundness/centering and that every pen presses. (`index.html`, `app.js`)
- **Pause / Resume mid-draw.** Pause stops feeding so the robot holds in place — swap a dried
  marker or make an adjustment — then Resume right where you left off, no restart. (`app.js`)
- **Persistent draw action bar.** Whenever the robot is drawing, a floating bar shows live
  progress and keeps **Pause** and **Stop** one tap away from any tab. (`index.html`, `app.js`, `style.css`)
- **Live wall-preview.** A mini-canvas fills in the drawing on-screen as the robot plots it
  (faint full path, bright completed portion, leading dot, live %). (`index.html`, `app.js`, `style.css`)
- **Screen wake-lock while drawing.** Holds a wake-lock for the duration of a draw so a phone or
  laptop screen sleeping mid-job can't stall the line feed. (`app.js`)

- **Manual move: a jog D-pad in the Calibrate tab.** Up / down / left / right buttons with a
  step picker (1″ / 6″ / 12″ / 24″) nudge the robot with the pen up, using true two-string
  kinematics (convert tracked position → x/y, step, convert back) so directions are genuinely
  cardinal — not the diagonal-coupled raw-string jog. Includes a live position readout and
  anchor-line / past-anchor safety limits; the tracked `MACHINE_POS` updates after each move.
  (`index.html`, `app.js`, `style.css`)
- **Place-on-wall: drag and resize your drawing.** The Upload tab now shows a wall mini-map —
  your wall to scale, the robot's position, your set canvas box, and a box sized to your drawing's
  real dimensions. **Drag** it anywhere (clamped to the reachable/canvas area) and **resize** it
  with a Size slider (live cm readout), instead of always drawing 1:1 centered on the robot.
  Implemented via new `offsetX`/`offsetY`/`scale` options in the g-code generator.
  (`index.html`, `app.js`, `style.css`)

### Changed
- **Reorganised the whole control panel.** The 12 flat tabs are now **4 areas** — Home, Create,
  Setup, Our Story — with a contextual sub-switcher (the seven art tools live under *Create*; the
  setup panels under *Setup*). Plus a cohesive facelift: unified spacing, cleaner section headers,
  a brighter hero, and smoother micro-interactions — all keeping the blueprint look. (`index.html`, `app.js`, `style.css`)
- **Removed the old single-pen "Draw Test Pattern"** from Controls — superseded by the new
  Setup → Test panel (5 designs, single-pen or all-4). (`index.html`, `app.js`)
- **Robot illustrations now match the real carousel.** The pen-slot dots in every robot graphic
  (header hero, Home hero, and the setup-wizard Welcome / Mount / Pen / Draw illustrations) were
  rearranged from a symmetric top/right/bottom/left diamond to the **real layout**: four pens
  clustered with the empty 5th socket as a **gap on the right**. The Home hero and wizard robot
  bodies were also changed from rounded rectangles to **circles** to match the physical robot.
  (`index.html`, `app.js`)

### Fixed
- **Drawings dying partway through — fixed.** A single dropped/slow stream request used to abort
  the whole job. Lines are now retried idempotently (see *Reliable drawing over Wi-Fi*), so a
  brief Wi-Fi hiccup pauses and resumes instead of killing the drawing.
- **Pens stopping mid-draw (robot moves but nothing marks) — fixed.** The motion controller was
  configured to auto-disable the **Z stepper** after 120 s of inactivity (`M84` inactivity
  timeout). On Scribit, Z is the **pen carousel/cam**, so disabling it **un-seats the pen** — after
  that, every pen-down just rotates the carousel instead of pressing. Each drawing now sends
  **`M84 S0`** at startup to disable that timeout, keeping the pen-cam energized and seated through
  any stream pauses. (firmware + `app.js`)
- **"Center robot on wall" now works after the robot has drifted.** It computed its move from the
  *calibrated home* instead of the robot's *tracked actual position*, so a robot that had drifted
  (e.g. after a stopped/interrupted draw) got a wrong delta — and when home ≈ centre, the move came
  out ~0, so the robot only homed the carousel and never travelled. It now moves from the tracked
  `MACHINE_POS`. (`app.js`)
- **Multi-colour SVG layouts no longer collapse onto one point.** `scribit_svg_to_gcode.py`
  centred *each path on its own bounding box*, so every colour group stacked on the same spot
  instead of keeping its position in the drawing. It now centres on the **global** bounding box
  across all paths, so multi-pen artwork lands laid out as designed. (Single-path drawings are
  unaffected.)

### Notes
- `scribit_svg_to_gcode.py --stats` is a **dry run** — it prints statistics and does *not* write
  the output file. Omit `--stats` to actually generate g-code.
- Pen switching is **forward-only** and assumes paths are encountered in **ascending slot order**
  (slot1→2→3→4). The default greedy path optimiser reorders by proximity and can break pen
  selection on multi-colour jobs — use `--no-optimize` and author paths in slot order. (Robust
  fix for the optimiser is still open.)

## [1.6.0] - 2026-06-09

### Added
- **Home screen (always-on landing view).** A new **Home** tab — now the default view when you
  open the panel — with the animated hero (robot drawing on the wall), the tagline, a one-line
  intro, a **Get started** button (launches the setup wizard), and quick-jump cards to Calibrate /
  Gallery / Upload / Generative. (`index.html`, `app.js`, `style.css`)
- **Uses the whole screen on desktop.** The layout was locked to a 540px mobile column, wasting
  most of a monitor. The container is now responsive (up to ~1080px / 95vw) and the form-heavy
  setup sections **tile into balanced columns on wide screens** (order preserved, blocks kept
  intact, titles span full width). Phones are unchanged. (`style.css`)
- **Animated first-run landing / setup experience.** The guided setup now opens with a polished,
  illustrated walkthrough: a **welcome hero** of the robot hanging between two anchors gently
  swaying while it draws a curve (that re-draws itself), an animated **mounting** diagram, the
  marching **tape-measure calibration** illustration, a **pen-carousel** with a pulsing slot-1
  highlight, and a **self-drawing star** for the first-draw step. All pure inline SVG + CSS
  keyframes (no libraries, tiny), and it honors `prefers-reduced-motion`. Auto-opens on first run;
  reopen anytime via "Setup guide" at the bottom. (`app.js`, `style.css`)
- **Paint mode — color your drawing by hand.** Opt-in via a **"Paint shapes by hand" toggle**
  (off by default) in the Upload tab. Turn it on to get a brush palette: **pick a pen and click or
  drag across the preview to paint shapes** that pen (mouse *and* touch). Includes a **Skip brush
  (⊘)** to mark a shape as *don't draw* — e.g. an SVG background you don't want plotted — and a
  **Reset** to clear all hand-painting. Solid/filled shapes show filled in the pen's real color
  (softened so you can still see the art); line shapes show in the pen color; skipped shapes show
  faint dashed. The intuitive "coloring-book" way to route parts of a drawing to specific pens,
  alongside the whole-color dropdowns. Granularity follows the SVG (each separately-defined shape
  is its own region). Also fixes a bug where a file's own `style="stroke:…"` could override the
  preview so assignments didn't show. (`app.js`, `index.html`, `style.css`)
- **No stale UI after an update.** The firmware now sends `Cache-Control: no-cache` for the web
  UI, so a freshly-flashed interface appears on a normal reload instead of the browser showing a
  cached old copy. (`ScribIt_wifi.cpp`)
- **Clearer pen assignment (shows the *real* pen color).** The Upload tab's "Pen assignment"
  panel was confusing: it showed each *file* color and a pen *label*, but never the pen's actual
  color — so a row could read "Pen 2 · Black" while the preview drew it green (labels can drift
  from colors). Each row now reads **[file color] → [actual pen color] [Pen N · label]**, and the
  pen swatch updates live as you change the dropdown, so the panel, the dropdown, and the preview
  all show the same colors. (`app.js`, `index.html`, `style.css`)
- **Gzip-compressed embedded web UI (smaller, faster, OTA-safe).** The web assets baked into
  the firmware (`index.html`, `app.js`, `qrcode.js`, `style.css`) are now gzip-compressed in
  flash and served with `Content-Encoding: gzip` — **263 KB → 64 KB (−75%)**. This shrank the
  firmware below the 1.25 MB OTA app-partition limit (it had grown ~10 KB over, which silently
  broke every over-the-air update — `Update.end()` failed because the image didn't fit), and it
  makes the UI load faster over the robot's hotspot. Browsers inflate it natively. Done in
  `tools/gen_web_ui.py` (compresses + tags each asset) and `ScribIt_wifi.cpp` (sends the encoding
  header). Keep the built firmware under 1,310,720 bytes or OTA will break again. (`web_ui.h`)
- **Machine-position tracking ("calibrate once").** The robot has no position memory and no XY
  home — it only knows where it is by accumulating moves from a known reference. The app now
  persists that reference (`scribit_mpos`), seeds it from your calibration, and updates it from
  the net travel of every streamed job, so it knows where the robot is **across drawings and page
  reloads** (no re-calibrating each session). Before an Upload draw it **warns if the robot has
  drifted** from its calibrated home (suggesting "Center on wall") instead of silently drawing
  off-position. Deliberately does *not* auto-drive a correction (which could lunge toward an
  anchor) — it informs, you re-center (`app.js`).
- **Visual calibration guidance.** The live calibration schematic now labels the dimensions
  (**① anchor distance**, **② horizontal from left**, **③ vertical drop**), and the first-run
  **setup wizard's Calibrate step** shows a matching labeled diagram with gently "marching"
  dimension lines (a tape-measure feel) so first-time users see exactly what to measure
  (`app.js`, `style.css`).
- **`FEATURES.md` — user-facing "what's different from the original" guide.** A concise,
  non-developer summary comparing the cloud-locked original Scribit to Scribit Liberated
  (local operation, the 7 art tools, multi-color, control + safety, setup), so users understand
  the value at a glance. (`CHANGELOG.md` remains the detailed dev log.)
- **Click-to-assign pen colors per shape (SVG).** Beyond the existing color→slot mapper, you can
  now **click any shape in the Upload preview** to cycle that individual path through the pens —
  an "area highlighter" for coloring specific parts of a drawing, even when they share a source
  color. Per-path overrides flow into the converter via a new `penOverride` option and win over
  the color map; they reset when a new file is loaded (`app.js`, `index.html`).
- **Emergency Stop + a Stop that actually halts.** The old Stop set a cancel flag and called
  `/stop`, but moves already in the motion buffer kept running (it couldn't interrupt a jam).
  Stop now also sends **`M410`** (quickstop) to abort in-flight moves while keeping the steppers
  energized (robot stays held). A new always-available **EMERGENCY STOP** button additionally
  sends **`M18`** to cut motor power so the steppers stop driving into a jam/grind — with a clear
  warning that the robot is no longer held and must be supported (`index.html`, `app.js`,
  `style.css`).
- **Preview wall-color setting.** Drawing previews rendered on the dark navy theme, so black
  and dark markers were nearly invisible. Settings → **Preview wall color** now tints every
  preview (Upload color-assign, Generative, Image, Text, Gallery, Draw, QR) to your actual wall
  color via a `--wall` CSS variable, with a live preview while you pick. Strokes now look like
  they will on the wall (`index.html`, `app.js`, `style.css`).
- **Troubleshooting / FAQ guide** (`docs/TROUBLESHOOTING.md`) — symptom-first fixes for the
  issues users actually hit: UI won't load (WiFi adapter), dried/faint pens, dashed lines on
  textured walls, stray lines, missing edges, skew/distortion (calibration + string-notch
  mismatch), drawings landing off-position (no XY home), **carousel jam / grinding recovery +
  emergency stop**, pen-never-presses (SAMD reflash), robot drop safety, and the webcam
  single-app limit.

### Changed
- **Renamed the Upload tab's action button "Upload" → "SEND / DRAW NOW!"** — it sends the
  loaded file to the robot and starts drawing immediately; "Upload" read as a passive
  file-staging step (`index.html`).

### Fixed
- **File picker opened twice when choosing a file to draw.** The drop-zone fired the file
  dialog from both an inline `onclick` (HTML) and a duplicate JS click listener, so one
  click popped two pickers. Removed the JS listener; the inline handler is the single
  source (`app.js`).
- **Stray line during multi-color drawings.** Pen-up travel moves (between strokes and
  after a carousel pen-switch) happened at the pen's rest height, where a long/soft marker
  tip can still graze the wall and drag a faint line — most visible on the long travel to
  the next color. `svgToGcode` now lifts the pen to a dedicated **travel-clearance height**
  (rest + 12mm, kept below the 72° carousel-index step) for all non-drawing moves and
  presses back symmetrically, so there's no net Z drift and travel never touches the wall
  (`app.js`).
- **Hardened the pen plunge.** With the travel clearance above, plunging straight from
  clearance to mark depth would have been a single ~−42 Z move — close to the ~−44
  carousel-index threshold, where a press can index the carousel instead of pressing. All Z
  state changes now route **through the rest position**, so the plunge is always the
  known-good −pd (−30) move and never approaches the index threshold (`app.js`).

### Added
- ⭐ **Stream mode — drawings now bypass SPIFFS entirely.** On units with a broken/tiny
  SPIFFS partition, `/upload` (which writes the whole g-code file to SPIFFS *before*
  drawing) stalls on anything but the smallest jobs — it silently blocked every
  browser print. New path streams the drawing **line-by-line into a RAM buffer that
  drains to the SAMD21 with the normal ack-based flow control**, never touching SPIFFS,
  so file size no longer matters.
  - Firmware: new `POST /stream/start` (opens a RAM stream + holds the device in
    PRINTING so the IDLE-state `M18`/`M105` injection can't kill the motors mid-draw),
    `POST /stream/end` (returns IDLE once the buffer drains), and `POST /gcode` now
    replies `{"status":"full"}` when its line buffer is full so the browser can apply
    backpressure (`ScribIt_wifi.cpp`).
  - Firmware: `SISerialManager::beginRawStream()` / `endRawStream()` + an empty-buffer
    guard in `loadNextLine()` so a momentary gap mid-stream never falsely ends the job.
  - Firmware: extra-line RAM buffer raised **5 → 32** (`SIConfig.hpp`) for smooth motion.
  - UI: all send buttons (Gallery, Image, Text, Generative, Upload, QR, test pattern,
    Home Pen) now call `streamDrawing()` with a live "Drawing… %" readout and a Stop
    button that interrupts mid-stream (`app.js`).
  - **Verified on hardware:** a square streamed, drew, and returned to IDLE cleanly.
- **Canvas size + out-of-bounds protection.** New optional **Canvas width × height**
  fields in the Calibrate tab (persisted per saved wall). Before a drawing streams, the
  UI simulates the moves from the calibrated position and **refuses any job that would
  leave the canvas or climb into the top anchors** — directly preventing the runaway that
  pulled a string bracket out during testing. "Fit to wall" now respects the canvas too.
  (`app.js`, `index.html`)
- **`GET /samd` debug endpoint.** Returns the SAMD21 motion controller's recent reply
  lines (filtering idle `wait`/`ok` spam) so you can see how it responds to commands —
  e.g. `Unknown command`, pen-select, IMU pitch, errors. This is what let us diagnose a
  unit whose motion chip was running the wrong firmware. (`ScribIt_wifi.cpp`,
  `SISerialManager::dumpSamdLog()`)

### Fixed
- ⭐ **"Pen won't press / only rotates" on some units — root-caused and fixed.** On an
  affected robot the pen never plunged: relative `Z` just rotated the carousel and the
  smart-press commands did nothing. Using the new `/samd` readout we found the **SAMD21
  motion chip was running generic firmware** — `G77`/`G100`/`G101`/`M777` all returned
  `echo:Unknown command`, so there was literally no pen-press logic on the chip. **Fix:
  reflash the SAMD with the real Scribit motion firmware over the air** —
  `espota.py -i 192.168.240.1 -I <host-ip> -p 3232 -c -f docker/builds/MK4duo.ino.bin`
  (the `-c`/companion flag flashes the SAMD through the ESP). After reflashing, the IMU
  reports (`M777` → `ok I:…`) and **relative `Z-30` plunges the pen and marks the wall.**
  See `docs/FLASHING.md` for the full procedure. (If your pen won't press, this is almost
  certainly why.)

## [1.7.0] — 2026-05-23 (flashed to device 2026-05-23 via OTA)

### Fixed
- **Curved lines are now straight** — the #1 reported drawing problem. The robot's
  firmware interprets G-code `X`/`Y` as raw string-motor deltas (no kinematics), so a
  single long move pays out string at a constant rate and **bows into an arc**. Both
  SVG→G-code converters now subdivide every pen-down move into ≤1.5 mm Cartesian
  segments (recomputing string lengths per step), so straight lines stay straight.
  - `tools/scribit_svg_to_gcode.py` (CLI / desktop path) — usable now
  - `Firmware/ScribitESP/data/app.js` (robot's in-browser converter) — takes effect after next flash
  - Measured improvement (via new simulator): a square side that bowed **1.61 mm** now bows **0.00 mm**.
- **Shapes are no longer distorted** — removed the empirical `aspect-x 0.893 / aspect-y 1.25`
  fudge factors (they were masking the arcing by stretching the drawing). Defaults are now
  `1.0`, so a 200 mm SVG square renders as a true **200 × 200 mm** square. The factors remain
  available as CLI flags for genuine per-axis scale calibration only.
- **Blank web UI** — the control panel served HTTP 200 with 0-byte files (SPIFFS was left
  unmountable and auto-formatted empty). UI is now embedded in firmware (PROGMEM) and serves
  correctly; verified live (`index.html` 5544 B, `app.js`, `style.css` all non-zero).
- **Erase mode** — now offsets the drawing **−77 mm in Cartesian space** before conversion (the
  ceramic eraser sits ~77 mm below the pen), so the eraser tracks the original line. The old code
  regex-shifted the output `Y`, which after the string-delta converter change did nothing useful.
  Verified by simulation: the erase path is exactly the draw path shifted up 77 mm.

### Changed
- **Web UI redesign — "Blueprint Plotter" theme** (`Firmware/ScribitESP/data/style.css`,
  `index.html`): a drafting-table aesthetic (graph-paper grid, numbered drafting panels with
  registration ticks, drafted cyan "ink" buttons, system-monospace type), an **animated hero
  line-drawing** of the robot hanging on its strings and continuously sketching on the wall with
  its **four colored markers**, and active-maintenance credibility copy ("independently revived,
  actively maintained, no cloud"). Pure CSS/SVG, fully offline (no web fonts/CDNs), no JS changes.

### Fixed (pen)
- ⭐ **Uploads stalled on pen-down — fixed.** The local firmware was **auto-prepending a pen-home header to every `/upload`** that homed the carousel to the wrong Z (Z89 → Z19); the drawing's pen-down (`Z-30`) then ran out of range and the motion controller **stalled** (robot "only calibrated", then froze). **Removed the auto-prepend** in `ScribIt_wifi.cpp` and made the **converter self-contained** — every drawing now emits its own correct pen-home (`G77 → Z160 → Z-70`, seating pen 1 up at Z90) before drawing. **Verified on hardware:** the same home + pen-down + move drew a clean line via the raw `/gcode` path. (Found by isolating that pen-up moves completed but any pen-down hung.)
- ⭐ **Pen now actually draws — "Home Pen" was incomplete.** The web UI's Home Pen button sent
  only `G77`, which homes the cylinder but does **not** seat the cam — so every pen-down just
  rotated the carousel instead of pressing the marker to the wall (this is the "pen holder won't
  calibrate / turns the wrong way" symptom others reported). Fixed it to run the **full sequence the
  desktop app uses** (`M17 → G77 → G90 → G1 Z160 → G91 → G1 Z-70`): home, overshoot up, then settle
  so **pen 1 seats in the up position**. After that, pen-down (`Z-30`) presses the marker to the wall.
  **Verified on hardware** — the pen leaves a mark. Button relabeled "Home Pen". (Found by reading the
  original repo's `ManualControl.vue`, per a user report that the original files *could* draw.)
- ⭐ **End-to-end drawing confirmed on hardware (2026-05-23):** with the corrected home sequence +
  geometry calibration (anchor 2515 mm, L≈1506 / R≈1667), the robot drew a clean **square** on the
  wall — straight sides, correct placement. Full pipeline working: flash → calibrate → convert
  (straight lines) → home pen → draw.

### Added
- ⭐ **Any wall size — the factory nail-template is no longer required.** Because the kinematics
  now compute correctly for any measured geometry, you can mount the anchors at whatever distance
  fits your wall and simply calibrate (measure the anchor distance + pen position). You are no
  longer tied to the original cardboard measuring-template that shipped in the box. *Guidance:* stay
  reasonably near the ~2.5 m design distance and keep the two anchors level, so the stock strings
  can reach and edge accuracy stays high.
- **Image → Line Art converter** (`Firmware/ScribitESP/data/`) — load a PNG/JPG and turn it into
  plottable lines. **Hatching**: closely-spaced parallel lines whose spacing sets the darkness, so it
  can both **fill solid areas** and **shade photos** (optional **cross-hatch** deepens the darkest
  tones). **Outline**: edge tracing for logos / line art. Live preview, threshold / line-spacing /
  invert / size controls, and send-to-robot (or download) through the corrected converter. *Note:*
  hatching joins runs into continuous **boustrophedon** zig-zags (see below) so fills/photos draw
  without lifting the pen between lines.
- **Tabbed navigation** — Calibrate / Upload / Generative / Image / Controls tabs across the top
  (sticky), so you jump straight to a section instead of scrolling the whole page.
- **mm / inches toggle** in Calibration — enter measurements in either unit. The converter always
  works in mm internally (decoupled via a canonical store, so switching units can't affect drawing).
- **Boustrophedon hatching** — hatch fill lines are joined into continuous zig-zags (no pen lift
  between adjacent lines), making solid fills and photo shading far faster and gentler on the pen.
- **Drawing safety check** — before sending generated or image art, the UI warns if the drawing
  would reach above the anchor line or past an anchor, so the robot won't try to move out of reach.
- **Draw status + completion alert** — the status bar shows a live "DRAWING m:ss" timer while
  plotting and pops a "Drawing complete!" toast when the robot finishes.
- **First-run setup wizard** — a guided overlay (mount → calibrate → load pen & home → draw) shown
  on first visit and reopenable anytime via "Setup guide" in the footer. Smooths onboarding for
  owners the original company left stranded.
- **Text → Line Art** (new tab) — type a message and the robot writes it: **outlined** or **filled**
  letters, sans/serif/mono fonts, bold, adjustable height. Runs through the same plottable-line engine.
- **"Fit to wall" auto-size** — a ⤢ Fit button on every drawing size field sets the drawing to the
  largest size that still fits the robot's reachable area, so it never tries to draw off the wall.
- **Generative Art Studio** (`Firmware/ScribitESP/data/`) — create original plottable line-art
  in the browser, no SVG hunting required: **Spirograph**, **Flow Field**, **Maze**, **Hilbert curve**
  (one continuous space-filling stroke), **Waves** (topographic), and **Truchet tiles** generators
  with live sliders, a seeded **Shuffle** for endless variations, a live preview canvas, and
  one-click **Send to Robot** (or download G-code). Output runs through the corrected converter, so
  plotted lines are straight. (Adapted from the `algorithmic-art` approach to vector/pen output.)
- **Multi-color (4-pen) support** — SVG colors already map to pens; the Generative Art Studio now
  has a **"4 marker colors"** option that splits strokes across the four pens (banded by position,
  sorted so each pen draws contiguously to minimize pen changes).
- **"Invert pen rotation" setting** — a persisted toggle in Device Controls that reverses the pen-
  carousel rotation direction, for units that turn the wrong way when changing pens (a reported bug;
  configurable since it can't be verified without the hardware).
- **Guided calibration wizard** (`Firmware/ScribitESP/data/`) — replaces the bare 3-field
  helper. Two measurement methods (horizontal **offset + drop**, or direct **string lengths**),
  a live diagram of anchors/strings/pen, live computed position + validation (triangle
  inequality, reachability), and **save/recall per wall** (named, persisted).
- **Embedded web UI** (`Firmware/ScribitESP/web_ui.h`, `tools/gen_web_ui.py`) — UI packed into
  flash, no SPIFFS dependency (root cause fix for the blank-page bug).
- **`tools/sim_gcode.py`** — G-code straightness simulator: reconstructs the true Cartesian pen
  path from string-motor G-code and reports how far each move bows. Lets us verify drawing
  accuracy offline without running the robot.
- **`--segment` flag** in the CLI converter — max mm per pen-down segment (default 1.5; smaller = straighter).

### Documented
- **Real OTA flashing procedure** for already-UnBrickIt'd (local-mode) units: the cloud/creds
  method does **not** apply — instead **hold the LED button while powering on and keep it held
  through the entire flash** (OTA `MBC-WB` mode is active only while the button is held; releasing
  exits it). Robot must be within a few feet of the PC (weak Wi-Fi drops the transfer).

### Release prep (repo, not firmware)
- **LICENSE** added (full **GPLv3** text) — required: the firmware is derived from GPLv3 MK4duo/Marlin, and the upstream UnBrickIt repo declares no license. Confirms the distribution model is **open + pay-what-you-want**, not a hard paywall.
- **New `README.md`** — "Scribit Liberated" project front page (what it is, features, quick start, safety, pay-what-you-want support, credits to UnBrickIt + MK4duo, GPLv3). Old user guide preserved at `docs/SCRIBIT_USER_GUIDE.md`.
- **`docs/FLASHING.md`** — owner-friendly step-by-step OTA flashing guide (prereqs, build, static IP, button-hold, espota, troubleshooting).
- **Pay-what-you-want landing page** (`site/index.html` + `site/style.css`) — static, Blueprint-Plotter-themed: hero, story, features, flash steps, PWYW/donate CTAs (Ko-fi), GPLv3/open-source + credits. **Deployed to Vercel: <https://scribit-liberated.vercel.app>** (project `scribit-liberated` under scope `cesar1991`). "View source" / "flashing guide" buttons are placeholders pending the public GitHub repo URL.

### Pending next reflash (coded, not yet on device)
- Setup-wizard "Mount" step now says **"No more factory-template limits — works at any anchor distance"** (reinforces the upgrade). In `data/`; ships with the next OTA flash.
- **Image → Line Art — expanded edit settings.** Added image-prep sliders **Brightness**, **Contrast**, and **Blur** (despeckle) so photos tone correctly *before* conversion; a **Tone (cross-hatch levels, 1–4)** slider that layers progressively darker, alternating-axis hatch passes for real tonal shading (replaces the old single Cross-hatch checkbox); and a **"Draw a border frame"** option. The hatch/outline engines now run on the adjusted buffer. In `data/`; ships with the next OTA flash. *(Still queued for a later batch: arbitrary hatch angle, stippling/dot mode, working-resolution/detail control.)*
- **UI rebrand → "Scribit Liberated."** The web UI is renamed from *Unbrickit* to **Scribit Liberated** (page title, header, subtitle "Your robot. Your wall. No cloud, no company, no permission.", and a defiant tagline). Upstream credit preserved — the footer now reads **"Built on UnBrickIt · open source on GitHub."** In `data/`; ships with the next OTA flash.
- **Animated "plotter-drawn" title.** The header title is now an SVG that the pen appears to **draw on load** (gradient-ink stroke reveal) and then fills in solid white with a slow breathing glow — on-theme with the Blueprint Plotter look. Pure CSS/SVG, offline, with a `prefers-reduced-motion` fallback. (Applies the `frontend-design` skill.)
- **New "Our Story" tab.** An About section that tells owners what happened — the company abandoned the product and its cloud, bricking robots people paid for — and what this project does about it (local control, fixes, new tools, any-wall mounting, open-source / pay-what-you-want). Headlined **"The company quit. Your Scribit didn't."** In `data/`; ships with the next OTA flash.
- **Looping title animation.** The plotter-drawn title now continuously draws on → holds → retracts → redraws (was a one-shot on load).
- **Pen Rack / multi-color system.** Replaces the old hardcoded slot1=black/2=red/3=blue/4=green assumption. A **carousel-style rack** (slots arranged in a ring like the physical device, Controls tab) lets you set the **color + label loaded in each of the 4 slots** (saved to the browser). `colorToPen()` now routes any drawing's colors to the **nearest loaded pen**. The converter gained a **color→slot override map** and **pen-aware path ordering** (draws each pen's lines together to minimise carousel changes). **Uploaded SVGs** show a **per-color → slot assignment** panel with a preview tinted in your real pen colors. **Generative** multicolor uses the rack's colors; **Image** and **Text** got a **"Draw with slot N"** picker and preview/plot in that pen's color. In `data/`; ships with the next OTA flash.
- **Design Gallery tab — categorized library (~69 designs).** Category sub-tabs — **Geometric, Mandala, Celestial, Botanical, Landscape, Patterns, Abstract, Holiday, Kids, Animals** — each with thumbnails, live preview, size/fit, pen pick, and Send/Download. All designs are **procedurally generated or original line-art** (original by construction, so no licensing issues for a paid release): e.g. spirographs, rose mandalas, lotus, sun/moon-phases/constellations/Saturn, recursive trees, sunflowers (phyllotaxis), mountains, repeating floral/checker/triangle/brick patterns, Lissajous/harmonograph curves, snowflakes, kids icons, and simple single-line **Animals** (butterfly, cat, bird, snail, dragonfly, paw, fish, whale). *(Detailed representational art — recognizable breeds, human faces, named landmarks — remains the limited part; would need original/CC0 art over time.)*
- **Freehand Draw tab.** Sketch with mouse/touch on a canvas and the robot plots exactly what you drew — undo/clear, size/fit, pen pick, Send/Download.
- **QR Code tab.** Type a URL / message / WiFi string and the robot draws a scannable QR code (Arase `qrcode-generator`, MIT, embedded offline as `data/qrcode.js`). Dark modules are filled with a boustrophedon scan so they read solid; live preview, size/fit, pen pick, Send/Download.
- **Calibration test pattern.** A "Draw Test Pattern" button (Controls) plots a 120 mm square + inscribed circle + center cross so you can eyeball squareness/roundness to verify calibration.
- **Settings tab.** Consolidates preferences and exposes previously-hardcoded knobs: **global units + default drawing size**; **draw speed (feed rate) + segment length** (smoothness vs. time); **advanced pen tuning** (pen press depth, eraser offset); and **connection/housekeeping** — robot IP override, confirm-before-send toggle, re-run setup wizard, reset saved data, and export/import settings (JSON). `svgToGcode` now reads feed/segment/pen-depth from settings; `API_BASE` honors the IP override. In `data/`; ships with the next OTA flash.
- **Donate / Support button.** A "Pay what you want" card in *Our Story* + a "Support ♥" footer link, both pointing to **ko-fi.com/kshrx**, with a secondary "support the original UnBrickIt creator" link to unbrickit.com. (Ko-fi is connected to Kent's PayPal; 0% platform fee.) Same link wired into the README and the landing page. In `data/`; ships with the next OTA flash.
- **Tabs wrap instead of scroll.** The top navigation now shows **all tabs at once**, wrapping onto a second row as needed, instead of a left/right horizontal scroll bar. In `data/`; ships with the next OTA flash.
- **Tabs grouped into a stepwise flow.** Reordered and labeled the nav into **① Set up** (Calibrate · Controls · Settings), **② Create & draw** (Gallery · Upload · Generative · Image · Text · Draw · QR), and **More** (Our Story) — guiding new users left-to-right without forcing a rigid sequence (the first-run wizard still gives explicit steps). In `data/`; ships with the next OTA flash.
- **Pen Rack → round carousel layout.** Rebuilt the Pen Rack as a **round carousel hub** with the 4 sockets clustered on the left (slot 1 upper-left, 2 top, 3 lower-left, 4 bottom; right side open = the active/drawing position), matching the physical device's socket formation so owners can map on-screen ↔ real slots at a glance. (Confirmed against a photo of the actual carousel.)
- **Deeper default pen-press.** Default pen depth raised **30 → 40** (Z-30 didn't reliably reach the wall on hardware; ~Z-40 does). Still tunable in Settings.
- **"Center robot on wall" button** (Calibrate tab) — moves the robot to the **midpoint between the anchors** (equal strings = least distortion = most accurate) and sets that as home, so drawings center there. **Verified on hardware** that centering improves square accuracy. *(Planned follow-up: separate canvas placement + park-aside-when-done.)*
- **Image → Line Art: multi-color (1–4 pens).** New **"Colors"** control: the photo is **quantized to N colors** (median-cut), each color's regions are **hatch-filled** and routed to a pen, with a **per-color → pen assignment** panel and a preview in your real pen colors. Output is multi-pen (carousel switches between pens). Turns any JPG into a plottable, posterized 1–4 color rendering. In `data/`; ships with the next OTA flash.
- **Flasher robustness (`tools/flash_esp_fast.ps1`) + docs.** Setting the host static IP (`192.168.240.100`) needs admin; without it the adapter gets a DHCP `192.168.240.x` address and `espota` reports **"Listen Failed."** The flasher now **auto-detects the adapter's actual IP** and passes it to espota, and `docs/FLASHING.md` documents the fix. (Host-side tooling; no firmware change.)
- **Path optimization (faster, cleaner plots).** The converter now groups strokes by pen, then within each pen **greedily visits the nearest next stroke** (nearest-path ordering) instead of document order — cutting wasted pen-up travel on every drawing (uploads, gallery, image, generative, text, QR, freehand). Validated: no dropped strokes, correct pen grouping. *(Future: stitch near-touching endpoints to further reduce pen lifts.)* In `data/`; ships with the next OTA flash.
- **Image g-code size fix (big multi-color images were stalling the robot).** Image fills now use a **coarse 12 mm segment** instead of the 1.5 mm used for curved outlines — hatch lines are ~straight, so fine subdivision just bloated the file into tens of thousands of moves the unit couldn't load (it would sit in "PRINTING" without even homing). Cuts image g-code ~8×. Also added a **size warning** before sending an oversized image (suggests fewer colors / wider spacing). `svgToGcode` gained an `opts.segment` override. In `data/`; ships with the next OTA flash.
- **Image fill styles.** New **Fill style** selector in the Image tab — **Horizontal / Vertical / Diagonal / Grid / Crosshatch / Stipple (dots)** — implemented as an any-angle boustrophedon scan, applied to both single-pen hatching and multi-color regions (no longer horizontal-only). In `data/`; ships with the next OTA flash. *(Future: concentric/spiral/contour fills + path optimization.)*
- **Highlighted "Support" nav item.** A glowing gold **"♥ Keep this alive"** button in the nav's *More* group linking to ko-fi.com/kshrx, to make supporting the project prominent. In `data/`; ships with the next OTA flash.
- **Multi-color: transparent backgrounds excluded + per-color "don't draw".** Transparent PNG pixels are now skipped entirely (not quantized or filled), so a no-background PNG no longer gets its background colored in. Each palette color also has a **"✕ Don't draw"** option to drop a color (e.g. an opaque white background). In `data/`; ships with the next OTA flash.
- **`/upload` now sends CORS header.** Added `Access-Control-Allow-Origin: *` to the `/upload` responses (it was missing, unlike `/gcode` and `/stop`), so the browser-based local preview can push drawings to the robot (with the Robot-IP override set) instead of failing with "failed to fetch." Firmware change; ships with the next OTA flash.

### Planned / next
- **True hard-stop:** the **Stop** button only halts the ESP's g-code feed — the SAMD motion chip keeps executing whatever it already buffered, so Stop isn't immediate. Need to send a quickstop/`M410` (and/or clear the SAMD queue) so Stop is instant. *(Discovered on hardware: a stopped test kept looping until its buffer drained.)*
- **Image draw speed:** large image fills draw slowly due to per-move streaming latency on the SAMD; investigate flow-control / batching, and keep image g-code small (coarse fill segments already help).
- `/imu` firmware endpoint to expose `M777` pitch for live plumb/centering assist during calibration.
- **IMU auto pen-depth** (`G100`) — use the IMU to auto-set each pen's press depth so every line is consistently dark (needs the robot in the loop to tune).
- ✅ Flashed to the device via OTA on 2026-05-23 (new UI verified serving).
- Pen-aware path ordering for multi-color SVGs (minimize pen changes); physical wall validation of all features (straight lines, erase −77, pen direction).

## [1.6.0] — 2026-05-22

### Added
- **Web Interface** (`Firmware/ScribitESP/data/`) — browser-based control panel served from device SPIFFS:
  - `index.html` — drag-and-drop upload form, erase mode toggle, device controls, calibration helper
  - `style.css` — mobile-friendly responsive dark theme
  - `app.js` — g-code handling, erase-mode Y-offset (-77mm), status polling every 3s, calibration g-code generator
- **CSS color parsing** in SVG converter — handles named colors (`orange`, `cyan`, `pink`), `rgb()`, `rgba()`, hex3, hex6 formats, with nearest-neighbor pen mapping
- **`--resolution` / `-d` flag** in SVG converter — controls arc/curve sampling density (default 5.0mm max point distance)
- **`--aspect-x` / `--aspect-y` flags** — expose geometry compensation factors (default 0.893 / 1.25)
- **`--stats` mode** — preview G-code statistics (command count, pen events, resolution, compensation) without writing file
- **`tests/test_svg_converter.py`** — 20+ test cases covering color parsing and kinematics
- **`IMPLEMENTATION_PLAN.md`** — roadmap document; replaces broken reference in PROGRESS_TRACKER
- **`CHANGELOG.md`** — this file
- **`CONTRIBUTING.md`** — setup, build, and contribution guidelines

### Fixed
- **`postinstall` production skip** — now checks `NODE_ENV=production` and exits 0 instead of running Python setup
- **`setup-python.js` error handling** — exits with code 1 on Python copy failure, warns if portable Python not found

### Changed
- **`releases/README.md`** — now points to real GitHub releases page, cleaned up placeholder text
- **`docker/builds/` gitignored** — binaries no longer committed to repo
- **`tools/archive/` removed** — old superseded scripts deleted

## [1.5.0] — 2025-11-03

### Added
- **Boot loop fix** — MQTT empty-host crash resolved; SAMD sync made non-fatal; 3-second boot timeout forces transition to IDLE
- **`POST /upload`** — upload and auto-start g-code execution
- **`POST /pause` / `POST /resume`** — pause and resume during print
- **`GET /status`** — returns device state and serial
- **`tools/scribit_svg_to_gcode.py`** — SVG to g-code converter with multi-pen support (overshoot method)

## [1.4.0] — 2025-11-03

### Added
- **Bundled portable Python** — `gui-app/` ships with its own Python runtime for cross-platform support
- **Sample SVGs** — `test_square.svg`, `test_star.svg`, `test_simple.svg`, `test_complex.svg`, `test_multicolor.svg`

## [1.3.0] — earlier

- Initial documentation and firmware analysis