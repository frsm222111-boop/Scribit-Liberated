# Inverse Kinematics Distortion Test - Measurement Guide

## Overview
This guide helps you measure and analyze test patterns to diagnose inverse kinematics distortion.

## Test Approach
Create simple SVG test patterns in `gui-app/samples/`, convert them through the app, and measure actual wall drawings against expected dimensions.

## Current Test: 3 Vertical Lines
**SVG:** `test-3-vertical-lines.svg`
- 3 vertical lines, each 100mm long
- 50mm gaps between lines
- Total height: 400mm (100 + 50 + 100 + 50 + 100)

## Equipment Needed
- Measuring tape or ruler (500mm+)
- Camera/phone to document results
- Notepad or spreadsheet for recording

## Measurement Protocol

### Test: Vertical Lines (Simple)

**Expected:**
- Line 1: 100mm
- Gap 1→2: 50mm
- Line 2: 100mm
- Gap 2→3: 50mm
- Line 3: 100mm
- Total: 400mm

**Measure:**
| Measurement | Expected | Measured | Ratio (M/E) |
|-------------|----------|----------|-------------|
| Line 1 length | 100mm | _____ mm | _____ |
| Gap 1→2 | 50mm | _____ mm | _____ |
| Line 2 length | 100mm | _____ mm | _____ |
| Gap 2→3 | 50mm | _____ mm | _____ |
| Line 3 length | 100mm | _____ mm | _____ |
| Total height | 400mm | _____ mm | _____ |

**Analysis:**
- Average line ratio: _____ (avg of 3 line measurements)
- Average gap ratio: _____ (avg of 2 gap measurements)
- Total ratio: _____ (total measured / 400mm)
- If all ratios equal: uniform Y-axis scaling
- If ratios vary: position-dependent Y distortion
- **Current code has 1.25x Y compensation** (lines 717-718 in Python converter)
  - If measured ratio ≈ 1.25: confirms existing compensation factor
  - If measured ratio ≠ 1.25: need to adjust Y compensation

## Next Test Ideas

After vertical lines, consider:
- **Horizontal lines**: 3 lines, 100mm each, 50mm gaps → test X-axis
- **Square**: 100mm square → test X/Y ratio and perpendicularity
- **Grid**: 3×3 dots, 50mm spacing → test uniformity across workspace

## Diagnostic Decision Tree

### After measuring vertical lines:

**If ratio ≈ 1.25:**
- Current Y compensation (1.25x) is correct
- Problem is in X-axis or something else

**If ratio ≈ 1.0:**
- No distortion in Y-axis
- Current 1.25x compensation is wrong
- Problem may be in converter logic

**If ratio is other value:**
- Y compensation factor needs adjustment
- New factor = measured_ratio

### Next steps based on results:

1. **Measure horizontal lines** (X-axis test) to get X ratio
2. **Calculate X/Y ratio** to understand aspect distortion
   - Expected from current code: 0.893 / 1.25 = 0.7144
3. **Test square** to verify X/Y ratio and check perpendicularity
4. **Test grid** if ratios vary → indicates non-uniform distortion

## Root Cause Hypotheses

### Hypothesis 1: Forward Kinematics Error
**Evidence:** Current compensation (0.893x, 1.25x) is ad-hoc band-aid
**Location:** scribit_svg_to_gcode.py lines 717-718
**Fix:** Review calculate_position() and calculate_string_lengths() formulas

### Hypothesis 2: Anchor Distance Wrong
**Evidence:** Uniform scaling but wrong factor
**Test:** If X_ratio = Y_ratio but both ≠ 1.0
**Fix:** Measure actual anchor distance, update config

### Hypothesis 3: Steps-per-mm Calibration
**Evidence:** X and Y scale differently
**Test:** If X_ratio ≠ Y_ratio
**Fix:** Adjust steps_per_mm for motors

### Hypothesis 4: String Sag (Catenary Effect)
**Evidence:** Non-uniform distortion varies by position
**Test:** Grid spacing varies across workspace
**Fix:** Implement catenary compensation

## Recording Template

**Test Date:** _______________
**SVG File:** _______________
**Scale:** _______________

**Measurements:**
- Line 1: _____ mm (expected 100mm) → ratio: _____
- Gap 1→2: _____ mm (expected 50mm) → ratio: _____
- Line 2: _____ mm (expected 100mm) → ratio: _____
- Gap 2→3: _____ mm (expected 50mm) → ratio: _____
- Line 3: _____ mm (expected 100mm) → ratio: _____
- Total: _____ mm (expected 400mm) → ratio: _____

**Conclusion:**
_____________________________________________

**Next Action:**
_____________________________________________
