#!/usr/bin/env python3
"""
Scribit Kinematics Library

Converts Cartesian coordinates to string-length space for Scribit dual-string plotter.

Hardware configuration:
- Anchors at (0, 0) and (2250, 0) mm - top corners of wall
- 6" diameter cylinder with motors at edges
- Pen opening 1" above cylinder center
- Device hangs from strings (suspended configuration)
"""

import math
from typing import Tuple, Optional


class ScribitKinematics:
    """Kinematics converter for Scribit dual-string plotter"""

    def __init__(
        self,
        anchor_left: Tuple[float, float] = (0.0, 0.0),
        anchor_right: Tuple[float, float] = (2250.0, 0.0),
        motor_offset: float = 76.2,  # 3 inches (half of 6" cylinder)
        pen_offset: float = 25.4,    # 1 inch above cylinder center
    ):
        """
        Initialize kinematics with hardware parameters.

        Args:
            anchor_left: Left anchor position (x, y) in mm
            anchor_right: Right anchor position (x, y) in mm
            motor_offset: Distance from cylinder center to motor (mm)
            pen_offset: Distance from cylinder center to pen tip (mm)
        """
        self.anchor_left = anchor_left
        self.anchor_right = anchor_right
        self.motor_offset = motor_offset
        self.pen_offset = pen_offset

        # Calculate anchor spacing
        self.anchor_spacing = anchor_right[0] - anchor_left[0]

    def cartesian_to_strings(self, px: float, py: float) -> Tuple[float, float]:
        """
        Convert Cartesian pen position to string lengths.

        Args:
            px: Pen X position (mm, 0 = left edge)
            py: Pen Y position (mm, 0 = top edge)

        Returns:
            (L1, L2): Left and right string lengths in mm
            NOTE: Returns as (right_string, left_string) because firmware has X=right, Y=left
        """
        # Account for pen being above cylinder center (extends toward wall)
        cylinder_y = py + self.pen_offset
        cylinder_x = px

        # Account for motors at cylinder edges
        left_motor_x = cylinder_x - self.motor_offset
        left_motor_y = cylinder_y

        right_motor_x = cylinder_x + self.motor_offset
        right_motor_y = cylinder_y

        # Calculate string lengths from anchors to motors
        left_string = math.sqrt(
            (self.anchor_left[0] - left_motor_x) ** 2 +
            (self.anchor_left[1] - left_motor_y) ** 2
        )

        right_string = math.sqrt(
            (self.anchor_right[0] - right_motor_x) ** 2 +
            (self.anchor_right[1] - right_motor_y) ** 2
        )

        # SWAP: Firmware has X=right motor, Y=left motor
        return right_string, left_string

    def strings_to_cartesian(self, L1: float, L2: float, iterations: int = 5) -> Optional[Tuple[float, float]]:
        """
        Convert string lengths to Cartesian pen position (inverse kinematics).

        Uses iterative refinement to account for motor and pen offsets.

        Args:
            L1: Right string length (mm) - firmware X motor
            L2: Left string length (mm) - firmware Y motor
            iterations: Number of refinement iterations (default 5)

        Returns:
            (px, py): Pen position in mm, or None if no solution
        """
        # SWAP: L1=right, L2=left (firmware mapping)
        right_string = L1
        left_string = L2
        d = self.anchor_spacing  # Distance between anchors

        # Check if solution exists (rough check)
        if right_string + left_string < d:
            return None  # Strings too short
        if abs(right_string - left_string) > d + 200:  # Some margin for offsets
            return None  # One string too short

        # Initial guess: solve for point assuming no offsets
        # Two circles: left anchor with left_string radius, right anchor with right_string radius
        a = (left_string**2 - right_string**2 + d**2) / (2 * d)

        if left_string**2 - a**2 < 0:
            return None

        h = math.sqrt(left_string**2 - a**2)

        # Initial guess (this is where left motor would be, approximately)
        px = a
        py = h

        # Iteratively refine to account for motor and pen offsets
        for _ in range(iterations):
            # Calculate where motors and cylinder would be for this pen position
            cy = py + self.pen_offset  # Cylinder below pen

            left_motor_x = px - self.motor_offset
            right_motor_x = px + self.motor_offset

            # Calculate what string lengths we'd get from this position
            calc_L1 = math.sqrt((left_motor_x - self.anchor_left[0])**2 +
                               (cy - self.anchor_left[1])**2)
            calc_L2 = math.sqrt((right_motor_x - self.anchor_right[0])**2 +
                               (cy - self.anchor_right[1])**2)

            # Errors in string lengths
            error_L1 = L1 - calc_L1
            error_L2 = L2 - calc_L2

            # If errors are small enough, we're done
            if abs(error_L1) < 0.1 and abs(error_L2) < 0.1:
                break

            # Adjust position based on errors
            # Use gradient descent-like approach
            # If L1 error is positive, we need to move away from left anchor
            # If L2 error is positive, we need to move away from right anchor

            # Calculate unit vectors from anchors to current position
            if cy > 0:
                dx1 = (left_motor_x - self.anchor_left[0]) / calc_L1 if calc_L1 > 0 else 0
                dy1 = (cy - self.anchor_left[1]) / calc_L1 if calc_L1 > 0 else 1

                dx2 = (right_motor_x - self.anchor_right[0]) / calc_L2 if calc_L2 > 0 else 0
                dy2 = (cy - self.anchor_right[1]) / calc_L2 if calc_L2 > 0 else 1

                # Move in direction of errors
                px += 0.5 * (error_L1 * dx1 + error_L2 * dx2)
                py += 0.5 * (error_L1 * dy1 + error_L2 * dy2) - self.pen_offset * 0.5

        return px, py

    def is_position_reachable(
        self,
        px: float,
        py: float,
        min_string: float = 200.0,
        max_string: float = 3000.0,
        min_angle: float = 15.0,
    ) -> Tuple[bool, str]:
        """
        Check if a Cartesian position is reachable by the device.

        Args:
            px: Pen X position (mm)
            py: Pen Y position (mm)
            min_string: Minimum safe string length (mm)
            max_string: Maximum string length (mm)
            min_angle: Minimum safe angle from vertical (degrees)

        Returns:
            (reachable, reason): True if reachable, with reason if not
        """
        L1, L2 = self.cartesian_to_strings(px, py)

        # Check string length limits
        if L1 < min_string:
            return False, f"Left string too short: {L1:.1f}mm < {min_string}mm"
        if L2 < min_string:
            return False, f"Right string too short: {L2:.1f}mm < {min_string}mm"
        if L1 > max_string:
            return False, f"Left string too long: {L1:.1f}mm > {max_string}mm"
        if L2 > max_string:
            return False, f"Right string too long: {L2:.1f}mm > {max_string}mm"

        # Check if too close to anchors (extreme angles)
        cylinder_x = px
        cylinder_y = py + self.pen_offset

        # Angle from vertical for left string
        dx_left = cylinder_x - self.anchor_left[0]
        dy_left = cylinder_y - self.anchor_left[1]
        angle_left = abs(math.degrees(math.atan2(dx_left, dy_left)))

        # Angle from vertical for right string
        dx_right = cylinder_x - self.anchor_right[0]
        dy_right = cylinder_y - self.anchor_right[1]
        angle_right = abs(math.degrees(math.atan2(dx_right, dy_right)))

        if angle_left < min_angle:
            return False, f"Too close to left anchor: {angle_left:.1f}° < {min_angle}°"
        if angle_right < min_angle:
            return False, f"Too close to right anchor: {angle_right:.1f}° < {min_angle}°"

        return True, "Position reachable"

    def get_workspace_bounds(
        self,
        min_string: float = 200.0,
        max_string: float = 3000.0,
        min_angle: float = 15.0,
        step: float = 50.0,
    ) -> Tuple[float, float, float, float]:
        """
        Calculate approximate workspace boundaries.

        Returns:
            (min_x, max_x, min_y, max_y): Workspace bounds in mm
        """
        # Simple approximation - can be refined
        min_x = min_string * math.sin(math.radians(min_angle))
        max_x = self.anchor_spacing - min_x

        min_y = min_string * math.cos(math.radians(min_angle))
        max_y = max_string * 0.9  # Conservative estimate

        return min_x, max_x, min_y, max_y


# Create default instance with confirmed anchor positions
default_kinematics = ScribitKinematics(
    anchor_left=(0.0, 0.0),
    anchor_right=(2250.0, 0.0),
)


def cartesian_to_strings(px: float, py: float) -> Tuple[float, float]:
    """
    Convenience function using default kinematics.

    Args:
        px: Pen X position (mm)
        py: Pen Y position (mm)

    Returns:
        (L1, L2): String lengths in mm
    """
    return default_kinematics.cartesian_to_strings(px, py)


if __name__ == "__main__":
    # Test cases
    print("Scribit Kinematics Test\n")

    kin = ScribitKinematics()

    test_positions = [
        (1125, 500, "Center, 500mm down"),
        (300, 1000, "Left side, 1000mm down"),
        (1950, 1000, "Right side, 1000mm down"),
        (1125, 200, "Center, near top"),
        (1125, 2000, "Center, 2000mm down"),
    ]

    for px, py, desc in test_positions:
        L1, L2 = kin.cartesian_to_strings(px, py)
        reachable, reason = kin.is_position_reachable(px, py)

        print(f"{desc}:")
        print(f"  Cartesian: ({px:.1f}, {py:.1f}) mm")
        print(f"  String lengths: L1={L1:.2f}mm, L2={L2:.2f}mm")
        print(f"  Reachable: {reachable} - {reason}")
        print()

    # Show workspace bounds
    bounds = kin.get_workspace_bounds()
    print(f"Estimated workspace bounds:")
    print(f"  X: {bounds[0]:.1f}mm to {bounds[1]:.1f}mm ({bounds[1]-bounds[0]:.1f}mm wide)")
    print(f"  Y: {bounds[2]:.1f}mm to {bounds[3]:.1f}mm ({bounds[3]-bounds[2]:.1f}mm tall)")
