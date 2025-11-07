# Anchor Position Measurement Guide

## Goal
Determine the exact (x, y) coordinates of the two wall anchor points to enable Cartesian to string-length conversion.

## What We Know
- **Anchor spacing:** 2.25 meters (2250mm) horizontally
- **Anchors at TOP** of wall (near ceiling)
- **Device hangs** from these anchors

## Measurement Methods

### Method 1: Physical Measurement (Most Accurate)

#### Tools Needed:
- Tape measure (or laser measure)
- Paper and pen for notes

#### Steps:

1. **Choose coordinate origin:**
   - Recommended: **Top-left corner of wall** as (0, 0)
   - Alternative: Left anchor as (0, 0)

2. **Measure left anchor position:**
   - Distance from left edge of wall to left anchor: `x1`
   - Distance from top edge of wall to anchor: `y1`
   - Record: Left anchor = `(x1, y1)`

3. **Measure right anchor position:**
   - Distance from left edge of wall to right anchor: `x2`
   - Distance from top edge of wall to anchor: `y2`
   - Record: Right anchor = `(x2, y2)`

4. **Verify anchor spacing:**
   - Calculate: `x2 - x1` should equal **2250mm**
   - If not exactly 2250mm, use measured value

5. **Measure wall dimensions (optional but helpful):**
   - Total wall width
   - Total wall height
   - This helps define drawable area

#### Example:
```
Wall: 3000mm wide × 2400mm tall
Left anchor: 375mm from left edge, 100mm from top = (375, 100)
Right anchor: 2625mm from left edge, 100mm from top = (2625, 100)
Spacing check: 2625 - 375 = 2250mm ✓
```

### Method 2: From Current Device Position

If device is currently hanging on wall:

1. **Measure device position:**
   - Horizontal distance from left edge to device center: `cx`
   - Vertical distance from top edge to device center: `cy`

2. **Measure string lengths:**
   - You may be able to see/measure approximate string lengths
   - Or use current motor positions from firmware

3. **Use reverse calculation** (see below)

### Method 3: From Calibration G-code Response

The cloud calibration API returns a command like:
```gcode
G92 X0 Y0
G1 X100 Y75 F1000
```

This tells us:
- After calibration, strings are set to (0, 0)
- Then device moves to position (100, 75) in string-space

**We can analyze this to estimate anchor positions** (requires some math).

## What to Measure Now

Please provide:

### Minimum Info (Method 1 - Physical):
```
Left anchor position:
  x1 = ___ mm (distance from left wall edge)
  y1 = ___ mm (distance from top wall edge)

Right anchor position:
  x2 = ___ mm (distance from left wall edge)
  y2 = ___ mm (distance from top wall edge)

Wall dimensions:
  Width = ___ mm
  Height = ___ mm
```

### Alternative (Method 2 - Current Position):
```
Device current position:
  Horizontal from left edge = ___ mm
  Vertical from top edge = ___ mm

Approximate string lengths (if visible):
  Left string = ___ mm
  Right string = ___ mm
```

### Alternative (Method 3 - Calibration):
If you can run calibration and capture the response:
```
1. Run autocal.gcode
2. Capture the G92 and G1 commands returned
3. Share them here
```

## Questions to Answer

1. **Where are your anchors?**
   - How far from left wall edge?
   - How far from top wall edge?
   - Exact spacing between them?

2. **What's your wall size?**
   - Total width?
   - Total height?

3. **Coordinate system preference?**
   - Top-left corner as (0,0)? [RECOMMENDED]
   - Left anchor as (0,0)?
   - Other?

## Why This Matters

Once we have anchor positions, we can implement:

```python
class ScribitKinematics:
    def __init__(self):
        # YOUR MEASURED VALUES HERE
        self.anchor_left = (x1, y1)    # mm from origin
        self.anchor_right = (x2, y2)   # mm from origin

        # Known hardware constants
        self.motor_offset = 76.2       # 3 inches
        self.pen_offset = 25.4         # 1 inch

    def cartesian_to_strings(self, px, py):
        """Convert pen position to string lengths"""
        # Account for cylinder being below pen
        cy = py + self.pen_offset
        cx = px

        # Account for motors at edges
        left_x = cx - self.motor_offset
        right_x = cx + self.motor_offset

        # Calculate string lengths
        L1 = math.sqrt((self.anchor_left[0] - left_x)**2 +
                       (self.anchor_left[1] - cy)**2)
        L2 = math.sqrt((self.anchor_right[0] - right_x)**2 +
                       (self.anchor_right[1] - cy)**2)

        return L1, L2
```

Then we can convert any Cartesian drawing to string-space G-code!

## Next Step

**Please measure and provide the anchor positions**, and we'll build the converter immediately.
