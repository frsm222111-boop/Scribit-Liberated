; ===================================================================
; TEST: Cartesian Coordinate System Verification (WITH DRAWING)
; ===================================================================
; Purpose: Verify that standard Cartesian X/Y coordinates work directly
;          without special triangular coordinate transformation
; Expected: Should draw a clean 40mm x 30mm rectangle
; Finding: If rectangle is clean (not skewed), confirms Cartesian mode
; ===================================================================

M17                    ; Enable stepper motors

; Use relative positioning for safety (don't assume absolute position)
G91                    ; Set to relative positioning mode

; Small delay to settle
G4 P500

; Draw a rectangle: 40mm wide x 30mm tall
; Starting from current position, going clockwise

M18 E                  ; Pen DOWN (disable extruder motor = pen down on Scribit)

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

M17 E                  ; Pen UP (enable extruder motor = pen up on Scribit)

; Return to absolute mode
G90

; Disable motors
M18

; ===================================================================
; INTERPRETATION:
; - Clean rectangle = Cartesian coordinates work ✅
; - Distorted shape = Coordinate transformation issue ❌
; - Wrong size = steps_per_mm calibration issue
; - Skewed = Wall not vertical or calibration wrong
; ===================================================================
