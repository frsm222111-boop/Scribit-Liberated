# Troubleshooting & FAQ

Real fixes for the issues people actually hit running an UnBrickIt'd Scribit. Grouped by
symptom — find your symptom, try the fixes top to bottom.

---

## Connection & UI

### The web UI won't load (`http://192.168.240.1:8888`)
The UI is served **by the robot over its own WiFi**, not from the internet. If it won't load:
1. **Check you're connected to the robot's WiFi** (`ScribIt-xxxxxx`, open network). On a PC with
   two adapters, the robot is usually on a *secondary/USB* adapter while your main adapter stays
   on home internet — make sure the **right adapter is joined to the robot AP**.
2. **Ping it:** `ping 192.168.240.1`. Timeouts = you're not on the robot's network.
3. **The robot reboots its AP when power-cycled** — after any restart you may need to **rejoin**
   the robot's WiFi.
4. If the SSID isn't even listed, the robot is off or still booting — wait for **solid white**.

---

## Drawing quality

### The pen makes no mark, or only a faint one
- **The marker is dried out.** The #1 cause. **Scribble-test every marker on paper** before
  loading — a dead pen looks exactly like a software failure.
- **Press depth too shallow.** Default is `Z-30`. If markers are slightly short, the Advanced →
  Pen press depth can go a touch deeper — but **not past ~`Z-44`**, which makes the carousel
  *rotate* instead of press.
- **Textured/orange-peel walls** only catch ink on the raised bumps, so lines look broken/dashed.
  Slow the draw speed and use fresh markers; perfectly solid lines need a smooth surface.

### A stray line runs across the drawing (often diagonally to the next color)
Pen-up travel moves weren't lifting clear of the wall. **Update to the latest firmware/UI** —
the converter now lifts to a dedicated travel-clearance height for all non-drawing moves.

### Parts of the drawing are missing (a whole edge, or the start of a shape)
- **Dried marker** for that color (see above) — check the pen for that *specific* slot.
- On older firmware, the first press after a move could skip. **Update** — the converter now
  routes the pen plunge through the rest position so the press is always reliable.

### The drawing is skewed, squished, or the wrong size (circles come out oval)
Geometry/calibration is off:
1. **Calibrate** (Calibrate tab): measure the real **anchor-to-anchor distance** and the pen's
   position, Save, then **Center on wall**.
2. **Check both strings sit on the *same* notch / matching teeth** on the left and right drive
   gears. Mismatched notches throw off the geometry and skew everything (and can stop the pen
   from contacting the wall).
3. Draw nearer the **center** of the canvas — distortion is lowest there.

### The drawing lands in the wrong spot / off where I expected
The robot has **no position memory** — it tracks position only from a known start, and that's
**lost on every power cycle** (and after a jam that skips steps). After a restart, **re-establish
position** (re-center / re-enter the pen position) before drawing.

### Wrong colors — a color drew with the wrong marker
The **Pen Rack** (which color is in which slot) doesn't match your physical loadout. Run the
**4-pen order test** (draws one short line per slot) to see which slot is which, then set the Pen
Rack to match. Slot order after a home is fixed; pen 1 is the one at the arch.

---

## Carousel & pen mechanism

### ⚠️ Grinding / motor straining (a pen is JAMMED)
A pen that's **not fully seated** (sticking out the back, cocked, or popped partway out) catches
the housing as the carousel rotates → grinding. This can strip gears or pull an anchor — **act
fast:**
1. **Stop it.** Hit Stop in the UI. If it keeps grinding, **disable the steppers** (an
   emergency-stop / `M18`) — that cuts the motor force driving into the jam. If all else fails,
   **unplug the power.**
2. **Support the robot** whenever power/steppers are cut — with no holding torque it can **drop**.
3. **Reseat the offending marker** flush, same depth as the others, **not protruding out the
   back.** Confirm the carousel **turns freely by hand** before powering back on.
4. Power on → **Home Pen** and watch one clean rotation.
> Prevention: **before every draw, check all pens are firmly seated** so none can shift mid-rotation.

### Pressing the pen just rotates the carousel instead of pushing it to the wall
- **Press depth too deep** (past ~`Z-44`) over-indexes the carousel. Use ~`Z-30`.
- If **no** pen ever presses (the plunge mechanism never fires), your motion chip (SAMD) may have
  **generic firmware** lacking the Scribit pen commands — see the SAMD reflash step in
  `FLASHING.md` (`espota -c -f MK4duo.ino.bin`). The `GET /samd` endpoint shows
  `Unknown command: "G77"/"G101"` when this is the problem.

---

## Mechanical & safety

### The robot slipped or dropped
With steppers disabled or power off, the strings can unspool. **Always support the robot by hand
before cutting power or disabling the motors.** Re-check that the anchors are secure.

### "Home" doesn't move the robot back to a spot
**Home only re-homes the pen carousel — it does NOT move the robot's XY.** Position is open-loop;
use the calibration / centering to place the robot, not Home.

---

## Monitoring (webcam)

- **Only one app can use a USB camera at a time.** If a capture fails, close the Windows Camera
  app or any browser tab holding the camera, then retry.
- A cold camera can return one empty frame on first open — just retry the capture.
