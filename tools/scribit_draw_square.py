#!/usr/bin/env python3
"""
Scribit square drawing using G91 mode with correct coordinate mapping.

Draws a square at constant height using horizontal movements and vertical drops.

CRITICAL: G91 coordinate mapping requires negating the right string delta!
- G-code X = left string delta
- G-code Y = -right string delta (NEGATED!)
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
    Calculate new string lengths for horizontal movement at constant height.

    Uses right triangle geometry:
    - AM = horizontal distance from left anchor to projection point M
    - H = constant height (perpendicular distance)
    """
    # Calculate current position of M
    AM = (left_length**2 - right_length**2 + anchor_distance**2) / (2 * anchor_distance)
    BM = anchor_distance - AM

    # Calculate constant height
    H = math.sqrt(left_length**2 - AM**2)

    # Move M horizontally
    AM_new = AM + horizontal_distance
    BM_new = BM - horizontal_distance

    # Calculate new string lengths
    new_left_length = math.sqrt(H**2 + AM_new**2)
    new_right_length = math.sqrt(H**2 + BM_new**2)

    return new_left_length, new_right_length

def calculate_vertical_movement(left_length, right_length, anchor_distance, vertical_distance):
    """
    Calculate new string lengths for vertical movement at constant horizontal position.

    Maintains constant AM (horizontal position) while changing H (height).
    """
    # Calculate current position
    AM = (left_length**2 - right_length**2 + anchor_distance**2) / (2 * anchor_distance)
    BM = anchor_distance - AM
    H = math.sqrt(left_length**2 - AM**2)

    # Change height
    H_new = H + vertical_distance

    # Calculate new string lengths maintaining AM, BM
    new_left_length = math.sqrt(AM**2 + H_new**2)
    new_right_length = math.sqrt(BM**2 + H_new**2)

    return new_left_length, new_right_length

def generate_square_gcode(anchor_distance, left_length, right_length, size, steps_per_side=5):
    """
    Generate G-code to draw a square.

    Args:
        anchor_distance: Distance between anchors (mm)
        left_length: Initial left string length (mm)
        right_length: Initial right string length (mm)
        size: Side length of square (mm)
        steps_per_side: Number of steps to break each side into

    Returns:
        List of G-code lines
    """
    gcode_lines = [
        "M17",  # Enable steppers
        "G91",  # Relative positioning
        "G1 F1000",  # Set feedrate
    ]

    current_L = left_length
    current_R = right_length

    # Helper function to add movement commands
    def add_horizontal_move(distance, label):
        nonlocal current_L, current_R
        step_size = distance / steps_per_side

        for i in range(steps_per_side):
            new_L, new_R = calculate_horizontal_movement(
                current_L, current_R, anchor_distance, step_size
            )
            delta_L = new_L - current_L
            delta_R = new_R - current_R

            # Apply Y negation for G91!
            gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")

            current_L = new_L
            current_R = new_R

    def add_vertical_move(distance, label):
        nonlocal current_L, current_R
        step_size = distance / steps_per_side

        for i in range(steps_per_side):
            new_L, new_R = calculate_vertical_movement(
                current_L, current_R, anchor_distance, step_size
            )
            delta_L = new_L - current_L
            delta_R = new_R - current_R

            # Apply Y negation for G91!
            gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")

            current_L = new_L
            current_R = new_R

    # Draw square: right, down, left, up
    add_horizontal_move(size, "right")
    add_vertical_move(size, "down")
    add_horizontal_move(-size, "left")
    add_vertical_move(-size, "up")

    gcode_lines.append("M18")  # Disable steppers

    return gcode_lines, current_L, current_R

def main():
    parser = argparse.ArgumentParser(description='Generate G-code to draw a square')
    parser.add_argument('--anchor-distance', '-a', type=float, required=True,
                        help='Distance between anchors (mm)')
    parser.add_argument('--left-length', '-l', type=float, required=True,
                        help='Initial left string length (mm)')
    parser.add_argument('--right-length', '-r', type=float, required=True,
                        help='Initial right string length (mm)')
    parser.add_argument('--size', '-s', type=float, default=100.0,
                        help='Side length of square (mm, default: 100)')
    parser.add_argument('--steps', type=int, default=5,
                        help='Steps per side for smoother paths (default: 5)')
    parser.add_argument('--output', '-o', type=str, default='gcode/square.gcode',
                        help='Output file (default: gcode/square.gcode)')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Suppress output')

    args = parser.parse_args()

    # Calculate starting position
    x_start, y_start = calculate_position(args.anchor_distance, args.left_length, args.right_length)

    if not args.quiet:
        print(f"Starting position: x={x_start:.2f}mm, y={y_start:.2f}mm")
        print(f"Starting strings: L={args.left_length:.2f}mm, R={args.right_length:.2f}mm")
        print(f"Drawing {args.size}mm square with {args.steps} steps per side")

    # Generate G-code
    gcode_lines, final_L, final_R = generate_square_gcode(
        args.anchor_distance,
        args.left_length,
        args.right_length,
        args.size,
        args.steps
    )

    if not args.quiet:
        print(f"\nFinal strings: L={final_L:.2f}mm, R={final_R:.2f}mm")
        print(f"Error: L={abs(final_L - args.left_length):.3f}mm, R={abs(final_R - args.right_length):.3f}mm")
        print(f"Total commands: {len([l for l in gcode_lines if l.startswith('G1')])}")

    # Write to file
    with open(args.output, 'w') as f:
        f.write('\n'.join(gcode_lines))

    if not args.quiet:
        print(f"\nG-code written to: {args.output}")
    else:
        print(args.output)

if __name__ == "__main__":
    main()
