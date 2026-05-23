# Changelog

All notable changes to this project are documented here.

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