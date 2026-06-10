# Scribit Liberated

**Your robot. Your wall. No cloud, no company, no permission.**

Scribit Liberated is community firmware plus an in‑browser control panel that brings the **Scribit** writing/drawing wall‑robot back to life after the original company abandoned it — the cloud went dark, the app and website lapsed, and thousands of robots people paid hundreds of dollars for turned into bricks overnight.

This project cuts the cord. Your Scribit runs **100 % locally**, controlled from any browser on your network. No account, no internet, nothing phoning home.

> Built on the open‑source **[UnBrickIt](https://github.com/karimi/unbrickit)** project. The motion firmware is derived from **[MK4duo](https://github.com/MagoKimbra/MK4duo) / Marlin (GPLv3)**, so Scribit Liberated is **free and open source under the GPLv3** — see [License](#license).

---

## What you get

A complete, offline control panel served straight from the robot's flash (no app to install):

- **Guided calibration** — measure your wall once; works at **any anchor distance** (the factory nail‑template is no longer required).
- **Upload SVG / G‑code** — with straight‑line correction, per‑color → pen‑slot assignment, and **paint mode**: pick a brush pen and click/drag across the preview to color individual shapes.
- **Generative Art Studio** — spirographs, flow fields, mazes, Hilbert curves, waves, Truchet tiles.
- **Image → Line Art** — turn a photo into plottable hatching/outlines (brightness, contrast, blur, tone, frame).
- **Text → Line Art** — write words on the wall.
- **Design Gallery** — ~70 ready‑to‑plot designs across 10 categories (geometric, mandala, celestial, botanical, landscape, patterns, abstract, holiday, kids, animals).
- **Freehand Draw** — sketch with mouse/finger and the robot plots it.
- **QR Code** — draw a scannable code from any link or message.
- **Pen Rack** — tell it which color marker is in each carousel slot; drawings route to the right pen and draw each color together to minimize pen changes.
- **Settings** — units, draw speed, smoothness, pen tuning, IP override, export/import.

## Quick start

1. **Flash the firmware** — follow the **[Flashing guide](docs/FLASHING.md)**.
2. **Connect** to the robot's Wi‑Fi (or your network) and open its IP in a browser.
3. **Calibrate**, load a pen, and draw.

Detailed usage lives in the **[Scribit user guide](docs/SCRIBIT_USER_GUIDE.md)**.

## Safety & disclaimer

Flashing firmware carries a risk of bricking your device. This software is provided **as‑is, with no warranty** (see the GPLv3). You flash and operate your robot **at your own risk**. Keep the robot within a few feet of your PC during flashing (weak Wi‑Fi drops the transfer), and read the flashing guide fully before starting.

## Support — pay what you want

Scribit Liberated is **free and open source**, and always will be. It also took hundreds of hours to reverse‑engineer, fix, and rebuild. If it saved your robot, please consider **chipping in what it's worth to you** — it funds continued work.

- 💛 **Support this project:** <https://ko-fi.com/kshrx>
- 🙏 **Support the original UnBrickIt creator:** <https://unbrickit.com>

## Credits

- **[UnBrickIt](https://github.com/karimi/unbrickit)** by karimi — the open‑source revival this builds on.
- **[MK4duo](https://github.com/MagoKimbra/MK4duo) / Marlin / Sprinter / grbl** — the GPLv3 motion firmware.
- **Scribit / Carlo Ratti Associati** — the original hardware.
- Every owner who refused to throw a working robot in a drawer.

## License

**GNU General Public License v3.0** — see [LICENSE](LICENSE). Because the firmware is derived from GPLv3 code (MK4duo/Marlin), Scribit Liberated is and must remain open source: you may use, modify, and redistribute it (even commercially), but you must keep it under the GPLv3 and make the corresponding source available. There is **no warranty**.

## Contributing

Issues and pull requests welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Every change is logged in [CHANGELOG.md](CHANGELOG.md).
