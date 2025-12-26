#!/usr/bin/env python3
"""
Scribit SVG to G-code converter - Overshoot method edition.

Features:
- Complete SVG path support (M, L, H, V, C, S, Q, T, A, Z)
- Multi-color pen switching (auto-detects stroke/fill colors)
- Path optimization (greedy nearest-neighbor)
- Auto-centering and scaling
- Proper G91 coordinate mapping with Y-negation
- ALL 4 PENS WORKING with overshoot method!

CRITICAL: G91 coordinate mapping requires negating the right string delta!
- G-code X = left string delta
- G-code Y = -right string delta (NEGATED!)

PEN CONTROL (OVERSHOOT METHOD - HARDWARE VERIFIED):
ASSUMPTION: Script assumes cylinder is homed and at pen1 up position
  (Run: G77, G90, G1 Z160, G91, G1 Z-70 before running generated gcode)

Pen Down:
  G1 Z-30      ; Lower pen

Pen Up:
  G1 Z30       ; Raise pen

Pen Switching (to next pen 2,3,4):
  G1 Z30       ; Pen up if down
  G1 Z72       ; Rotate to next pen
  G1 Z60       ; Overshoot
  G1 Z-60      ; Return to engage → next pen up

Pen Switching (pen4 → pen1):
  G1 Z30       ; Pen up if down
  G1 Z72       ; First rotation
  G1 Z72       ; Second rotation
  G1 Z60       ; Overshoot
  G1 Z-60      ; Return to engage → pen1 up

Color to Pen Mapping:
  Black (default) -> Pen 1
  Red            -> Pen 2
  Blue           -> Pen 3
  Green          -> Pen 4
"""

import math
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path

def calculate_position(anchor_distance, left_length, right_length):
    """Calculate (x, y) position from string lengths."""
    x = (left_length**2 - right_length**2 + anchor_distance**2) / (2 * anchor_distance)
    y = math.sqrt(left_length**2 - x**2)
    return x, y

def calculate_string_lengths(anchor_distance, x, y):
    """Calculate required string lengths for Cartesian position (x, y)."""
    left_length = math.sqrt(x**2 + y**2)
    right_length = math.sqrt((anchor_distance - x)**2 + y**2)
    return left_length, right_length

def get_color_pen(color_str):
    """Map color to pen number (1-4). All pens now working!"""
    if not color_str or color_str in ['black', '#000000', '#000', 'none']:
        return 1  # Default pen

    # Simple color mapping - all 4 pens work with new method
    color_map = {
        'red': 2, '#ff0000': 2, '#f00': 2,
        'blue': 3, '#0000ff': 3, '#00f': 3,
        'green': 4, '#00ff00': 4, '#0f0': 4,
    }

    return color_map.get(color_str.lower(), 1)

def parse_svg_paths(svg_file):
    """
    Parse SVG file and extract path elements with color info.

    Returns:
        List of (path_d, pen_number) tuples
    """
    tree = ET.parse(svg_file)
    root = tree.getroot()

    # Handle SVG namespace
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    if root.tag.startswith('{'):
        ns['svg'] = root.tag.split('}')[0][1:]

    # Find all path elements
    paths = []
    for path in root.findall('.//svg:path', ns):
        d = path.get('d')
        if d:
            # Get stroke or fill color
            stroke = path.get('stroke')
            fill = path.get('fill')
            style = path.get('style', '')

            # Parse style attribute for stroke/fill
            color = None
            if 'stroke:' in style:
                for part in style.split(';'):
                    if 'stroke:' in part:
                        color = part.split(':')[1].strip()
            elif stroke:
                color = stroke
            elif fill and fill != 'none':
                color = fill

            pen = get_color_pen(color)
            paths.append((d, pen))

    # Try without namespace if none found
    if not paths:
        for path in root.findall('.//path'):
            d = path.get('d')
            if d:
                stroke = path.get('stroke')
                fill = path.get('fill')
                style = path.get('style', '')

                color = None
                if 'stroke:' in style:
                    for part in style.split(';'):
                        if 'stroke:' in part:
                            color = part.split(':')[1].strip()
                elif stroke:
                    color = stroke
                elif fill and fill != 'none':
                    color = fill

                pen = get_color_pen(color)
                paths.append((d, pen))

    return paths

def bezier_point(t, points):
    """Calculate point on Bezier curve at parameter t (0 to 1)."""
    n = len(points) - 1
    x = y = 0
    for i, (px, py) in enumerate(points):
        # Binomial coefficient
        binom = math.factorial(n) // (math.factorial(i) * math.factorial(n - i))
        # Bernstein polynomial
        bernstein = binom * (t ** i) * ((1 - t) ** (n - i))
        x += bernstein * px
        y += bernstein * py
    return x, y

def ellipse_point(cx, cy, rx, ry, angle, t):
    """Calculate point on ellipse at parameter t (0 to 2π)."""
    # Point on unrotated ellipse
    x = rx * math.cos(t)
    y = ry * math.sin(t)
    # Rotate by angle
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    xr = x * cos_a - y * sin_a
    yr = x * sin_a + y * cos_a
    return cx + xr, cy + yr

def svg_arc_to_center(x1, y1, x2, y2, rx, ry, phi, fa, fs):
    """Convert SVG arc parameters to center parameterization."""
    # Based on SVG spec: https://www.w3.org/TR/SVG/implnotes.html#ArcImplementationNotes
    cos_phi = math.cos(phi)
    sin_phi = math.sin(phi)

    # Step 1: Compute center point
    dx = (x1 - x2) / 2
    dy = (y1 - y2) / 2
    x1p = cos_phi * dx + sin_phi * dy
    y1p = -sin_phi * dx + cos_phi * dy

    # Correct radii if needed
    lambda_ = (x1p / rx) ** 2 + (y1p / ry) ** 2
    if lambda_ > 1:
        rx *= math.sqrt(lambda_)
        ry *= math.sqrt(lambda_)

    # Step 2: Compute center
    sign = -1 if fa == fs else 1
    sq = max(0, (rx * ry) ** 2 - (rx * y1p) ** 2 - (ry * x1p) ** 2)
    sq = sign * math.sqrt(sq / ((rx * y1p) ** 2 + (ry * x1p) ** 2))

    cxp = sq * rx * y1p / ry
    cyp = -sq * ry * x1p / rx

    cx = cos_phi * cxp - sin_phi * cyp + (x1 + x2) / 2
    cy = sin_phi * cxp + cos_phi * cyp + (y1 + y2) / 2

    # Step 3: Compute angles
    def angle_between(ux, uy, vx, vy):
        dot = ux * vx + uy * vy
        mod = math.sqrt((ux ** 2 + uy ** 2) * (vx ** 2 + vy ** 2))
        rad = math.acos(dot / mod)
        return rad if (ux * vy - uy * vx) >= 0 else -rad

    theta1 = angle_between(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dtheta = angle_between((x1p - cxp) / rx, (y1p - cyp) / ry,
                          (-x1p - cxp) / rx, (-y1p - cyp) / ry)

    if fs == 0 and dtheta > 0:
        dtheta -= 2 * math.pi
    elif fs == 1 and dtheta < 0:
        dtheta += 2 * math.pi

    return cx, cy, rx, ry, theta1, dtheta

def parse_path_to_points(path_data, resolution=5.0):
    """
    Parse SVG path data into list of (x, y) points.

    Handles M, L, H, V, C, S, Q, T, A, Z commands (absolute and relative).

    Args:
        path_data: SVG path 'd' attribute string
        resolution: Maximum distance between points (mm)

    Returns:
        List of (x, y, pen_down) tuples where pen_down is bool
    """
    points = []
    current_x, current_y = 0, 0
    subpath_start_x, subpath_start_y = 0, 0
    last_control_x, last_control_y = None, None  # For S and T commands

    # Simple command parsing
    commands = path_data.replace(',', ' ').split()
    i = 0

    while i < len(commands):
        cmd = commands[i]

        if cmd == 'M':  # Move to (absolute)
            current_x = float(commands[i + 1])
            current_y = float(commands[i + 2])
            subpath_start_x, subpath_start_y = current_x, current_y
            points.append((current_x, current_y, False))
            last_control_x, last_control_y = None, None
            i += 3

        elif cmd == 'm':  # Move to (relative)
            current_x += float(commands[i + 1])
            current_y += float(commands[i + 2])
            subpath_start_x, subpath_start_y = current_x, current_y
            points.append((current_x, current_y, False))
            last_control_x, last_control_y = None, None
            i += 3

        elif cmd == 'L':  # Line to (absolute)
            current_x = float(commands[i + 1])
            current_y = float(commands[i + 2])
            points.append((current_x, current_y, True))
            last_control_x, last_control_y = None, None
            i += 3

        elif cmd == 'l':  # Line to (relative)
            current_x += float(commands[i + 1])
            current_y += float(commands[i + 2])
            points.append((current_x, current_y, True))
            last_control_x, last_control_y = None, None
            i += 3

        elif cmd == 'H':  # Horizontal line (absolute)
            current_x = float(commands[i + 1])
            points.append((current_x, current_y, True))
            last_control_x, last_control_y = None, None
            i += 2

        elif cmd == 'h':  # Horizontal line (relative)
            current_x += float(commands[i + 1])
            points.append((current_x, current_y, True))
            last_control_x, last_control_y = None, None
            i += 2

        elif cmd == 'V':  # Vertical line (absolute)
            current_y = float(commands[i + 1])
            points.append((current_x, current_y, True))
            last_control_x, last_control_y = None, None
            i += 2

        elif cmd == 'v':  # Vertical line (relative)
            current_y += float(commands[i + 1])
            points.append((current_x, current_y, True))
            last_control_x, last_control_y = None, None
            i += 2

        elif cmd == 'C':  # Cubic Bezier (absolute)
            x1, y1 = float(commands[i + 1]), float(commands[i + 2])
            x2, y2 = float(commands[i + 3]), float(commands[i + 4])
            x, y = float(commands[i + 5]), float(commands[i + 6])
            # Sample curve
            curve_points = [(current_x, current_y), (x1, y1), (x2, y2), (x, y)]
            steps = max(10, int(resolution))
            for j in range(1, steps + 1):
                t = j / steps
                px, py = bezier_point(t, curve_points)
                points.append((px, py, True))
            current_x, current_y = x, y
            last_control_x, last_control_y = x2, y2
            i += 7

        elif cmd == 'c':  # Cubic Bezier (relative)
            x1, y1 = current_x + float(commands[i + 1]), current_y + float(commands[i + 2])
            x2, y2 = current_x + float(commands[i + 3]), current_y + float(commands[i + 4])
            x, y = current_x + float(commands[i + 5]), current_y + float(commands[i + 6])
            curve_points = [(current_x, current_y), (x1, y1), (x2, y2), (x, y)]
            steps = max(10, int(resolution))
            for j in range(1, steps + 1):
                t = j / steps
                px, py = bezier_point(t, curve_points)
                points.append((px, py, True))
            current_x, current_y = x, y
            last_control_x, last_control_y = x2, y2
            i += 7

        elif cmd == 'S':  # Smooth cubic Bezier (absolute)
            # First control point is reflection of last control point
            if last_control_x is not None:
                x1 = 2 * current_x - last_control_x
                y1 = 2 * current_y - last_control_y
            else:
                x1, y1 = current_x, current_y
            x2, y2 = float(commands[i + 1]), float(commands[i + 2])
            x, y = float(commands[i + 3]), float(commands[i + 4])
            curve_points = [(current_x, current_y), (x1, y1), (x2, y2), (x, y)]
            steps = max(10, int(resolution))
            for j in range(1, steps + 1):
                t = j / steps
                px, py = bezier_point(t, curve_points)
                points.append((px, py, True))
            current_x, current_y = x, y
            last_control_x, last_control_y = x2, y2
            i += 5

        elif cmd == 's':  # Smooth cubic Bezier (relative)
            if last_control_x is not None:
                x1 = 2 * current_x - last_control_x
                y1 = 2 * current_y - last_control_y
            else:
                x1, y1 = current_x, current_y
            x2, y2 = current_x + float(commands[i + 1]), current_y + float(commands[i + 2])
            x, y = current_x + float(commands[i + 3]), current_y + float(commands[i + 4])
            curve_points = [(current_x, current_y), (x1, y1), (x2, y2), (x, y)]
            steps = max(10, int(resolution))
            for j in range(1, steps + 1):
                t = j / steps
                px, py = bezier_point(t, curve_points)
                points.append((px, py, True))
            current_x, current_y = x, y
            last_control_x, last_control_y = x2, y2
            i += 5

        elif cmd == 'Q':  # Quadratic Bezier (absolute)
            x1, y1 = float(commands[i + 1]), float(commands[i + 2])
            x, y = float(commands[i + 3]), float(commands[i + 4])
            curve_points = [(current_x, current_y), (x1, y1), (x, y)]
            steps = max(10, int(resolution))
            for j in range(1, steps + 1):
                t = j / steps
                px, py = bezier_point(t, curve_points)
                points.append((px, py, True))
            current_x, current_y = x, y
            last_control_x, last_control_y = x1, y1
            i += 5

        elif cmd == 'q':  # Quadratic Bezier (relative)
            x1, y1 = current_x + float(commands[i + 1]), current_y + float(commands[i + 2])
            x, y = current_x + float(commands[i + 3]), current_y + float(commands[i + 4])
            curve_points = [(current_x, current_y), (x1, y1), (x, y)]
            steps = max(10, int(resolution))
            for j in range(1, steps + 1):
                t = j / steps
                px, py = bezier_point(t, curve_points)
                points.append((px, py, True))
            current_x, current_y = x, y
            last_control_x, last_control_y = x1, y1
            i += 5

        elif cmd == 'T':  # Smooth quadratic Bezier (absolute)
            if last_control_x is not None:
                x1 = 2 * current_x - last_control_x
                y1 = 2 * current_y - last_control_y
            else:
                x1, y1 = current_x, current_y
            x, y = float(commands[i + 1]), float(commands[i + 2])
            curve_points = [(current_x, current_y), (x1, y1), (x, y)]
            steps = max(10, int(resolution))
            for j in range(1, steps + 1):
                t = j / steps
                px, py = bezier_point(t, curve_points)
                points.append((px, py, True))
            current_x, current_y = x, y
            last_control_x, last_control_y = x1, y1
            i += 3

        elif cmd == 't':  # Smooth quadratic Bezier (relative)
            if last_control_x is not None:
                x1 = 2 * current_x - last_control_x
                y1 = 2 * current_y - last_control_y
            else:
                x1, y1 = current_x, current_y
            x, y = current_x + float(commands[i + 1]), current_y + float(commands[i + 2])
            curve_points = [(current_x, current_y), (x1, y1), (x, y)]
            steps = max(10, int(resolution))
            for j in range(1, steps + 1):
                t = j / steps
                px, py = bezier_point(t, curve_points)
                points.append((px, py, True))
            current_x, current_y = x, y
            last_control_x, last_control_y = x1, y1
            i += 3

        elif cmd == 'A':  # Arc (absolute)
            rx, ry = float(commands[i + 1]), float(commands[i + 2])
            x_axis_rot = float(commands[i + 3]) * math.pi / 180
            large_arc = int(float(commands[i + 4]))
            sweep = int(float(commands[i + 5]))
            x, y = float(commands[i + 6]), float(commands[i + 7])

            if rx == 0 or ry == 0:
                # Degenerate to line
                points.append((x, y, True))
            else:
                cx, cy, rx, ry, theta1, dtheta = svg_arc_to_center(
                    current_x, current_y, x, y, rx, ry, x_axis_rot, large_arc, sweep
                )
                steps = max(10, int(abs(dtheta) * max(rx, ry) / resolution))
                for j in range(1, steps + 1):
                    t = theta1 + (j / steps) * dtheta
                    px, py = ellipse_point(cx, cy, rx, ry, x_axis_rot, t)
                    points.append((px, py, True))

            current_x, current_y = x, y
            last_control_x, last_control_y = None, None
            i += 8

        elif cmd == 'a':  # Arc (relative)
            rx, ry = float(commands[i + 1]), float(commands[i + 2])
            x_axis_rot = float(commands[i + 3]) * math.pi / 180
            large_arc = int(float(commands[i + 4]))
            sweep = int(float(commands[i + 5]))
            x, y = current_x + float(commands[i + 6]), current_y + float(commands[i + 7])

            if rx == 0 or ry == 0:
                points.append((x, y, True))
            else:
                cx, cy, rx, ry, theta1, dtheta = svg_arc_to_center(
                    current_x, current_y, x, y, rx, ry, x_axis_rot, large_arc, sweep
                )
                steps = max(10, int(abs(dtheta) * max(rx, ry) / resolution))
                for j in range(1, steps + 1):
                    t = theta1 + (j / steps) * dtheta
                    px, py = ellipse_point(cx, cy, rx, ry, x_axis_rot, t)
                    points.append((px, py, True))

            current_x, current_y = x, y
            last_control_x, last_control_y = None, None
            i += 8

        elif cmd == 'Z' or cmd == 'z':  # Close path
            if current_x != subpath_start_x or current_y != subpath_start_y:
                points.append((subpath_start_x, subpath_start_y, True))
                current_x = subpath_start_x
                current_y = subpath_start_y
            last_control_x, last_control_y = None, None
            i += 1

        else:
            # Skip unsupported commands
            i += 1

    return points

def optimize_path_order(paths, anchor_distance, left_length, right_length):
    """
    Optimize order of paths to minimize travel distance.
    Uses greedy nearest-neighbor algorithm.

    Args:
        paths: List of (path_data, pen_number) tuples
        anchor_distance, left_length, right_length: Starting position

    Returns:
        Optimized list of (path_data, pen_number) tuples
    """
    if len(paths) <= 1:
        return paths

    # Get starting position
    start_x, start_y = calculate_position(anchor_distance, left_length, right_length)

    # Extract first point of each path
    path_starts = []
    for path_data, pen_num in paths:
        points = parse_path_to_points(path_data)
        if points:
            path_starts.append((points[0][0], points[0][1], path_data, pen_num))

    # Greedy nearest neighbor
    optimized = []
    remaining = path_starts[:]
    current_x, current_y = start_x, start_y

    while remaining:
        # Find nearest path
        min_dist = float('inf')
        nearest_idx = 0

        for i, (px, py, _, _) in enumerate(remaining):
            dist = math.sqrt((px - current_x)**2 + (py - current_y)**2)
            if dist < min_dist:
                min_dist = dist
                nearest_idx = i

        # Add to optimized list
        px, py, path_data, pen_num = remaining.pop(nearest_idx)
        optimized.append((path_data, pen_num))
        current_x, current_y = px, py

    return optimized

def svg_to_gcode(svg_file, anchor_distance, left_length, right_length,
                 scale=1.0, offset_x=0.0, offset_y=0.0, optimize=True):
    """
    Convert SVG to G-code.

    SVG coordinates are treated as millimeters and converted to absolute positions.
    The drawing starts at the current string position (center point).

    Args:
        svg_file: Path to SVG file
        anchor_distance: Distance between anchors (mm)
        left_length: Initial left string length (mm)
        right_length: Initial right string length (mm)
        scale: Scale factor (1.0 = 1:1)
        offset_x: X offset to add to all SVG points (mm)
        offset_y: Y offset to add to all SVG points (mm)
        optimize: Whether to optimize path order (default: True)

    Returns:
        List of G-code lines
    """
    # Parse SVG paths
    paths = parse_svg_paths(svg_file)

    if not paths:
        raise ValueError(f"No paths found in {svg_file}")

    # Optimize path order if requested
    if optimize:
        paths = optimize_path_order(paths, anchor_distance, left_length, right_length)

    # Calculate starting position (center of drawing)
    start_x, start_y = calculate_position(anchor_distance, left_length, right_length)

    # Assumes already homed and at pen1 up (G77, G90, Z160, G91, Z-70 done separately)
    gcode_lines = [
        "M17",      # Enable steppers
        "G91",      # Ensure relative mode
        "G1 F1000", # Set feedrate
    ]

    current_L = left_length
    current_R = right_length
    pen_z_relative = 0  # Track relative Z position (0 = up, -30 = down)
    current_pen = 1

    # Process each path
    for path_data, pen_number in paths:
        # All 4 pens now work!
        if pen_number > 4:
            pen_number = 1  # Fallback to pen 1

        # Switch pen if needed
        if pen_number != current_pen:
            # Raise current pen if down (from -30 to 0)
            if pen_z_relative == -30:
                gcode_lines.append("G1 Z30")  # Pen up
                pen_z_relative = 0

            # Calculate pen distance (how many pens to move forward)
            pen_distance = pen_number - current_pen

            # Handle wrap-around: pen4 → pen1
            if current_pen == 4 and pen_number == 1:
                # Special case: double rotation for pen4 → pen1
                gcode_lines.append("G1 Z72")   # First rotation
                gcode_lines.append("G1 Z72")   # Second rotation
                gcode_lines.append("G1 Z60")   # Overshoot
                gcode_lines.append("G1 Z-60")  # Return to engage → pen1 up
            else:
                # Normal case: move to next pen(s)
                # Each pen is 72° away, add 60° overshoot, return -60°
                for _ in range(abs(pen_distance)):
                    gcode_lines.append("G1 Z72")   # Rotate to next pen
                gcode_lines.append("G1 Z60")       # Overshoot
                gcode_lines.append("G1 Z-60")      # Return to engage → next pen up

            current_pen = pen_number
            pen_z_relative = 0  # After switch, always at pen up

        points = parse_path_to_points(path_data)

        # Find SVG bounding box to center the drawing
        if points:
            svg_min_x = min(p[0] for p in points)
            svg_max_x = max(p[0] for p in points)
            svg_min_y = min(p[1] for p in points)
            svg_max_y = max(p[1] for p in points)
            svg_center_x = (svg_min_x + svg_max_x) / 2
            svg_center_y = (svg_min_y + svg_max_y) / 2

        for svg_x, svg_y, pen_down in points:
            # Handle pen up/down (CORRECTED METHOD)
            if pen_down and pen_z_relative == 0:
                # Lower pen
                gcode_lines.append("G1 Z-30")  # PEN DOWN!
                pen_z_relative = -30
            elif not pen_down and pen_z_relative == -30:
                # Raise pen
                gcode_lines.append("G1 Z30")  # PEN UP!
                pen_z_relative = 0
            # Center the SVG, apply scale and offset
            # Translate SVG coords to be centered at (0,0), then apply transformations
            # Calibrated compensation: 28mm/50mm measured → 0.893x, 40mm/50mm → 1.25x
            relative_x = (svg_x - svg_center_x) * scale * 0.893
            relative_y = (svg_y - svg_center_y) * scale * 1.25

            # Calculate absolute position on wall
            target_x = start_x + relative_x + offset_x
            target_y = start_y + relative_y + offset_y

            # Calculate string lengths
            target_L, target_R = calculate_string_lengths(anchor_distance, target_x, target_y)

            delta_L = target_L - current_L
            delta_R = target_R - current_R

            # Apply Y negation for G91!
            gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")

            current_L = target_L
            current_R = target_R

    # Ensure pen is up before returning
    if pen_z_relative == -30:
        gcode_lines.append("G1 Z30")  # Pen up
        pen_z_relative = 0

    # Return to starting position
    delta_L = left_length - current_L
    delta_R = right_length - current_R
    gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")
    current_L = left_length
    current_R = right_length

    gcode_lines.append("M18")  # Disable steppers

    return gcode_lines, current_L, current_R

def main():
    parser = argparse.ArgumentParser(description='Convert SVG to Scribit G-code')
    parser.add_argument('svg_file', type=Path,
                        help='Input SVG file')
    parser.add_argument('--anchor-distance', '-a', type=float, required=True,
                        help='Distance between anchors (mm)')
    parser.add_argument('--left-length', '-l', type=float, required=True,
                        help='Initial left string length (mm)')
    parser.add_argument('--right-length', '-r', type=float, required=True,
                        help='Initial right string length (mm)')
    parser.add_argument('--scale', '-s', type=float, default=1.0,
                        help='Scale factor (default: 1.0)')
    parser.add_argument('--offset-x', type=float, default=0.0,
                        help='X offset in mm (default: 0)')
    parser.add_argument('--offset-y', type=float, default=0.0,
                        help='Y offset in mm (default: 0)')
    parser.add_argument('--output', '-o', type=str, default='gcode/svg_output.gcode',
                        help='Output file (default: gcode/svg_output.gcode)')
    parser.add_argument('--no-optimize', action='store_true',
                        help='Disable path optimization')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Suppress output')

    args = parser.parse_args()

    if not args.svg_file.exists():
        print(f"Error: SVG file not found: {args.svg_file}")
        return 1

    # Calculate starting position
    start_x, start_y = calculate_position(args.anchor_distance, args.left_length, args.right_length)

    if not args.quiet:
        print(f"Converting: {args.svg_file}")
        print(f"Starting position: x={start_x:.2f}mm, y={start_y:.2f}mm")
        print(f"Starting strings: L={args.left_length:.2f}mm, R={args.right_length:.2f}mm")
        print(f"Scale: {args.scale}x, Offset: ({args.offset_x}, {args.offset_y})")

    try:
        gcode_lines, final_L, final_R = svg_to_gcode(
            args.svg_file,
            args.anchor_distance,
            args.left_length,
            args.right_length,
            args.scale,
            args.offset_x,
            args.offset_y,
            optimize=not args.no_optimize
        )

        if not args.quiet:
            print(f"\nFinal strings: L={final_L:.2f}mm, R={final_R:.2f}mm")
            print(f"Total commands: {len([l for l in gcode_lines if l.startswith('G1')])}")

        # Write to file
        with open(args.output, 'w') as f:
            f.write('\n'.join(gcode_lines))

        if not args.quiet:
            print(f"\nG-code written to: {args.output}")
        else:
            print(args.output)

    except Exception as e:
        print(f"Error: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
