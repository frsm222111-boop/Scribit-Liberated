#!/usr/bin/env python3
"""
Scribit vertical movement controller using two-string kinematics.
Calculates string lengths needed to move vertically from current position.
"""

import math
import argparse

def calculate_position(anchor_distance, left_length, right_length):
    """Calculate (x, y) position from string lengths.

    Coordinate system:
    - Origin at left anchor
    - X-axis horizontal (positive right)
    - Y-axis vertical (positive down)
    """
    # Using law of cosines to find x position
    # left_length^2 = x^2 + y^2
    # right_length^2 = (anchor_distance - x)^2 + y^2
    # Solving for x:
    x = (left_length**2 - right_length**2 + anchor_distance**2) / (2 * anchor_distance)

    # Calculate y from left string length
    y = math.sqrt(left_length**2 - x**2)

    return x, y

def calculate_string_lengths(anchor_distance, x, y):
    """Calculate required string lengths for position (x, y)."""
    left_length = math.sqrt(x**2 + y**2)
    right_length = math.sqrt((anchor_distance - x)**2 + y**2)
    return left_length, right_length

def main():
    parser = argparse.ArgumentParser(description='Generate G-code for Scribit vertical movement')
    parser.add_argument('--anchor-distance', '-a', type=float, required=True,
                        help='Distance between anchors (mm)')
    parser.add_argument('--left-length', '-l', type=float, required=True,
                        help='Initial left string length (mm)')
    parser.add_argument('--right-length', '-r', type=float, required=True,
                        help='Initial right string length (mm)')
    parser.add_argument('--output', '-o', type=str, default='gcode/vertical_move.gcode',
                        help='Output G-code file (default: gcode/vertical_move.gcode)')
    parser.add_argument('--distance', '-d', type=float, default=100.0,
                        help='Vertical move distance in mm (default: 100.0)')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Suppress console output')

    args = parser.parse_args()

    # Calculate current position
    x_current, y_current = calculate_position(args.anchor_distance, args.left_length, args.right_length)

    if not args.quiet:
        print(f"Current position: x={x_current:.2f}mm, y={y_current:.2f}mm")

    # Move down
    x_target_down = x_current + args.distance
    left_target_down, right_target_down = calculate_string_lengths(args.anchor_distance, x_target_down, y_current)

    left_delta_down = left_target_down - args.left_length
    right_delta_down = right_target_down - args.right_length

    if not args.quiet:
        print(f"\nMove {args.distance}mm down:")
        print(f"  New position: x={x_target_down:.2f}mm, y={y_current:.2f}mm")
        print(f"  String lengths: L={left_target_down:.2f}mm, R={right_target_down:.2f}mm")

    # Move back to start
    left_delta_up = -left_delta_down
    right_delta_up = -right_delta_down

    if not args.quiet:
        print(f"\nMove {args.distance}mm up (back to start):")
        print(f"  New position: x={x_current:.2f}mm, y={y_current:.2f}mm")
        print(f"  String lengths: L={args.left_length:.2f}mm, R={args.right_length:.2f}mm")

    # Generate G-code
    gcode_lines = [
        "M17",  # Enable steppers
        "G91",  # Relative positioning
        "G1 F1000",  # Set feedrate
        f"G1 X{left_delta_down:.3f} Y{right_delta_down:.3f}",  # Move down
        "G4 P500",  # Pause 500ms
        f"G1 X{left_delta_up:.3f} Y{right_delta_up:.3f}",  # Move up (back to start)
        "M18"  # Disable steppers
    ]

    # Write to file
    with open(args.output, 'w') as f:
        f.write('\n'.join(gcode_lines))

    if not args.quiet:
        print(f"\nG-code written to: {args.output}")
    else:
        print(args.output)

if __name__ == "__main__":
    main()
