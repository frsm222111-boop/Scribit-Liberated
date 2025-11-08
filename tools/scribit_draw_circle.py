#!/usr/bin/env python3
"""
Scribit circle drawing using G91 mode with correct coordinate mapping.

Draws a circle by calculating points around the circumference and moving between them.

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
    """Calculate required string lengths for Cartesian position (x, y)."""
    left_length = math.sqrt(x**2 + y**2)
    right_length = math.sqrt((anchor_distance - x)**2 + y**2)
    return left_length, right_length

def generate_circle_points(center_x, center_y, radius, num_points):
    """
    Generate points around a circle.

    Args:
        center_x: Circle center X (horizontal position)
        center_y: Circle center Y (vertical position)
        radius: Circle radius (mm)
        num_points: Number of points to generate

    Returns:
        List of (x, y) points around the circle
    """
    points = []
    for i in range(num_points + 1):  # +1 to close the circle
        angle = 2 * math.pi * i / num_points
        x = center_x + radius * math.cos(angle)
        y = center_y + radius * math.sin(angle)
        points.append((x, y))
    return points

def generate_circle_gcode(anchor_distance, left_length, right_length, radius, num_points=32):
    """
    Generate G-code to draw a circle.

    Args:
        anchor_distance: Distance between anchors (mm)
        left_length: Initial left string length (mm)
        right_length: Initial right string length (mm)
        radius: Circle radius (mm)
        num_points: Number of points around circle (more = smoother)

    Returns:
        List of G-code lines
    """
    gcode_lines = [
        "M17",  # Enable steppers
        "G91",  # Relative positioning
        "G1 F1000",  # Set feedrate
    ]

    # Calculate starting position (center of circle)
    center_x, center_y = calculate_position(anchor_distance, left_length, right_length)

    # Generate circle points
    circle_points = generate_circle_points(center_x, center_y, radius, num_points)

    # Track current string lengths
    current_L = left_length
    current_R = right_length

    # Move to each point
    for i, (x, y) in enumerate(circle_points):
        # Calculate required string lengths for this point
        target_L, target_R = calculate_string_lengths(anchor_distance, x, y)

        # Calculate deltas
        delta_L = target_L - current_L
        delta_R = target_R - current_R

        # Apply Y negation for G91!
        gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")

        # Update current position
        current_L = target_L
        current_R = target_R

    # Return to center (starting position)
    delta_L = left_length - current_L
    delta_R = right_length - current_R
    gcode_lines.append(f"G1 X{delta_L:.3f} Y{-delta_R:.3f}")
    current_L = left_length
    current_R = right_length

    gcode_lines.append("M18")  # Disable steppers

    return gcode_lines, current_L, current_R

def main():
    parser = argparse.ArgumentParser(description='Generate G-code to draw a circle')
    parser.add_argument('--anchor-distance', '-a', type=float, required=True,
                        help='Distance between anchors (mm)')
    parser.add_argument('--left-length', '-l', type=float, required=True,
                        help='Initial left string length (mm)')
    parser.add_argument('--right-length', '-r', type=float, required=True,
                        help='Initial right string length (mm)')
    parser.add_argument('--radius', type=float, default=50.0,
                        help='Circle radius (mm, default: 50)')
    parser.add_argument('--points', '-p', type=int, default=32,
                        help='Number of points around circle (default: 32, more = smoother)')
    parser.add_argument('--output', '-o', type=str, default='gcode/circle.gcode',
                        help='Output file (default: gcode/circle.gcode)')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Suppress output')

    args = parser.parse_args()

    # Calculate starting position (circle center)
    center_x, center_y = calculate_position(args.anchor_distance, args.left_length, args.right_length)

    if not args.quiet:
        print(f"Circle center: x={center_x:.2f}mm, y={center_y:.2f}mm")
        print(f"Starting strings: L={args.left_length:.2f}mm, R={args.right_length:.2f}mm")
        print(f"Drawing circle: radius={args.radius}mm, {args.points} points")

    # Generate G-code
    gcode_lines, final_L, final_R = generate_circle_gcode(
        args.anchor_distance,
        args.left_length,
        args.right_length,
        args.radius,
        args.points
    )

    # Calculate first point on circle to check closure
    first_point_x = center_x + args.radius * math.cos(0)
    first_point_y = center_y + args.radius * math.sin(0)
    first_L, first_R = calculate_string_lengths(args.anchor_distance, first_point_x, first_point_y)

    if not args.quiet:
        print(f"\nCircle drawn from center to edge and back")
        print(f"Final position: L={final_L:.2f}mm, R={final_R:.2f}mm")
        print(f"Circle closure error: L={abs(final_L - first_L):.3f}mm, R={abs(final_R - first_R):.3f}mm")
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
