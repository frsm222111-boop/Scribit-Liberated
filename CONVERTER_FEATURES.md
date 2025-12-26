# SVG to Scribit G-code Converter - Feature Summary

## Implemented Features

### ✅ 1. Complete SVG Path Support

All SVG path commands now supported with proper implementation:

- **M/m** - Move commands (pen up)
- **L/l** - Line commands (pen down)
- **H/h** - Horizontal lines
- **V/v** - Vertical lines
- **C/c** - Cubic Bezier curves (sampled with Bernstein polynomials)
- **S/s** - Smooth cubic Bezier (control point reflection)
- **Q/q** - Quadratic Bezier curves
- **T/t** - Smooth quadratic Bezier
- **A/a** - Elliptical arcs (full SVG spec implementation)
- **Z/z** - Close path (returns to subpath start)

### ✅ 2. Multi-Color/Multi-Pen Support

Automatic pen detection and switching based on SVG colors:

**Color Mapping:**
```
Black/Default → Pen 1 (Z89)
Red           → Pen 2 (Z161)
Blue          → Pen 3 (Z233)
Green         → Pen 4 (Z305)
```

**Detection Sources:**
- `stroke` attribute
- `fill` attribute
- `style="stroke:color"` inline styles

**Pen Switching Logic:**
- Automatically raises current pen before switching
- Switches to new pen with G90/Z-absolute positioning
- Returns to G91 for movement
- Minimizes unnecessary switches

### ✅ 3. Path Optimization

Greedy nearest-neighbor algorithm to minimize travel distance:

**Algorithm:**
1. Start from initial position (calculated from string lengths)
2. Find nearest undrawn path
3. Draw that path
4. Repeat from new position

**Benefits:**
- Reduces total pen-up travel distance
- Faster drawing time
- Less string movement

**Control:**
- Enabled by default
- Disable with `--no-optimize` flag

### ✅ 4. Advanced Geometry

**Inverse Kinematics:**
- String length → Cartesian position
- Cartesian position → String lengths
- Uses law of cosines and Pythagorean theorem

**Coordinate System:**
- Origin at left anchor
- X-axis: horizontal (right positive)
- Y-axis: vertical (down positive)

**G91 Mapping:**
```python
gcode = f"G1 X{left_delta} Y{-right_delta}"  # Y negated!
```

### ✅ 5. Auto-Centering

**SVG Bounding Box:**
- Calculates min/max X and Y
- Finds center point
- Translates all coordinates to center at current position

**Benefits:**
- No manual positioning needed
- Drawing centered on current position
- Consistent placement

### ✅ 6. Scaling and Offset

**Scaling:**
- `--scale` parameter (default: 1.0)
- Applied after centering
- Maintains aspect ratio

**Offset:**
- `--offset-x` and `--offset-y` (default: 0)
- Applied after scaling
- Fine-tune positioning

### ✅ 7. Pen Control

**Full Pen Lifecycle:**

To home the pen cylinder:

```gcode
M17            # Enable steppers
G77            # Calibrate pen holder
M18 
```

To start with pen 1 in up position after homing:

```gcode
; in absolute mode go to 160 to overshoort pen 1
G90
G1 Z160

; pause 1 second
G4 P1000

; in relative mode go back 70 to engage the lowering mechanism and get to pen1 up 
G91
G1 Z-70
```

# During drawing:
G91            # Relative mode
G1 Z-30        # Pen down
G1 Z-30        # Raise pen


# At end:
M18            # Disable steppers
```

**State Tracking:**
- `pen_is_down` boolean
- `current_pen` number
- Only switches when needed

### ✅ 8. Return to Start

**Always returns to starting position:**
- Calculates delta from final to initial strings
- Generates final movement command
- Ensures strings end at same length as start
- No re-measurement needed

### ✅ 9. Curve Sampling

**Bezier Curves:**
- Bernstein polynomial evaluation
- Binomial coefficients
- 10+ points per curve

**Elliptical Arcs:**
- Full SVG spec implementation
- Endpoint → center parameterization
- Rotation support
- Large arc and sweep flags

**Adaptive Sampling:**
- Arc steps based on radius and angle
- Smooth curves without excessive points

## Testing Results

### Test 1: Star (Lines only)
- Input: 10 line segments
- Output: 16 G1 commands
- Features: Basic path support, return to start

### Test 2: Multi-color
- Input: 4 paths, 4 colors
- Output: Pen switches (Z89→Z161→Z305→Z233)
- Features: Color detection, pen switching

### Test 3: Complex (Curves + Arcs)
- Input: Bezier curves, arcs, multiple colors
- Output: 122 G1 commands
- Features: All curve types, optimization, multi-pen

## Command-Line Interface

```bash
python3 tools/scribit_svg_to_gcode.py INPUT.svg \
  --anchor-distance 2250 \
  --left-length 1200 \
  --right-length 1200 \
  --scale 1.5 \
  --offset-x 10 \
  --offset-y -5 \
  --output gcode/output.gcode \
  --no-optimize
```

**All Parameters:**
- `svg_file` - Input SVG (required)
- `-a/--anchor-distance` - Anchor separation in mm (required)
- `-l/--left-length` - Initial left string length (required)
- `-r/--right-length` - Initial right string length (required)
- `-s/--scale` - Scale factor (default: 1.0)
- `--offset-x` - X offset in mm (default: 0)
- `--offset-y` - Y offset in mm (default: 0)
- `-o/--output` - Output file (default: gcode/svg_output.gcode)
- `--no-optimize` - Disable path optimization
- `-q/--quiet` - Suppress output

## Technical Implementation

### Key Functions

**`bezier_point(t, points)`**
- Evaluates Bezier curve at parameter t
- Generic for quadratic and cubic

**`ellipse_point(cx, cy, rx, ry, angle, t)`**
- Point on rotated ellipse

**`svg_arc_to_center(...)`**
- Converts SVG arc endpoint params to center params
- Handles all edge cases

**`optimize_path_order(...)`**
- Greedy nearest-neighbor
- O(n²) complexity

**`parse_path_to_points(path_data)`**
- Tokenizes SVG path string
- Maintains state for relative commands
- Tracks control points for smooth curves

**`parse_svg_paths(svg_file)`**
- Extracts paths with namespace handling
- Detects colors from attributes
- Returns (path_data, pen_number) tuples

**`svg_to_gcode(...)`**
- Main converter
- Handles optimization, centering, scaling
- Generates complete G-code with initialization

## Files

- `tools/scribit_svg_to_gcode.py` - Main converter (685 lines)
- `docs/svg-converter.md` - User documentation
- `test_multicolor.svg` - Multi-color test
- `test_complex.svg` - Complex curves test
- `gcode/test_*.gcode` - Test outputs

## Future Enhancements (Optional)

- SVG transform support (matrix, rotate, scale)
- Text-to-path conversion
- TSP-based optimization (vs greedy)
- Preview/simulation mode
- Progress callbacks
