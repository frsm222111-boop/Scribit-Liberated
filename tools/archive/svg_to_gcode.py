#!/usr/bin/env python3
"""
SVG to Scribit G-code Converter

Converts SVG paths to string-space G-code for Scribit device.
Uses kinematics library to transform Cartesian coordinates.
"""

import argparse
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Tuple, Optional
import re

try:
    from svg.path import parse_path, Line, CubicBezier, QuadraticBezier, Arc
    from svg.path.path import Move
    SVG_PATH_AVAILABLE = True
except ImportError:
    SVG_PATH_AVAILABLE = False
    print("Warning: svg.path not available. Install with: pip install svg.path", file=sys.stderr)

from scribit_kinematics import ScribitKinematics


class SVGToGcode:
    """Convert SVG to Scribit G-code"""

    def __init__(
        self,
        kinematics: Optional[ScribitKinematics] = None,
        feedrate: float = 1000.0,
        resolution: float = 1.0,  # mm per segment
    ):
        """
        Initialize converter.

        Args:
            kinematics: Kinematics instance (uses default if None)
            feedrate: Drawing feedrate in mm/min
            resolution: Maximum distance between path points (mm)
        """
        self.kin = kinematics or ScribitKinematics()
        self.feedrate = feedrate
        self.resolution = resolution

    def svg_to_gcode(
        self,
        svg_file: Path,
        origin_x: float = 0.0,
        origin_y: float = 0.0,
        scale: float = 1.0,
    ) -> str:
        """
        Convert SVG file to G-code.

        Args:
            svg_file: Path to SVG file
            origin_x: X offset for drawing origin (mm)
            origin_y: Y offset for drawing origin (mm)
            scale: Scale factor (1.0 = 1:1)

        Returns:
            G-code string
        """
        if not SVG_PATH_AVAILABLE:
            raise ImportError("svg.path library required. Install with: pip install svg.path")

        # Parse SVG
        tree = ET.parse(svg_file)
        root = tree.getroot()

        # Extract namespace
        ns = {'svg': 'http://www.w3.org/2000/svg'}
        if root.tag.startswith('{'):
            ns['svg'] = root.tag.split('}')[0][1:]

        # Find all path elements
        paths = root.findall('.//svg:path', ns)
        if not paths:
            # Try without namespace
            paths = root.findall('.//path')

        if not paths:
            raise ValueError(f"No paths found in {svg_file}")

        # Generate G-code
        gcode_lines = []
        gcode_lines.append("; Scribit G-code generated from SVG")
        gcode_lines.append(f"; Source: {svg_file.name}")
        gcode_lines.append(f"; Origin: ({origin_x}, {origin_y}) mm")
        gcode_lines.append(f"; Scale: {scale}")
        gcode_lines.append("")

        # Setup
        gcode_lines.append("M17           ; Enable motors")
        gcode_lines.append("G90           ; Absolute positioning")
        gcode_lines.append(f"G1 F{self.feedrate:.0f}  ; Set feedrate")
        gcode_lines.append("")

        # Process each path
        current_L1 = None
        current_L2 = None

        for i, path_elem in enumerate(paths):
            path_data = path_elem.get('d')
            if not path_data:
                continue

            gcode_lines.append(f"; Path {i + 1}")

            try:
                path = parse_path(path_data)
                path_gcode, current_L1, current_L2 = self._convert_path(
                    path, origin_x, origin_y, scale, current_L1, current_L2
                )
                gcode_lines.extend(path_gcode)
                gcode_lines.append("")

            except Exception as e:
                gcode_lines.append(f"; Error processing path {i + 1}: {e}")
                gcode_lines.append("")

        # Finish
        gcode_lines.append("M18           ; Disable motors")

        return '\n'.join(gcode_lines)

    def _convert_path(
        self,
        path,
        origin_x: float,
        origin_y: float,
        scale: float,
        prev_L1: Optional[float] = None,
        prev_L2: Optional[float] = None,
    ) -> Tuple[List[str], Optional[float], Optional[float]]:
        """
        Convert a single SVG path to G-code commands with relative movements.

        Returns:
            (gcode_lines, last_L1, last_L2) for tracking position
        """
        gcode = []
        pen_down = False
        current_L1 = prev_L1
        current_L2 = prev_L2

        for segment in path:
            if isinstance(segment, Move):
                # Pen up, move to position
                if pen_down:
                    gcode.append("M18           ; Pen up")
                    pen_down = False

                px = origin_x + segment.end.real * scale
                py = origin_y + segment.end.imag * scale

                # Check if reachable
                reachable, reason = self.kin.is_position_reachable(px, py)
                if not reachable:
                    gcode.append(f"; Warning: Position unreachable - {reason}")
                    continue

                L1, L2 = self.kin.cartesian_to_strings(px, py)

                if current_L1 is not None and current_L2 is not None:
                    # Output relative movement
                    delta_L1 = L1 - current_L1
                    delta_L2 = L2 - current_L2
                    gcode.append(f"G1 X{delta_L1:.2f} Y{delta_L2:.2f}")
                else:
                    # First move - output absolute
                    gcode.append(f"G1 X{L1:.2f} Y{L2:.2f}")

                current_L1 = L1
                current_L2 = L2

            elif isinstance(segment, Line):
                # Pen down, draw line
                if not pen_down:
                    gcode.append("M17           ; Pen down")
                    pen_down = True

                px = origin_x + segment.end.real * scale
                py = origin_y + segment.end.imag * scale

                reachable, reason = self.kin.is_position_reachable(px, py)
                if not reachable:
                    gcode.append(f"; Warning: Position unreachable - {reason}")
                    continue

                L1, L2 = self.kin.cartesian_to_strings(px, py)

                if current_L1 is not None and current_L2 is not None:
                    # Output relative movement
                    delta_L1 = L1 - current_L1
                    delta_L2 = L2 - current_L2
                    gcode.append(f"G1 X{delta_L1:.2f} Y{delta_L2:.2f}")
                else:
                    # First move - output absolute
                    gcode.append(f"G1 X{L1:.2f} Y{L2:.2f}")

                current_L1 = L1
                current_L2 = L2

            elif isinstance(segment, (CubicBezier, QuadraticBezier, Arc)):
                # Approximate curve with line segments
                if not pen_down:
                    gcode.append("M17           ; Pen down")
                    pen_down = True

                # Sample points along curve
                num_samples = max(2, int(segment.length() / self.resolution))
                for i in range(1, num_samples + 1):
                    t = i / num_samples
                    point = segment.point(t)

                    px = origin_x + point.real * scale
                    py = origin_y + point.imag * scale

                    reachable, reason = self.kin.is_position_reachable(px, py)
                    if not reachable:
                        continue

                    L1, L2 = self.kin.cartesian_to_strings(px, py)

                    if current_L1 is not None and current_L2 is not None:
                        # Output relative movement
                        delta_L1 = L1 - current_L1
                        delta_L2 = L2 - current_L2
                        gcode.append(f"G1 X{delta_L1:.2f} Y{delta_L2:.2f}")
                    else:
                        # First move - output absolute
                        gcode.append(f"G1 X{L1:.2f} Y{L2:.2f}")

                    current_L1 = L1
                    current_L2 = L2

        return gcode, current_L1, current_L2

    def simple_shape_to_gcode(
        self,
        shape: str,
        center_x: float,
        center_y: float,
        size: float,
        start_L1: Optional[float] = None,
        start_L2: Optional[float] = None,
    ) -> str:
        """
        Generate G-code for simple geometric shapes.

        Args:
            shape: 'square', 'circle', 'triangle'
            center_x: Center X position (mm)
            center_y: Center Y position (mm)
            size: Size in mm (width/diameter)
            start_L1: Current left string length (mm), if known
            start_L2: Current right string length (mm), if known

        Returns:
            G-code string
        """
        import math

        gcode = []
        gcode.append(f"; {shape.capitalize()} at ({center_x}, {center_y}), size {size}mm")

        # Calculate starting position if string lengths provided
        if start_L1 is not None and start_L2 is not None:
            start_pos = self.kin.strings_to_cartesian(start_L1, start_L2)
            if start_pos:
                gcode.append(f"; Starting position: L1={start_L1}mm, L2={start_L2}mm")
                gcode.append(f"; Starting position: ({start_pos[0]:.1f}, {start_pos[1]:.1f}) mm")
            else:
                gcode.append(f"; Warning: Invalid starting string lengths")

        gcode.append("M17")
        gcode.append("G90")
        gcode.append(f"G1 F{self.feedrate:.0f}")
        gcode.append("")

        if shape == 'square':
            half = size / 2
            points = [
                (center_x - half, center_y - half),  # Top-left
                (center_x + half, center_y - half),  # Top-right
                (center_x + half, center_y + half),  # Bottom-right
                (center_x - half, center_y + half),  # Bottom-left
                (center_x - half, center_y - half),  # Close
            ]

        elif shape == 'circle':
            radius = size / 2
            num_points = max(16, int(2 * math.pi * radius / self.resolution))
            points = []
            for i in range(num_points + 1):
                angle = 2 * math.pi * i / num_points
                x = center_x + radius * math.cos(angle)
                y = center_y + radius * math.sin(angle)
                points.append((x, y))

        elif shape == 'triangle':
            height = size * math.sqrt(3) / 2
            points = [
                (center_x, center_y - height * 2/3),          # Top
                (center_x + size/2, center_y + height/3),     # Bottom-right
                (center_x - size/2, center_y + height/3),     # Bottom-left
                (center_x, center_y - height * 2/3),          # Close
            ]

        else:
            raise ValueError(f"Unknown shape: {shape}")

        # Convert points to G-code with relative movements
        # If starting position known, use it; otherwise start from first point
        prev_L1 = start_L1
        prev_L2 = start_L2

        for i, (px, py) in enumerate(points):
            reachable, reason = self.kin.is_position_reachable(px, py)
            if not reachable:
                gcode.append(f"; Warning: Point {i} unreachable - {reason}")
                continue

            L1, L2 = self.kin.cartesian_to_strings(px, py)

            if prev_L1 is not None and prev_L2 is not None:
                # Output relative movement
                delta_L1 = L1 - prev_L1
                delta_L2 = L2 - prev_L2
                gcode.append(f"G1 X{delta_L1:.2f} Y{delta_L2:.2f}")
            else:
                # First move - no known starting position
                gcode.append(f"G1 X{L1:.2f} Y{L2:.2f}  ; First move (unknown start pos)")

            prev_L1 = L1
            prev_L2 = L2

        gcode.append("")
        gcode.append("M18")

        return '\n'.join(gcode)


def main():
    parser = argparse.ArgumentParser(
        description="Convert SVG to Scribit G-code (string-space)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert SVG to G-code
  python svg_to_gcode.py drawing.svg -o output.gcode

  # Scale and offset
  python svg_to_gcode.py drawing.svg -o output.gcode --scale 2.0 --origin 500 300

  # Generate test shapes
  python svg_to_gcode.py --shape square --center 1125 1000 --size 400 -o square.gcode
        """
    )

    parser.add_argument('input', nargs='?', help='Input SVG file')
    parser.add_argument('-o', '--output', required=True, help='Output G-code file')
    parser.add_argument('--origin', nargs=2, type=float, default=[0, 0],
                        metavar=('X', 'Y'), help='Drawing origin offset (mm)')
    parser.add_argument('--scale', type=float, default=1.0,
                        help='Scale factor (default: 1.0)')
    parser.add_argument('--feedrate', type=float, default=1000.0,
                        help='Feedrate in mm/min (default: 1000)')

    # Simple shape generation
    parser.add_argument('--shape', choices=['square', 'circle', 'triangle'],
                        help='Generate simple shape instead of SVG')
    parser.add_argument('--center', nargs=2, type=float, metavar=('X', 'Y'),
                        help='Shape center position (mm)')
    parser.add_argument('--size', type=float, help='Shape size (mm)')

    # Starting position (for accurate relative movements)
    parser.add_argument('--anchor-distance', type=float, default=2250.0,
                        help='Distance between anchors in mm (default: 2250)')
    parser.add_argument('--start-L1', type=float,
                        help='Current left string length in mm')
    parser.add_argument('--start-L2', type=float,
                        help='Current right string length in mm')

    args = parser.parse_args()

    # Create converter with custom anchor distance if specified
    kinematics = ScribitKinematics(
        anchor_left=(0.0, 0.0),
        anchor_right=(args.anchor_distance, 0.0),
    )
    converter = SVGToGcode(kinematics=kinematics, feedrate=args.feedrate)

    # Generate G-code
    if args.shape:
        if not args.center or not args.size:
            parser.error("--shape requires --center and --size")

        gcode = converter.simple_shape_to_gcode(
            args.shape,
            args.center[0],
            args.center[1],
            args.size,
            start_L1=args.start_L1,
            start_L2=args.start_L2,
        )

    else:
        if not args.input:
            parser.error("input SVG file required (or use --shape)")

        svg_file = Path(args.input)
        if not svg_file.exists():
            print(f"Error: File not found: {svg_file}", file=sys.stderr)
            return 1

        gcode = converter.svg_to_gcode(
            svg_file,
            args.origin[0],
            args.origin[1],
            args.scale,
        )

    # Write output
    output_file = Path(args.output)
    output_file.write_text(gcode)
    print(f"G-code written to: {output_file}")
    print(f"Lines: {len(gcode.splitlines())}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
