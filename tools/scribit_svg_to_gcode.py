#!/usr/bin/env python3
"""
Scribit SVG to G-code converter using correct G91 coordinate mapping.

Converts SVG paths to G-code with proper kinematics and Y-negation.

CRITICAL: G91 coordinate mapping requires negating the right string delta!
- G-code X = left string delta
- G-code Y = -right string delta (NEGATED!)
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

def parse_svg_paths(svg_file):
    """
    Parse SVG file and extract path elements.

    Returns:
        List of path 'd' attribute strings
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
            paths.append(d)

    # Try without namespace if none found
    if not paths:
        for path in root.findall('.//path'):
            d = path.get('d')
            if d:
                paths.append(d)

    return paths

def parse_path_to_points(path_data, resolution=5.0):
    """
    Parse SVG path data into list of (x, y) points.

    Simple parser that handles M (move) and L (line) commands.
    Curves are approximated as lines.

    Args:
        path_data: SVG path 'd' attribute string
        resolution: Maximum distance between points (mm)

    Returns:
        List of (x, y, pen_down) tuples where pen_down is bool
    """
    points = []
    current_x, current_y = 0, 0
    subpath_start_x, subpath_start_y = 0, 0  # Track start of current subpath for Z command

    # Simple command parsing
    commands = path_data.replace(',', ' ').split()
    i = 0

    while i < len(commands):
        cmd = commands[i]

        if cmd == 'M':  # Move to (absolute)
            current_x = float(commands[i + 1])
            current_y = float(commands[i + 2])
            subpath_start_x, subpath_start_y = current_x, current_y  # Remember start
            points.append((current_x, current_y, False))  # Pen up
            i += 3

        elif cmd == 'm':  # Move to (relative)
            current_x += float(commands[i + 1])
            current_y += float(commands[i + 2])
            subpath_start_x, subpath_start_y = current_x, current_y  # Remember start
            points.append((current_x, current_y, False))  # Pen up
            i += 3

        elif cmd == 'L':  # Line to (absolute)
            current_x = float(commands[i + 1])
            current_y = float(commands[i + 2])
            points.append((current_x, current_y, True))  # Pen down
            i += 3

        elif cmd == 'l':  # Line to (relative)
            current_x += float(commands[i + 1])
            current_y += float(commands[i + 2])
            points.append((current_x, current_y, True))  # Pen down
            i += 3

        elif cmd == 'H':  # Horizontal line (absolute)
            current_x = float(commands[i + 1])
            points.append((current_x, current_y, True))
            i += 2

        elif cmd == 'h':  # Horizontal line (relative)
            current_x += float(commands[i + 1])
            points.append((current_x, current_y, True))
            i += 2

        elif cmd == 'V':  # Vertical line (absolute)
            current_y = float(commands[i + 1])
            points.append((current_x, current_y, True))
            i += 2

        elif cmd == 'v':  # Vertical line (relative)
            current_y += float(commands[i + 1])
            points.append((current_x, current_y, True))
            i += 2

        elif cmd == 'Z' or cmd == 'z':  # Close path
            # Draw line back to start of subpath
            if current_x != subpath_start_x or current_y != subpath_start_y:
                points.append((subpath_start_x, subpath_start_y, True))
                current_x = subpath_start_x
                current_y = subpath_start_y
            i += 1

        else:
            # Skip unsupported commands (C, Q, A, etc.)
            i += 1

    return points

def svg_to_gcode(svg_file, anchor_distance, left_length, right_length,
                 scale=1.0, offset_x=0.0, offset_y=0.0):
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

    Returns:
        List of G-code lines
    """
    # Parse SVG paths
    paths = parse_svg_paths(svg_file)

    if not paths:
        raise ValueError(f"No paths found in {svg_file}")

    # Calculate starting position (center of drawing)
    start_x, start_y = calculate_position(anchor_distance, left_length, right_length)

    gcode_lines = [
        "M17",  # Enable steppers
        "G91",  # Relative positioning
        "G1 F1000",  # Set feedrate
    ]

    current_L = left_length
    current_R = right_length

    # Process each path
    for path_data in paths:
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
            # Center the SVG, apply scale and offset
            # Translate SVG coords to be centered at (0,0), then apply transformations
            relative_x = (svg_x - svg_center_x) * scale
            relative_y = (svg_y - svg_center_y) * scale

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
            args.offset_y
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
