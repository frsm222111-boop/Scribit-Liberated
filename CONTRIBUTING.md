# Contributing to Unbrickit

Thank you for your interest in contributing!

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for firmware compilation
- Python 3.11+ — for running the SVG→g-code converter locally
- Node.js 18+ — for the GUI app

### Clone and Setup

```bash
git clone https://github.com/karimi/unbrickit.git
cd unbrickit

# Install GUI app dependencies
cd gui-app && npm install && cd ..

# Copy config templates
cp ExtraFile/SIConfig.hpp.example Firmware/ScribitESP/SIConfig.hpp
cp ExtraFile/ScribitVersion.hpp.example Firmware/ScribitESP/ScribitVersion.hpp
cp ExtraFile/Mk4duoVersion.h.example Firmware/MK4duo/Mk4duoVersion.h

# Copy required libraries
cp -r ExtraFile/arduino-mqtt Firmware/ScribitESP/
cp -r ExtraFile/StepperDriver Firmware/ScribitESP/
```

### Building Firmware

```bash
# ESP32
docker-compose -f docker/docker-compose.yml run --rm scribit-firmware \
  arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=esp \
  --output-dir /workspace/builds \
  /workspace/source/Firmware/ScribitESP/ScribitESP.ino

# SAMD21
docker-compose -f docker/docker-compose.yml run --rm scribit-firmware \
  arduino-cli compile --fqbn briki:mbc-wb:mbc:mcu=samd \
  --output-dir /workspace/builds \
  /workspace/source/Firmware/MK4duo/MK4duo.ino
```

### Testing SVG Converter

```bash
# Run unit tests
cd tools
python3 -m pytest ../../tests/test_svg_converter.py -v

# Or run manually
python3 tools/scribit_svg_to_gcode.py your_file.svg \
  -a 2250 -l 1270 -r 1270 \
  -o output.gcode

# Preview stats without writing file
python3 tools/scribit_svg_to_gcode.py your_file.svg \
  -a 2250 -l 1270 -r 1270 --stats
```

### Flashing Firmware

Connect to Scribit via WiFi (ScribIt-XXXXXX / ScribItAP314), then:

```bash
# Flash ESP32
python espota.py -i 192.168.240.1 -p 3232 -f docker/builds/ScribitESP.ino.bin

# Flash SAMD21
python espota.py -i 192.168.240.1 -p 3232 -c -f docker/builds/MK4duo.ino.bin

# Flash partitions (one-time only)
python espota.py -i 192.168.240.1 -p 3232 -s -f docker/builds/ScribitESP.ino.partitions.bin
```

## Project Structure

```
Firmware/ScribitESP/   — ESP32 firmware (WiFi, HTTP, state machine)
Firmware/MK4duo/        — SAMD21 firmware (motion control)
tools/                  — Python CLI tools
  scribit_svg_to_gcode.py  — SVG → g-code (main converter)
gui-app/             — Electron desktop GUI app
docker/              — Build environment
docs/                — Technical analysis
```

## Code Style

- C++: follow the existing style in each file (no auto-format required)
- Python: 4-space indents, max line length 100
- JS: ES6+ style, no semicolons

## Submitting Changes

1. Fork the repo and create a branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `python3 -m pytest tests/`
4. Commit with a clear message: `git commit -m "Add X feature"`
5. Push and open a Pull Request

## Reporting Issues

- Check existing issues before opening a new one
- Include firmware version, device state, and LED pattern
- For boot issues: describe the exact LED sequence