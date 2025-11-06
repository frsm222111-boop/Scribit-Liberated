; ===================================================================
; TEST: Cartesian Coordinate System Verification (MOVEMENT ONLY)
; ===================================================================
; Purpose: Verify motor movements follow Cartesian path without drawing
; Expected: Motors should move in rectangular pattern (audible)
; Finding: Listen to motor sounds - should have 4 distinct movements
; ===================================================================

M17                    ; Enable stepper motors

; Use relative positioning for safety
G91                    ; Set to relative positioning mode

; Small delay to settle
G4 P500

; Pen stays UP (no M18 E command)

; Move in rectangle: 40mm wide x 30mm tall
; Starting from current position, going clockwise

; Right side (40mm in +X direction)
G1 X40 F1000
G4 P200

; Down (30mm in +Y direction)
G1 Y30 F1000
G4 P200

; Left side (40mm in -X direction)
G1 X-40 F1000
G4 P200

; Up (30mm in -Y direction, back to start)
G1 Y-30 F1000
G4 P200

; Return to absolute mode
G90

; Disable motors
M18

; ===================================================================
; INTERPRETATION:
; - 4 distinct motor movements = Path follows Cartesian rectangle ✅
; - Smooth operation = Firmware accepts standard coordinates ✅
; - Errors/stops = Coordinate system issue ❌
; ===================================================================
