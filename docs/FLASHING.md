# Flashing Scribit Liberated (OTA)

This guide flashes the firmware onto a Scribit over Wi‑Fi (OTA). It does **not** require opening the robot or a USB cable.

> ⚠️ **Read this first.** Flashing carries a small risk of bricking the device, and there is **no warranty** (GPLv3). Flash at your own risk. The single most common cause of a failed flash is a **weak Wi‑Fi signal** or **letting go of the button** — both covered below.

---

## Do I need to flash UnBrickIt first? (start here)

**No — you don't need a separate "UnBrickIt" step.** Scribit Liberated **is** the firmware (it's built on the open‑source UnBrickIt project). You flash this directly onto the robot; there is no in‑between firmware to install.

The only thing that differs is **how you put the robot into OTA (update) mode**, and that depends on what it's running right now:

| Your Scribit | How to enter OTA mode | Follow |
| --- | --- | --- |
| **Brand‑new / never modified** (still uses the original app + cloud) | Connect to its `ScribIt‑xxxxxx` Wi‑Fi and **POST your Wi‑Fi credentials to `:8888`** to trigger update mode | **[Path B — stock unit](#path-b--brand-new--stock-scribit)** below |
| **Already on local firmware** (you or a previous owner already converted it; UI loads at `192.168.240.1:8888`) | **Hold the LED button** through power‑on | **Path A — Steps 3–6** below |

Either way you end up on the same `MBC‑WB‑xxxxxx` network and flash the same `ScribitESP.ino.bin`.

> **Heads‑up / honesty:** this firmware has been developed and tested mostly on units **already converted to local mode**. The stock‑unit steps (Path B) use the original documented OTA‑trigger method and should work, but they're **less battle‑tested** — go slowly and at your own risk. If you hit a wall, open an issue and we'll help.

---

## What you need

- A Scribit (any state — see the table above).
- A Windows/Mac/Linux PC with **Python 3** and **Wi‑Fi**.
- The firmware binary `ScribitESP.ino.bin` **and** the flasher `espota.py` — both on the [Releases page](https://github.com/frsm222111-boop/Scribit-Liberated/releases/latest) (see Step 1).
- ~10 minutes and a way to **hold the LED button down** (tape or a clamp helps).

---

## Step 1 — Get the two files you need

You need **two** files: the firmware (`ScribitESP.ino.bin`) and the flasher (`espota.py`).
Put them **in the same folder** and run everything from there — the commands below assume that.

**1. Firmware — `ScribitESP.ino.bin`**
Download it from the [**Releases page**](https://github.com/frsm222111-boop/Scribit-Liberated/releases/latest).

**2. Flasher — `espota.py`** ⚠️ **Use the one from this project — not a random copy off the internet.**
Other versions of `espota.py` reject this board's response (you'll see `Bad Answer: OK <number>`
even though the robot is fine). The version that works is in the repo at:
`gui-app/resources/python/espota.py` — and it's also attached to the
[Releases page](https://github.com/frsm222111-boop/Scribit-Liberated/releases/latest) next to the firmware, so you can grab both in one place.

> **Build from source instead?** (needs Docker, optional) From the repo root, run in **PowerShell** (not Git-Bash):
> ```bash
> python tools/gen_web_ui.py
> docker compose -f docker/docker-compose.yml run --rm scribit-firmware \
>   arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=esp \
>   --output-dir /workspace/builds /workspace/source/Firmware/ScribitESP/ScribitESP.ino
> ```
> The result lands at `docker/builds/ScribitESP.ino.bin`.

---

## Step 2 — Move the robot next to your PC

Put the robot **within a few feet** of your computer. The transfer is ~1 MB and a weak signal will drop it part‑way (a far‑away attempt can die at 27 %). You want a strong, stable signal.

## Step 3 — Enter OTA (update) mode

Pick the path that matches your robot (see the table at the top).

### Path A — already on local firmware → KEEP HOLDING the button

OTA mode lives in the **bootloader** and is active **only while the LED button is physically held**:

1. **Unplug** the robot.
2. **Press and hold** the LED button.
3. **Plug it back in** while still holding.
4. The LED stays **off** → you're in OTA mode. A Wi‑Fi network named **`MBC‑WB‑xxxxxx`** appears and stays up **only while the button is held**.

> **Do not let go.** Releasing the button exits OTA (the LED will start flashing = the wrong mode). Releasing mid‑flash is the #1 failure. **Tape or clamp the button down** so it can't slip during the ~90‑second flash.

### Path B — brand‑new / stock Scribit (still on the original cloud firmware)

A stock unit enters OTA mode a different way — by being *told* to, over HTTP, instead of the button‑hold:

1. **Power on** the robot normally. If it isn't already broadcasting `ScribIt‑xxxxxx`, hold the LED button ~5s until the LED **pulses white**, then release — it should broadcast `ScribIt‑xxxxxx` (AP mode).
2. **Connect your PC** to that `ScribIt‑xxxxxx` network (password `ScribItAP314`, or open).
3. **Trigger OTA** by posting any Wi‑Fi credentials to the device (the values don't have to be real — this just flips it into update mode):
   ```bash
   curl -X POST http://192.168.240.1:8888 -H "Content-Type: application/json" -d "{\"ssid\":\"x\",\"password\":\"x\"}"
   ```
4. The LED **flashes faster** and the robot now broadcasts **`MBC‑WB‑xxxxxx`**. You're in OTA mode — continue to Step 4. (No button‑holding needed on this path.)

> This is the original cloud firmware's documented OTA trigger; once you've flashed Scribit Liberated, future updates use **Path A** (button‑hold) instead.

## Step 4 — Connect your PC to the robot + set a static IP

1. On your PC's Wi‑Fi adapter, **set a static IP** of `192.168.240.100`, subnet `255.255.255.0` (`/24`). This avoids DHCP races. *(Setting a static IP needs admin rights.)*
2. Connect that adapter to the **`MBC‑WB‑xxxxxx`** network. Association can take several tries — keep retrying until it connects.

## Step 5 — Flash

From the folder where you put both files (Step 1):

```bash
python espota.py \
  -i 192.168.240.1 -I 192.168.240.100 -p 3232 \
  -f ScribitESP.ino.bin -r -d
```

- `-i 192.168.240.1` — the robot in OTA mode.
- `-I 192.168.240.100` — **your PC's IP on that adapter** (required; needed because your PC is on more than one network).
- Success = progress reaches **100 %** and you see **`Result: OK`**.

Only **release the button after success.** The robot reboots (a double white flash, then solid white).

## Step 6 — Verify

1. Reconnect your PC to the robot's normal network (`ScribIt‑xxxxxx`) or your home network.
2. Open **`http://192.168.240.1:8888/`** (or the robot's IP) in a browser — you should see the **Scribit Liberated** control panel.

---

## If the pen won't press (only rotates) — reflash the motion chip (SAMD)

Some units (we've seen this on a newer model) have a **second chip** — the **SAMD21 motion
controller** — running *generic firmware with none of the Scribit pen commands*. The
symptom: the carousel rotates but the pen **never plunges to the wall**, so nothing draws
(relative `Z` just spins the carousel; the smart-press does nothing).

**Confirm it first** (the firmware has a debug endpoint for this). With the robot on its
normal network, send a Scribit command and read the motion chip's reply:

```bash
# ask the motion chip for IMU data, then read what it said
curl -s -X POST http://192.168.240.1:8888/gcode --data-binary "M777"
curl -s http://192.168.240.1:8888/samd
```

If `/samd` shows `echo:Unknown command: "M777"` (and the same for `G77`/`G100`/`G101`),
the motion chip is missing the Scribit firmware. **Fix = reflash the SAMD over the air**:

1. Get `MK4duo.ino.bin` — from a release, or build it:
   `arduino-cli compile -b briki:mbc-wb:mbc:mcu=samd ... Firmware/MK4duo/MK4duo.ino`
   (output `docker/builds/MK4duo.ino.bin`).
2. Put the robot in **OTA mode** exactly like Step 3 (hold the button through power-on).
   *Note: on some units the OTA LED is **red**, not off — that's fine as long as the
   `MBC‑WB‑xxxxxx` network appears.*
3. Flash the SAMD with espota's **`-c` (companion)** flag — this routes the firmware
   through the ESP to the motion chip:
   ```bash
   python gui-app/resources/python/espota.py \
     -i 192.168.240.1 -I <your-PC's-real-IP, e.g. 192.168.240.2> -p 3232 \
     -c -f docker/builds/MK4duo.ino.bin -d
   ```
   Success = `Result: OK`.
4. Release the button, power-cycle **without** holding it, wait for solid white.

**Verify the fix:** `curl -X POST .../gcode --data-binary "M777"` then `curl .../samd`
should now return `ok I:<pitch>` (IMU works), and the pen will plunge on a normal
pen-down. Pen-down depth on these units is **`Z-30`** (deeper just re-indexes the carousel).

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `espota` says **`Bad Answer: OK <number>`** | You're using the **wrong `espota.py`**. A stock/random copy does an exact `"OK"` match and chokes on this board's reply (the robot is actually fine — that `<number>` is the firmware size it accepted). Use the `espota.py` from this project (attached to the [Releases page](https://github.com/frsm222111-boop/Scribit-Liberated/releases/latest), or `gui-app/resources/python/espota.py`). See Step 1. |
| Transfer dies partway (e.g. 27 %) | Weak Wi‑Fi — move the robot closer to the PC. |
| `espota` says **"Listen Failed"** | The `-I` value must be your PC's **real** IP on the robot's network. The static IP (`192.168.240.100`) needs **admin** — if it didn't apply, your adapter got a **DHCP** address instead (check `ipconfig`; usually `192.168.240.x`). Re‑run with `-I <that address>`. (The bundled `flash_esp_fast.ps1` now auto‑detects this.) |
| Flash never starts | The button isn't held, or you're on the wrong network. Re‑enter OTA (Step 3) and retry. |
| LED is **flashing** (not off) after power‑on | You're in app/config mode, not OTA. Unplug and redo Step 3, holding the button **before** plugging in. |
| PC won't associate with `MBC‑WB‑xxxxxx` | Keep retrying; set the static IP first; make sure the button is still held (the network drops when released). |
| `espota` can't reach the device | Make sure you passed `-I 192.168.240.100` (your PC's IP), and that the static IP is set on the **same** adapter you connected with. |

> There is **no accessible USB port** on the robot, so OTA is the only path. Don't try the old "POST Wi‑Fi credentials to :8888 to enter OTA" method — that only applies to the original cloud firmware, not local‑mode units.
