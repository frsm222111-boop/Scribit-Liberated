; ===================================================================
; SCRIBIT AUTO-CALIBRATION G-CODE (ANNOTATED)
; ===================================================================
; Purpose: Automatic wall calibration using IMU (Inertial Measurement Unit)
; Process: Move pen to 4 corner positions, read IMU pitch at each corner
; Cloud API: Processes IMU readings to calculate wall dimensions & transform matrix
; ===================================================================

M17                    ; Enable stepper motors (power on all axes)

M92 X29.6 Y-29.6       ; Set steps-per-mm for X and Y axes
                       ; X: 29.6 steps/mm (positive = right)
                       ; Y: -29.6 steps/mm (NEGATIVE = invert Y direction)
                       ; Note: This calibration specific, may differ from default

G4 P50                 ; Pause/dwell for 50 milliseconds
                       ; WARNING: G4 commands cause hangs in current firmware!
                       ; This works in calibration but avoid in regular prints

G91                    ; Switch to RELATIVE positioning mode
                       ; All subsequent coordinates are relative to current position

M400                   ; Wait for all buffered moves to complete
                       ; Ensures pen is stationary before IMU read

; ===================================================================
; CORNER 1: Starting position (top-right, after pen contacts wall)
; ===================================================================
G4 P1000               ; Wait 1 second for pen to settle
M777                   ; Read IMU pitch angle (outputs: "OK I:<pitch>")
                       ; Averages 10 IMU readings, returns pitch in degrees
                       ; Cloud API receives this to calculate corner position
G4 P1000               ; Wait 1 second after IMU read
M400                   ; Sync planner (wait for any pending moves)

; ===================================================================
; CORNER 2: Move down the wall (bottom-right)
; ===================================================================
G1 F1000               ; Set feedrate to 1000 mm/min (16.67 mm/s)
G1 Y-150               ; Move DOWN 150mm (negative Y in relative mode)
                       ; Pen slides down right edge of wall
G4 P1000               ; Wait 1 second for pen to settle
M777                   ; Read IMU pitch at bottom-right corner
G4 P1000               ; Wait 1 second
M400                   ; Sync planner

; ===================================================================
; CORNER 3: Move left across wall (bottom-left)
; ===================================================================
G1 X-150               ; Move LEFT 150mm (negative X in relative mode)
                       ; Pen slides across bottom edge of wall
G4 P1000               ; Wait 1 second for pen to settle
M777                   ; Read IMU pitch at bottom-left corner
G4 P1000               ; Wait 1 second
M400                   ; Sync planner

; ===================================================================
; CORNER 4: Move up the wall (top-left)
; ===================================================================
G1 Y150                ; Move UP 150mm (positive Y in relative mode)
                       ; Pen slides up left edge of wall
G4 P1000               ; Wait 1 second for pen to settle
M777                   ; Read IMU pitch at top-left corner
G4 P1000               ; Wait 1 second
M400                   ; Sync planner

; ===================================================================
; RETURN: Move back to starting position (top-right)
; ===================================================================
G1 X150                ; Move RIGHT 150mm back to start
M400                   ; Sync planner
G4 P4000               ; Wait 4 seconds (long pause for final data transmission)

G90                    ; Switch back to ABSOLUTE positioning mode
                       ; Future moves will be absolute coordinates

M18                    ; Disable all stepper motors (release holding torque)
                       ; Allows free movement after calibration

; ===================================================================
; CALIBRATION DATA PROCESSING (done by cloud API)
; ===================================================================
; Cloud receives 4 IMU pitch readings from M777 commands
; Calculations performed:
;   1. Wall dimensions (width x height) from movement distances
;   2. Wall orientation/skew from IMU pitch variations
;   3. Coordinate transformation matrix for accurate drawing
;   4. Pen pressure calibration for wall texture
; Result: Device receives calibration parameters for subsequent prints
; ===================================================================

; ===================================================================
; NOTES & WARNINGS
; ===================================================================
; - This requires cloud API to process IMU data (not available locally)
; - G4 pause commands work here but cause hangs in regular prints
; - M777 IMU readings need stable pen contact with wall
; - Process assumes 150mm x 150mm minimum wall area
; - Negative Y in M92 inverts Y-axis direction for Scribit mechanics
; - Relative mode (G91) simplifies rectangular movement pattern
; ===================================================================
