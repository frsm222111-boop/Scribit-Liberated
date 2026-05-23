#!/usr/bin/env python3
"""Tests for scribit_svg_to_gcode.py utilities."""

import pytest
import sys
import math

sys.path.insert(0, 'tools')
from scribit_svg_to_gcode import (
    calculate_position,
    calculate_string_lengths,
    parse_css_color,
    color_to_pen,
    get_color_pen,
)


class TestCalculatePosition:
    def test_center_position(self):
        # When both strings are equal length, point is directly below center
        x, y = calculate_position(2000, 1200, 1200)
        assert abs(x - 1000) < 0.1
        assert abs(y - math.sqrt(1200**2 - 1000**2)) < 0.1

    def test_left_anchor_position(self):
        # When left string is longer, point is closer to right anchor
        x, y = calculate_position(2000, 1500, 1000)
        assert x > 1000  # shifted right

    def test_right_anchor_position(self):
        # When right string is longer, point is closer to left anchor
        x, y = calculate_position(2000, 1000, 1500)
        assert x < 1000  # shifted left


class TestCalculateStringLengths:
    def test_center_position(self):
        L, R = calculate_string_lengths(2000, 1000, 500)
        assert abs(L - math.sqrt(1000**2 + 500**2)) < 0.001
        assert abs(R - math.sqrt(1000**2 + 500**2)) < 0.001

    def test_round_trip(self):
        # Going position -> string lengths -> position should give same result
        orig_x, orig_y = 800, 600
        L, R = calculate_string_lengths(2000, orig_x, orig_y)
        new_x, new_y = calculate_position(2000, L, R)
        assert abs(new_x - orig_x) < 0.001
        assert abs(new_y - orig_y) < 0.001


class TestParseCssColor:
    def test_hex6_black(self):
        assert parse_css_color('#000000') == (0, 0, 0)

    def test_hex6_red(self):
        assert parse_css_color('#ff0000') == (255, 0, 0)

    def test_hex3(self):
        assert parse_css_color('#f00') == (255, 0, 0)

    def test_named_red(self):
        assert parse_css_color('red') == (255, 0, 0)

    def test_named_green(self):
        assert parse_css_color('green') == (0, 128, 0)  # CSS green

    def test_named_blue(self):
        assert parse_css_color('blue') == (0, 0, 255)

    def test_rgb_format(self):
        assert parse_css_color('rgb(255, 0, 0)') == (255, 0, 0)

    def test_rgba_format(self):
        assert parse_css_color('rgba(255, 0, 0, 0.5)') == (255, 0, 0)

    def test_none(self):
        assert parse_css_color('none') is None

    def test_empty(self):
        assert parse_css_color('') is None

    def test_unknown_returns_none(self):
        assert parse_css_color('notacolor') is None


class TestColorToPen:
    def test_black(self):
        assert color_to_pen('black') == 1
        assert color_to_pen('#000000') == 1

    def test_red(self):
        assert color_to_pen('red') == 2
        assert color_to_pen('#ff0000') == 2

    def test_blue(self):
        assert color_to_pen('blue') == 3
        assert color_to_pen('#0000ff') == 3

    def test_green(self):
        assert color_to_pen('green') == 4
        assert color_to_pen('#00ff00') == 4  # lime, close to green

    def test_nearest_neighbor(self):
        # Orange is closer to red than to green
        assert color_to_pen('orange') == 2

    def test_near_black(self):
        # Very dark gray should map to black (pen 1)
        assert color_to_pen('#111111') == 1

    def test_cyan_maps_to_blue(self):
        # Cyan is closer to blue than to any other pen
        assert color_to_pen('cyan') == 3

    def test_pink_maps_to_red(self):
        # Pink is closest to red
        assert color_to_pen('pink') == 2

    def test_none_returns_pen1(self):
        assert color_to_pen('none') == 1
        assert color_to_pen('') == 1

    def test_hex6_short(self):
        assert color_to_pen('#f00') == 2  # red


if __name__ == '__main__':
    pytest.main([__file__, '-v'])