# Scribit G-code Tools

Python tools for converting Cartesian coordinates to Scribit string-space G-code.

## Components

### 1. `scribit_kinematics.py`
Core kinematics library that converts Cartesian (x, y) coordinates to string lengths (L1, L2).

**Features:**
- Forward kinematics: Cartesian → String lengths
- Position reachability checking
- Workspace boundary calculation
- Accounts for all hardware offsets (motor edges, pen position)

### 2. `svg_to_gcode.py`
Complete SVG to G-code converter with test shape generation.

**Features:**
- Parse SVG path elements
- Convert curves to line segments
- Generate test shapes (square, circle, triangle)
- Workspace validation
- Configurable origin, scale, and feedrate

## Installation

```bash
cd tools
pip install -r requirements.txt
```

## Usage

### Test Kinematics

```bash
# Run built-in tests
python scribit_kinematics.py
```

Expected output:
```
Scribit Kinematics Test

Center, 500mm down:
  Cartesian: (1125.0, 500.0) mm
  String lengths: L1=1172.90mm, L2=1172.90mm
  Reachable: True - Position reachable

...
```

### Generate Test Shapes

```bash
# Square at center
python svg_to_gcode.py --shape square --center 1125 1000 --size 400 -o test_square.gcode

# Circle at center
python svg_to_gcode.py --shape circle --center 1125 1000 --size 300 -o test_circle.gcode

# Triangle
python svg_to_gcode.py --shape triangle --center 1125 800 --size 350 -o test_triangle.gcode
```

### Convert SVG Files

```bash
# Basic conversion
python svg_to_gcode.py drawing.svg -o output.gcode

# With scaling (2x larger)
python svg_to_gcode.py drawing.svg -o output.gcode --scale 2.0

# With origin offset (move drawing 500mm right, 300mm down)
python svg_to_gcode.py drawing.svg -o output.gcode --origin 500 300

# Custom feedrate
python svg_to_gcode.py drawing.svg -o output.gcode --feedrate 500
```

## Coordinate System

```
Wall coordinates (looking at wall):

(0,0)                                    (2250,0)
  •─────────────────────────────────────•
  [Left Anchor]              [Right Anchor]
  │                                       │
  │        Cartesian space                │
  │        X: left to right               │
  │        Y: top to bottom               │
  │                                       │
  │         Device hangs here             │
  +Y                                      │
  (down)                                  │
```

**Anchors:** (0, 0) and (2250, 0) mm at top corners
**Coordinate origin:** Top-left corner of wall
**Units:** Millimeters

## Hardware Configuration

From `scribit_kinematics.py`:

```python
# Confirmed values
anchor_left = (0.0, 0.0)       # Top-left corner
anchor_right = (2250.0, 0.0)   # Top-right corner, 2.25m across
motor_offset = 76.2            # 3" - motors at cylinder edges
pen_offset = 25.4              # 1" - pen above cylinder center
```

## Workspace Limits

**Safe drawing area:**
- X: 200mm to 2050mm (~1850mm wide)
- Y: 300mm to 2200mm (~1900mm tall)

**Limitations:**
- Avoid extreme angles near anchors (< 15°)
- String length limits: 200mm min, 3000mm max
- Check firmware X_MAX_POS and Y_MAX_POS for exact limits

## G-code Output Format

String-space G-code where X/Y are string lengths:

```gcode
M17           ; Enable motors
G90           ; Absolute positioning
G1 F1000      ; Set feedrate
G1 X1172.90 Y1172.90   ; Move to position (L1=1172.90, L2=1172.90)
G1 X1049.50 Y2136.00   ; Next position
M18           ; Disable motors
```

## Examples

### Create Test Square

```bash
python svg_to_gcode.py \
  --shape square \
  --center 1125 1000 \
  --size 400 \
  -o test_square.gcode
```

Upload to device:
```bash
curl -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @test_square.gcode
```

### Convert Inkscape SVG

1. Create drawing in Inkscape
2. Save as "Plain SVG"
3. Convert to G-code:
   ```bash
   python svg_to_gcode.py my_drawing.svg -o output.gcode
   ```
4. Upload to Scribit

### Scale and Position Drawing

```bash
# Drawing is 100mm x 100mm in SVG
# Want it centered on wall at 2x size

python svg_to_gcode.py drawing.svg -o output.gcode \
  --scale 2.0 \
  --origin 925 850
# Origin calculation: (1125 - 100) for centering
```

## Troubleshooting

### "Position unreachable" warnings

Check that your drawing fits within workspace:
- X must be between 200-2050mm
- Y must be between 300-2200mm
- Adjust with `--origin` and `--scale`

### SVG not parsing

Ensure SVG has `<path>` elements:
1. In Inkscape: Object → Object to Path
2. Save as "Plain SVG" (not Inkscape SVG)

### ImportError: svg.path

Install dependencies:
```bash
pip install svg.path
```

## API Reference

### ScribitKinematics

```python
from scribit_kinematics import ScribitKinematics

kin = ScribitKinematics()

# Convert Cartesian to strings
L1, L2 = kin.cartesian_to_strings(px=1125, py=500)

# Check if position reachable
reachable, reason = kin.is_position_reachable(px=1125, py=500)
```

### SVGToGcode

```python
from svg_to_gcode import SVGToGcode
from pathlib import Path

converter = SVGToGcode(feedrate=1000.0)

# Convert SVG file
gcode = converter.svg_to_gcode(
    Path('drawing.svg'),
    origin_x=0,
    origin_y=0,
    scale=1.0
)

# Generate simple shape
gcode = converter.simple_shape_to_gcode(
    shape='circle',
    center_x=1125,
    center_y=1000,
    size=300
)
```

## Testing Workflow

1. **Test kinematics:**
   ```bash
   python scribit_kinematics.py
   ```

2. **Generate test shape:**
   ```bash
   python svg_to_gcode.py --shape square --center 1125 1000 --size 400 -o test.gcode
   ```

3. **Upload to device:**
   ```bash
   curl -X POST http://192.168.240.1:8888/upload \
     -H "Content-Type: text/plain" \
     --data-binary @test.gcode
   ```

4. **Verify drawing** - should be centered, proper size

5. **Convert your SVG:**
   ```bash
   python svg_to_gcode.py your_drawing.svg -o output.gcode
   ```

## Next Steps

- ✅ Kinematics library implemented
- ✅ SVG converter implemented
- ✅ Test shape generator implemented
- ⏭️ Test with real device
- ⏭️ Add image to G-code (stippling/hatching)
- ⏭️ Add text rendering
- ⏭️ Optimize path planning

## References

- Hardware geometry: `docs/hardware-geometry-analysis.md`
- Anchor positions: `docs/anchor-positions-confirmed.md`
- Kinematics investigation: `docs/inverse_kinematics_plan.md`
