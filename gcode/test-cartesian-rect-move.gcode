; ===================================================================
; TEST: Cartesian Coordinate System Verification (MOVEMENT ONLY)
; ===================================================================
; Purpose: Verify motor movements follow Cartesian path without drawing
; Expected: Motors should move in rectangular pattern (audible)
; Finding: Listen to motor sounds - should have 4 distinct movements
; ===================================================================

M17
G91
G1 F1000 X40
G1 F1000 Y30
G1 F1000 X-40
G1 F1000 Y-30
M18

; ===================================================================
; INTERPRETATION:
; - 4 distinct motor movements = Path follows Cartesian rectangle ✅
; - Smooth operation = Firmware accepts standard coordinates ✅
; - Errors/stops = Coordinate system issue ❌
; ===================================================================
