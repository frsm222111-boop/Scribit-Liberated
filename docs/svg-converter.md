# SVG to Scribit G-code Converter

Complete SVG to G-code converter with advanced features.

## Features

### 1. Full SVG Path Support
Handles all SVG path commands:
- **M/m** - Move (absolute/relative)
- **L/l** - Line (absolute/relative)
- **H/h** - Horizontal line
- **V/v** - Vertical line
- **C/c** - Cubic Bezier curve
- **S/s** - Smooth cubic Bezier
- **Q/q** - Quadratic Bezier curve
- **T/t** - Smooth quadratic Bezier
- **A/a** - Elliptical arc
- **Z/z** - Close path

### 2. Multi-Color Support
Automatically detects path colors and switches pens:

| Color | Pen | Z Value |
|-------|-----|---------|
| Black | 1   | 89      |
| Red   | 2   | 161     |
| Blue  | 3   | 233     |
| Green | 4   | 305     |

Color detection from:
- `stroke` attribute
- `fill` attribute
- `style="stroke:color"` attribute

### 3. Path Optimization
Greedy nearest-neighbor algorithm minimizes travel distance:
- Reorders paths to reduce pen-up movements
- Starts from closest path to starting position
- Can be disabled with `--no-optimize`

### 4. Automatic Features
- Auto-centers SVG bounding box at starting position
- Pen up/down tracking
- Returns to starting position after drawing
- Proper G91 coordinate mapping with Y-negation

## Usage

### Basic Usage
```bash
python3 tools/scribit_svg_to_gcode.py input.svg \
  --anchor-distance 2250 \
  --left-length 1200 \
  --right-length 1200 \
  --output gcode/output.gcode
```

### With Scaling
```bash
python3 tools/scribit_svg_to_gcode.py drawing.svg \
  -a 2250 -l 1200 -r 1200 \
  --scale 2.0 \
  -o gcode/drawing.gcode
```

### With Offset
```bash
python3 tools/scribit_svg_to_gcode.py logo.svg \
  -a 2250 -l 1200 -r 1200 \
  --offset-x 50 --offset-y -20 \
  -o gcode/logo.gcode
```

### Disable Optimization
```bash
python3 tools/scribit_svg_to_gcode.py art.svg \
  -a 2250 -l 1200 -r 1200 \
  --no-optimize \
  -o gcode/art.gcode
```

## Arguments

| Argument | Short | Required | Description |
|----------|-------|----------|-------------|
| `svg_file` | - | Yes | Input SVG file path |
| `--anchor-distance` | `-a` | Yes | Distance between anchors (mm) |
| `--left-length` | `-l` | Yes | Initial left string length (mm) |
| `--right-length` | `-r` | Yes | Initial right string length (mm) |
| `--scale` | `-s` | No | Scale factor (default: 1.0) |
| `--offset-x` | - | No | X offset in mm (default: 0) |
| `--offset-y` | - | No | Y offset in mm (default: 0) |
| `--output` | `-o` | No | Output file (default: gcode/svg_output.gcode) |
| `--no-optimize` | - | No | Disable path optimization |
| `--quiet` | `-q` | No | Suppress output |

## Examples

### Single Color Drawing
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <path d="M 50 50 L 150 50 L 150 150 L 50 150 Z" stroke="black" fill="none"/>
</svg>
```

### Multi-Color Drawing
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <path d="M 50 50 L 100 50 L 100 100 L 50 100 Z" stroke="black" fill="none"/>
  <path d="M 120 75 A 25 25 0 1 0 120.001 75 Z" stroke="red" fill="none"/>
  <path d="M 50 120 L 150 120" stroke="blue" fill="none"/>
</svg>
```

### Bezier Curves
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <path d="M 50 50 C 50 100, 150 100, 150 50" stroke="black" fill="none"/>
</svg>
```

## Output Format

Generated G-code includes:
1. Stepper initialization (M17)
2. Pen holder calibration (G77)
3. Pen selection and initialization
4. Drawing commands with pen up/down
5. Return to starting position
6. Stepper disable (M18)

Example output:
```gcode
M17
G77
G90
G1 Z89
G91
G1 F1000
G1 X10.5 Y-10.5
G101
G1 X50.0 Y0.0
G90
G1 Z89
G91
G1 X-60.5 Y10.5
M18
```

## Technical Details

### Coordinate System
- Origin at left anchor
- X-axis: horizontal (right positive)
- Y-axis: vertical (down positive)
- G91 mapping: X=left_delta, Y=-right_delta (negated!)

### Curve Sampling
- Bezier curves sampled at 10 points minimum
- Arc sampling based on radius and angle
- Adjustable via `resolution` parameter in code

### Pen Switching
- Automatically raises pen before switching
- Selects new pen with Z absolute positioning
- Returns to G91 for movement

### Path Optimization
- O(n²) greedy nearest-neighbor
- Minimizes total travel distance
- Preserves path integrity

## Limitations

- SVG transforms (rotate, scale, translate) not supported
- Text elements not supported (convert to paths first)
- Gradients/patterns ignored (uses stroke/fill only)
- Very complex curves may need more sampling points

## Tips

1. **Convert text to paths** in your SVG editor before converting
2. **Use stroke, not fill** for line drawings
3. **Simplify paths** in SVG editor for smoother output
4. **Test with small scale first** before full-size drawing
5. **Use --quiet** flag in scripts to get just the output filename
