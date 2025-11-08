#!/usr/bin/env python3
"""
Scribit true horizontal straight-line movement.
Moves along a straight horizontal line at constant height (parallel to floor).

CRITICAL: G91 coordinate mapping requires negating the right string delta!
- G-code X = left string delta
- G-code Y = -right string delta (NEGATED!)

See docs/g91-coordinate-mapping.md for details.
"""

import math
import argparse

def calculate_position(anchor_distance, left_length, right_length):
    """Calculate (x, y) position from string lengths."""
    x = (left_length**2 - right_length**2 + anchor_distance**2) / (2 * anchor_distance)
    y = math.sqrt(left_length**2 - x**2)
    return x, y

def calculate_string_lengths(anchor_distance, x, y):
    """Calculate required string lengths for position (x, y)."""
    left_length = math.sqrt(x**2 + y**2)
    right_length = math.sqrt((anchor_distance - x)**2 + y**2)
    return left_length, right_length

def calculate_horizontal_movement(left_length, right_length, anchor_distance, horizontal_distance):
    """
    Calculate string length changes for true horizontal movement.

    Using right triangle geometry:
    - A = left anchor, B = right anchor, C = scribit, M = point above C on AB
    - AM and BM are horizontal distances
    - CM is constant height (perpendicular from C to AB)

    When M moves horizontally by x:
    - AM changes by x
    - BM changes by -x
    - String lengths recalculated using Pythagorean theorem

    Returns:
        (new_left_length, new_right_length)
    """
    # Calculate current position of M (horizontal distance from left anchor)
    # Using law of cosines: AM = (L1² - L2² + AB²) / (2×AB)
    AM = (left_length**2 - right_length**2 + anchor_distance**2) / (2 * anchor_distance)
    BM = anchor_distance - AM

    # Calculate constant height CM using Pythagorean theorem
    CM = math.sqrt(left_length**2 - AM**2)

    # Move M horizontally by horizontal_distance
    AM_new = AM + horizontal_distance
    BM_new = BM - horizontal_distance

    # Calculate new string lengths maintaining constant height
    new_left_length = math.sqrt(CM**2 + AM_new**2)
    new_right_length = math.sqrt(CM**2 + BM_new**2)

    return new_left_length, new_right_length

def main():
    parser = argparse.ArgumentParser(description='Generate G-code for straight horizontal movement')
    parser.add_argument('--anchor-distance', '-a', type=float, required=True,
                        help='Distance between anchors (mm)')
    parser.add_argument('--left-length', '-l', type=float, required=True,
                        help='Initial left string length (mm)')
    parser.add_argument('--right-length', '-r', type=float, required=True,
                        help='Initial right string length (mm)')
    parser.add_argument('--output', '-o', type=str, default='gcode/horizontal_straight.gcode',
                        help='Output G-code file (default: gcode/horizontal_straight.gcode)')
    parser.add_argument('--distance', '-d', type=float, default=100.0,
                        help='Horizontal move distance in mm (default: 100.0)')
    parser.add_argument('--steps', '-s', type=int, default=10,
                        help='Number of intermediate steps (default: 10)')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Suppress console output')

    args = parser.parse_args()

    # Calculate current position
    x_current, y_current = calculate_position(args.anchor_distance, args.left_length, args.right_length)

    if not args.quiet:
        print(f"Current position: x={x_current:.2f}mm, y={y_current:.2f}mm")
        print(f"Current strings: L={args.left_length:.2f}mm, R={args.right_length:.2f}mm")

    # Generate G-code
    gcode_lines = [
        "M17",  # Enable steppers
        "G91",  # Relative positioning
        "G1 F1000",  # Set feedrate
    ]

    # Current string lengths
    current_L = args.left_length
    current_R = args.right_length

    # Move right in steps
    step_distance = args.distance / args.steps
    for i in range(args.steps):
        new_L, new_R = calculate_horizontal_movement(
            current_L, current_R, args.anchor_distance, step_distance
        )

        delta_L = new_L - current_L
        delta_R = new_R - current_R

        # Firmware mapping: X=left_delta, Y=-right_delta (negated!)
        gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")

        current_L = new_L
        current_R = new_R

        if not args.quiet and i == 0:
            print(f"\nFirst step right ({step_distance:.1f}mm):")
            print(f"  New strings: L={new_L:.2f}mm, R={new_R:.2f}mm")
            print(f"  Delta: X={delta_L:.3f}, Y={delta_R:.3f}")

    if not args.quiet:
        print(f"\nAfter moving right {args.distance}mm:")
        print(f"  Final strings: L={current_L:.2f}mm, R={current_R:.2f}mm")

    gcode_lines.append("G4 P500")  # Pause

    # Move back left in steps
    for i in range(args.steps):
        new_L, new_R = calculate_horizontal_movement(
            current_L, current_R, args.anchor_distance, -step_distance
        )

        delta_L = new_L - current_L
        delta_R = new_R - current_R

        # Firmware mapping: X=left_delta, Y=-right_delta (negated!)
        gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")

        current_L = new_L
        current_R = new_R

    gcode_lines.append("M18")  # Disable steppers

    if not args.quiet:
        print(f"\nAfter returning to start:")
        print(f"  Final strings: L={current_L:.2f}mm, R={current_R:.2f}mm")

    # Write to file
    with open(args.output, 'w') as f:
        f.write('\n'.join(gcode_lines))

    if not args.quiet:
        print(f"\nG-code written to: {args.output}")
        print(f"Total commands: {len([l for l in gcode_lines if l.startswith('G1 X')])}")
    else:
        print(args.output)

if __name__ == "__main__":
    main()
