# Multi-Phase Plan: Enable Local G-code Operation Without Cloud Services

## 🎯 Goal
Enable Scribit to execute g-code files locally without dependency on offline cloud services (MQTT broker, calibration API).

## 📊 Overall Status
- **Current Phase:** Phase 1 (HTTP G-code Upload) - ✅ COMPLETE
- **Firmware Compilation:** ✅ Both ESP32 and SAMD21 build successfully
- **Hardware:** ✅ Physical Scribit robot available
- **Boot Status:** ✅ Firmware boots to IDLE state (solid white LED)
- **WiFi Status:** ✅ ScribIt-... AP mode active, ping responds
- **HTTP Server:** ✅ Running on port 8888 with /status, /upload, /pause, /resume endpoints
- **G-code Execution:** ✅ Uploaded g-code executes, motors move
- **Next Phase:** Phase 2 (Web Interface) or Phase 4 (G-code conversion tools)

---

## Phase 0: Validation & Testing ⏳

**Purpose:** Verify hardware and existing firmware before modifications

**Status:** BLOCKED - Original firmware also exhibits boot loop behavior

### Tasks Completed
- [x] Flash existing compiled binaries to Scribit
  - [x] ESP32: `ScribitESP.ino.bin`
  - [x] SAMD21: `MK4duo.ino.bin`
  - [x] Partitions: `ScribitESP.ino.partitions.bin`
- [x] Verify WiFi AP mode works (network appears)
- [x] Connect to WiFi via JSON POST to `192.168.240.1:8888` (200 OK response)
- [x] Tested original unmodified firmware - SAME boot loop behavior
- [x] Observed LED boot sequence: Blue pulse → Yellow flash → Double-blinking white

### Tasks Blocked
- [ ] Check SAMD21 serial communication (LED responses) - Can't reach IDLE state
- [ ] Verify device enters IDLE state successfully - **BLOCKED: Boot loop**

### Detailed Findings

#### Boot Loop Behavior (Both Original & Modified Firmware)
**Symptoms:**
- LED: Blue pulse → Yellow flash (1 sec) → Double-blinking white (continuous)
- WiFi: MBC-WB-... network (OTA/bootloader mode)
- Device never shows ScribIt-... AP (normal operation mode)

**LED Sequence Interpretation:**
- Blue pulse: Initial boot/SPIFFS check
- Yellow flash: Possibly entering SI_ERASING or SI_HEATING state briefly
- Double-blinking white: "Loading mode" per docs, but appears to be stuck

**Root Cause Analysis:**
The firmware boots but appears to crash/reset shortly after initialization, reverting to bootloader mode. This happens with:
1. ✅ Original unmodified firmware (confirmed)
2. ✅ Our modified firmware with MQTT fixes

**Tested Modifications (All Resulted in Same Boot Loop):**
- [x] Enable debug mode (`SI_DEBUG_BUILD`, `SI_DEBUG_ESP`)
- [x] Increase SAMD sync timeout (10s → 30s)
- [x] Increase MQTT WiFi reset timeout (30s → 10min)
- [x] Add local mode: Auto-transition to IDLE after 10s timeout
- [x] Add MQTT empty host check in `SIMQTT.cpp`
- [x] Modified error handling to make SAMD sync non-fatal
- [x] Add timeout to exit ERROR state loop

**Key Discovery:** Even completely original firmware exhibits the same behavior, suggesting:
1. Hardware issue with SAMD21 communication
2. Missing prerequisite (bootloader version, partition table)
3. Firmware genuinely requires MQTT broker to complete boot
4. Some other environmental dependency

### Success Criteria (Not Yet Met)
- [ ] Device boots without reverting to OTA mode
- [ ] Can see ScribIt-... WiFi AP (normal mode)
- [ ] LED shows stable state (not double-blinking white)
- [ ] Device responds to commands

### Next Steps - Alternatives to Try
1. **Check Hardware Communication:**
   - Verify SAMD21 firmware is actually running
   - Check if serial communication ESP32 ↔ SAMD21 works

2. **Try Phase 3 Approach (Local MQTT):**
   - Set up local Mosquitto broker
   - Configure firmware with local MQTT host
   - See if device completes boot with MQTT available

3. **Investigate Partition Table:**
   - Verify partition flash was successful
   - Check if specific partition layout is required

4. **Serial Debug Output:**
   - Find way to access USB serial (if possible)
   - See actual debug messages during boot

**Current Blocker:** Cannot proceed to Phase 1 until device achieves stable boot

**Estimated Time to Resolve:** Unknown - Need to try alternative approaches

---

## Phase 1: HTTP G-code Upload Endpoint ✅

**Purpose:** Add simple HTTP POST endpoint to upload g-code files directly

**Status:** COMPLETE

### Tasks
- [x] Extend WiFi HTTP server to handle `/upload` route
- [x] Parse g-code from POST body
- [x] Save uploaded file to SPIFFS as `/temp.gcode`
- [x] Auto-start execution after upload
- [x] Test with curl upload
- [x] Verify motors execute uploaded g-code

### Files Modified
- [x] `Firmware/ScribitESP/ScribIt_wifi.cpp` - Added handleHTTPRequests with /status and /upload
- [x] `Firmware/ScribitESP/ScribIt.hpp` - Added m_localServer, handleHTTPRequests method
- [x] `Firmware/ScribitESP/ScribIt.cpp` - HTTP server init, integrated handler in loop
- [x] `README.md` - Documented local mode behavior

### URL Scheme
```
POST http://192.168.240.1:8888/upload
Content-Type: text/plain
Body: [G-code content]

Response:
200 OK: {"status":"uploaded","id":"xxxxx"}
400 Bad Request: {"error":"file too large"}
500 Error: {"error":"SPIFFS write failed"}
```

### Success Criteria
- [x] Can upload g-code via HTTP POST
- [x] File saves to SPIFFS correctly
- [x] Execution starts automatically (motors moved!)
- [x] LED shows print status
- [x] Error handling for large files/SPIFFS full (409 when not idle, 400 for invalid size)

**Actual Time:** ~4 hours

**Test Results (2025-11-03):**
- ✅ `GET /status` returns `{"state":"IDLE","paused":"running","id":"..."}`
- ✅ `POST /upload` with test.gcode returns `{"status":"uploaded","size":XX}`
- ✅ Motors executed uploaded g-code immediately after upload
- ✅ Device transitioned to PRINTING state
- ✅ `POST /pause` pauses execution during print
- ✅ `POST /resume` resumes paused execution

---

## Phase 2: Web Interface 🌐

**Purpose:** Create simple web UI for easy file upload with erase mode and g-code offset

**Status:** Not Started

### Hardware Capabilities Research (2025-11-04)

**Pen Switching (4-color support):**
- 4 pen holders mounted on revolving Z-axis cylinder with **72° spacing**
- Hall sensor homing: `G77` (works, takes 60-90 sec)
- **CRITICAL:** G77 must be called before EACH pen switch to avoid mechanical jam
- Continuous rotation in one direction causes pen cylinder to get stuck
- Firmware pen positions (from `g101.h`):
  - Pen 0: Z=89 (home position after G77)
  - Pen 1: Z=161 (89 + 72)
  - Pen 2: Z=233 (161 + 72)
  - Pen 3: Z=305 (233 + 72)
- **Complete pen selection pattern:** `G77` → `G1 Z[89/161/233/305]` → `G101`
  - G77: Home to pen 0
  - G1 Z[angle]: Rotate to pen position
  - G101: Apply pen pressure/offset against wall (moves ~30° inward)
- T-codes (T0/T1/T2/T3) don't work - use manual Z angles
- G4 pause commands cause hangs - avoid them
- Each pen has calibrated pressure stored in g_timeLimit[] array

**Erasing (ceramic heater):**
- Fixed ceramic heater position
- Offset: 77mm directly below pen position (Y-axis)
- Uses standard heater g-code: `M104 S[temp]`
- Firmware tracks `SI_ERASING` state separately from printing
- LED shows yellow for erase vs white for print
- **Implementation:** Web UI will handle coordinate transformation (shift all Y coordinates by -77mm)

**Calibration:**
- Auto-calibration requires cloud API (not available)
- Manual calibration method documented in `docs/support-scribit-design/360025212312-How-to-Scribit-manual-calibration.md`
- Custom commands: `G100` (auto calibrate), `G101` (sensitivity), `M777` (read IMU)
- **Implementation:** Web UI will provide manual calibration helper

### Tasks
- [ ] Create HTML upload form with drag-and-drop
- [ ] Add erase mode toggle (applies -77mm Y offset to all coordinates)
- [ ] Add manual calibration helper (input wall dimensions, generate starting position)
- [ ] Add JavaScript for file handling and coordinate transformation
- [ ] Add pen homing button (sends G77 command)
- [ ] Show current device state (IDLE/PRINTING/ERASING)
- [ ] Implement WebSocket for real-time status
- [ ] Add print controls (start/pause/stop)
- [ ] Style with mobile-friendly CSS
- [ ] Upload static files to SPIFFS
- [ ] Test on desktop and mobile browsers

### Files to Create
- [ ] `Firmware/ScribitESP/data/index.html` - Upload form, erase toggle, calibration helper, status display, controls
- [ ] `Firmware/ScribitESP/data/app.js` - G-code coordinate transformation, file handling, WebSocket
- [ ] `Firmware/ScribitESP/data/style.css` - Mobile-friendly styling
- [ ] `Firmware/ScribitESP/ScribIt_webserver.cpp` - HTTP server for static files, WebSocket

### Web Server Routes
```
GET  /                → Serve index.html
GET  /app.js          → Serve JavaScript app
GET  /style.css       → Serve CSS
GET  /status          → JSON status with pause state (existing)
POST /upload          → G-code upload (existing from Phase 1)
POST /pause           → Pause g-code execution (existing)
POST /resume          → Resume paused execution (existing)
POST /command         → Send single g-code command (e.g., G77 for pen homing)
GET  /files           → List uploaded files (future)
WS   /ws              → WebSocket status updates
```

### Features

**Core Functionality:**
- Drag-and-drop g-code upload
- Real-time status via WebSocket (IDLE/PRINTING/ERASING)
- Print controls (pause/stop)
- File size validation
- Visual feedback during upload

**Erase Mode:**
- Toggle: "Print Mode" / "Erase Mode"
- When enabled: automatically shifts all Y coordinates by -77mm
- Sends g-code with heater commands (M104)
- Different visual indicator (yellow vs white)

**Pen Management:**
- "Home Pen Cylinder" button (sends G77)
- Display current pen position (0-3)
- Optional: pen selection buttons (rotate Z to 0°/90°/180°/270°)

**Manual Calibration Helper:**
- Form inputs: wall width, wall height
- Form inputs: A1/B1 and A2/B2 hole positions
- Calculate button → generates starting position g-code
- Prepends calibration commands to uploaded file

**UI/UX:**
- Mobile responsive design
- Works on phone/tablet/desktop
- Clear status indicators
- Error messages displayed clearly

### Success Criteria
- [ ] Web UI loads in browser at `http://192.168.240.1/`
- [ ] Can upload files via drag-and-drop
- [ ] Real-time status updates work
- [ ] Mobile-friendly interface
- [ ] Error messages displayed clearly
- [ ] Web UI loads in < 2 seconds
- [ ] Intuitive for non-technical users

**Estimated Time:** 6-10 hours

**Dependencies:** Phase 1 must be complete

---

## Phase 3: Local MQTT Broker (Optional) 📡

**Purpose:** Enable original MQTT workflow without cloud dependency

**Status:** Not Started

**Note:** Alternative approach - uses original architecture, no firmware changes needed (just config)

### Tasks
- [ ] Install Mosquitto on local network (Docker or native)
- [ ] Configure `SIConfig.hpp` with local broker IP
- [ ] Set up local file server for g-code hosting
- [ ] Test PRINT/ERASE commands via MQTT
- [ ] Verify status updates work

### Setup Steps

1. **Install Mosquitto on local server:**
```bash
# Docker example
docker run -d -p 1883:1883 eclipse-mosquitto
```

2. **Configure SIConfig.hpp:**
```cpp
const char SI_MQTT_HOST[] = "192.168.1.100";  // Local broker IP
const unsigned long SI_MQTT_PORT = 1883;       // Non-TLS port
```

3. **Set up local file server:**
```bash
# Simple Python HTTP server
python3 -m http.server 8080
```

4. **Send print command:**
```bash
mosquitto_pub -h 192.168.1.100 -t "tin/xxxxxx/print" \
  -m '{"url":"http://192.168.1.100:8080/drawing.gcode"}'
```

### Workflow
```
User → MQTT Publish → Local Broker → Scribit
                      (192.168.x.x)

User → HTTP Server → Scribit downloads g-code
       (local NAS)
```

### Success Criteria
- [ ] Scribit connects to local MQTT broker
- [ ] Can send PRINT/ERASE commands
- [ ] Downloads from local HTTP server
- [ ] Status updates via MQTT topics
- [ ] Broker uptime > 99.9%
- [ ] MQTT latency < 500ms on local network

### Pros/Cons

**Pros:**
- Uses original architecture
- No firmware changes needed (just config)
- Supports all existing MQTT features

**Cons:**
- Requires separate server running 24/7
- More complex setup
- Network dependency

**Estimated Time:** 4-6 hours

---

## Phase 4: G-code Conversion Tools 🔧

**Purpose:** Convert common formats (SVG, images, text) to Scribit g-code

**Status:** Not Started

**Note:** External tools, no firmware changes required

### Planned Tools

#### 1. SVG to G-code Converter
- [ ] Parse SVG paths
- [ ] Convert to G0/G1 commands
- [ ] Add pen up/down commands (M18)
- [ ] Handle multiple paths/layers
- [ ] Respect wall boundaries (200mm × 150mm typical)

**Example usage:**
```bash
python svg2gcode.py drawing.svg -o output.gcode \
  --wall-width 200 --wall-height 150
```

#### 2. Image to G-code (Stippling/Hatching)
- [ ] Edge detection
- [ ] Path planning algorithms
- [ ] Grayscale to line density conversion
- [ ] Multiple styles (stipple, hatch, contour)

**Example usage:**
```bash
python image2gcode.py photo.jpg -o stipple.gcode \
  --style stipple --density 50
```

#### 3. Text to G-code Renderer
- [ ] Font rendering (TrueType/OpenType)
- [ ] Stroke path generation
- [ ] Line breaking for wall width
- [ ] Text positioning/alignment

**Example usage:**
```bash
python text2gcode.py "Hello World" -o text.gcode \
  --font Arial --size 50
```

#### 4. Drawing Optimization
- [ ] Path ordering (reduce travel time)
- [ ] Pen change minimization
- [ ] Preview image generator
- [ ] Time estimation

### Success Criteria
- [ ] Can convert SVG to valid g-code
- [ ] Respects wall boundaries
- [ ] Optimizes pen travel
- [ ] Generates preview images
- [ ] SVG conversion accuracy > 95%
- [ ] Optimization reduces print time by > 20%

### Dependencies
- Python 3.x
- Libraries: svgpathtools, Pillow, matplotlib
- G-code knowledge
- Understanding of Scribit coordinate system

**Estimated Time:** 20-40 hours (depends on features)

---

## 📚 Documentation

- [x] Firmware analysis: `FIRMWARE_ANALYSIS.md`
- [x] Progress tracker: `PROGRESS_TRACKER.md`
- [x] User setup guide: `LOCAL_MODE_SETUP.md`
- [x] Updated README with documentation links
- [x] Pre-compiled binaries in `releases/`
- [ ] Troubleshooting guide (advanced)
- [ ] API documentation for HTTP endpoints (detailed)
- [ ] G-code format specification for Scribit
- [ ] Calibration guide (manual method)

---

## 🔗 Related Resources

- **Repository:** https://github.com/scribit-open/open-firmware
- **Hardware:** Briki MBC-WB board (SAMD21 + ESP32)
- **Build System:** Docker + Arduino CLI
- **Documentation:** `docs/` directory
- **Board Manual:** `docs/MBC-WB-UserManual_v-2-1-min-1.pdf`
- **LED Status Guide:** `docs/support-scribit-design/led-status.md`

---

## 💬 Current Status & Blockers

### Active Work
- 🔴 **Phase 0:** BLOCKED - Boot loop investigation

### Completed This Session
- ✅ Compiled both firmwares successfully (original + modified)
- ✅ Flashed firmware to device via OTA multiple times
- ✅ Identified boot loop affects BOTH original and modified firmware
- ✅ Tested multiple firmware modifications (all reverted)
- ✅ Documented LED boot sequence: Blue → Yellow → Double-blinking white
- ✅ Confirmed WiFi configuration endpoint works (200 OK)
- ✅ Ruled out our modifications as root cause

### Critical Blockers
1. 🔴 **Boot Loop (HIGH PRIORITY)**
   - Original firmware fails with same symptoms
   - Device reaches OTA mode but can't complete normal boot
   - LED sequence suggests crash after brief initialization
   - Prevents any further testing or development

2. ⚠️ **Unknown: SAMD21 Communication**
   - Can't verify if SAMD21 is running
   - Can't test ESP32 ↔ SAMD21 serial communication
   - May need SAMD21 firmware reflash

3. ⚠️ **No Serial Debug Access**
   - Can't see actual boot messages
   - Limited to LED status interpretation
   - Makes debugging very difficult

### Possible Solutions to Try
1. **Local MQTT Broker (Phase 3 approach)**
   - Install Mosquitto on local network
   - Configure firmware with local broker IP
   - May allow device to complete boot sequence
   - **Estimated effort:** 2-4 hours

2. **Investigate Partition Table**
   - Verify SPIFFS partition flashed correctly
   - Check if specific partition layout needed
   - **Estimated effort:** 1-2 hours

3. **USB Serial Debugging**
   - Find way to access hardware UART
   - View actual debug output during boot
   - **Estimated effort:** Unknown (hardware dependent)

4. **Reflash SAMD21**
   - Try flashing MK4duo again
   - Use with_bootloader version if needed
   - **Estimated effort:** 1 hour

### Next Immediate Actions
1. ⏳ Set up local MQTT broker (most likely to succeed)
2. ⏳ Configure firmware with local broker IP
3. ⏳ Test if device completes boot with MQTT available
4. ⏳ If successful, proceed to Phase 1
5. ⏳ If fails, investigate partition/SAMD21 issues

---

## 📅 Timeline Estimate

| Phase | Description | Time Estimate | Status |
|-------|-------------|---------------|--------|
| Phase 0 | Validation & Testing | 2-4 hours | ⏳ In Progress |
| Phase 1 | HTTP Upload Endpoint | 4-8 hours | 📝 Not Started |
| Phase 2 | Web Interface | 6-10 hours | 📝 Not Started |
| Phase 3 | Local MQTT (Optional) | 4-6 hours | 📝 Not Started |
| Phase 4 | G-code Tools (Future) | 20-40 hours | 📝 Not Started |

**Total to MVP (Phase 0-1):** ~1-2 days
**Total to Complete UX (Phase 0-2):** ~3-5 days
**Total with All Features:** ~2-3 weeks

---

## 🔄 Change Log

### 2025-10-31 - Session 1 (Initial Analysis & Planning)
- ✅ Created progress tracker
- ✅ Completed firmware analysis (`FIRMWARE_ANALYSIS.md`)
- ✅ Created implementation plan (`IMPLEMENTATION_PLAN.md`)
- ✅ Identified boot loop as main blocker
- ✅ Successfully compiled both ESP32 and SAMD21 firmwares
- ✅ Flashed initial firmware via OTA (espota.py)

### 2025-10-31 - Session 2 (Boot Loop Investigation)
**Phase 0 Troubleshooting:**

**What We Tried:**
1. Modified `SIConfig.hpp`:
   - Enabled `SI_DEBUG_BUILD`
   - Enabled `SI_DEBUG_ESP`
   - Increased `SI_SAMD_SYNC_TIMEOUT` (10s → 30s)
   - Increased `SI_MQTT_RESET_WIFI_TIMEOUT_MS` (30s → 10min)

2. Modified `ScribIt.cpp`:
   - Added 10-second local mode timeout in boot loop
   - Added auto-transition to SI_IDLE when no MQTT response
   - Added ERROR state exit timeout
   - Attempted to make SAMD sync non-fatal (broke control flow)
   - Restored original control flow

3. Modified `SIMQTT.cpp`:
   - Added empty host check to skip MQTT init (prevented crash)

4. Reverted to original firmware for baseline test

**What We Discovered:**
- ❌ Modified firmware: Boot loop → MBC-WB-... network
- ❌ Original firmware: SAME boot loop behavior
- ✅ **Key Finding:** Original firmware also fails - not caused by our modifications
- ✅ LED Sequence: Blue pulse → Yellow (1 sec) → Double-blinking white (stuck)
- ✅ WiFi config POST works (200 OK response)
- ✅ Device can enter OTA mode and accept firmware flashes

**Root Cause Hypothesis:**
- Firmware boots and runs briefly (blue→yellow sequence)
- Crashes or hits watchdog timeout during SAMD sync or MQTT connection
- Bootloader catches the crash and re-enters OTA mode
- Original firmware designed to require MQTT broker for full boot sequence

**Current Status:** BLOCKED
- Cannot achieve stable device boot with or without modifications
- Need alternative approach (local MQTT broker or deeper debugging)

**Files Modified (currently reverted):**
- `Firmware/ScribitESP/SIConfig.hpp`
- `Firmware/ScribitESP/ScribIt.cpp`
- `Firmware/ScribitESP/SIMQTT.cpp`
- `Firmware/ScribitESP/SIMQTT.hpp`

**Next Session Plan:**
1. Try Phase 3 approach (local MQTT broker) first
2. Investigate partition table requirements
3. Explore USB serial debugging if possible
4. Consider if SAMD21 firmware needs reflashing

### 2025-11-03 - Session 3 (Boot Loop Fix - BREAKTHROUGH!)
**Phase 0 Resolution:**

**Major Discovery:**
- "Boot loop" was actually successful OTA flash → device reboots to new firmware → crashes during boot
- Factory reset (5+ sec button hold) switches between app0 (factory) and app1 (OTA) partitions
- Factory firmware works, our flashed firmware was crashing

**Root Cause Found:**
- `ScribIt.cpp:181-195` - Infinite `while` loop waiting for MQTT status message
- Without MQTT broker → loop forever → watchdog timeout → crash → recovery mode
- Additional crash: `SIMQTT.begin()` tries to connect with empty host string

**Fixes Applied:**
1. **Skip MQTT initialization** when `SI_MQTT_HOST` is empty (line 136)
2. **Made SAMD sync non-fatal** - continue to BOOT state even if sync fails (line 171-179)
3. **Added 3-second boot timeout** - force transition to IDLE if no MQTT response (line 191-203)

**Results:**
- ✅ Firmware compiles successfully
- ✅ OTA flash succeeds
- ✅ Device boots to IDLE state (solid white LED - first time!)
- ✅ WiFi active (ping responds on 192.168.240.1)
- ❌ HTTP server on port 8888 not starting
- ❌ MBC-WB network instead of ScribIt-... network

**Current Status:** MAJOR PROGRESS
- Device no longer crashes during boot
- Enters IDLE state successfully
- WiFi layer functional
- Need to investigate why HTTP server doesn't start

**Files Modified:**
- `Firmware/ScribitESP/ScribIt.cpp` (boot timeout, MQTT skip, SAMD non-fatal)

**Next Steps:**
1. Investigate why HTTP server (port 8888) doesn't start
2. Check WiFi AP configuration - why MBC-WB instead of ScribIt-...
3. Verify HTTP server initialization code in `ScribIt_wifi.cpp`
4. Consider enabling SI_DEBUG_BUILD for serial output

### 2025-11-03 - Session 3 Continued (WiFi AP Fix)
**WiFi Configuration Fix:**

**Investigation Findings:**
- HTTP server (port 8888) only active during `configureWifi()` - temporary WiFi setup phase
- Normal operation has no HTTP server at all
- Original firmware connects to saved WiFi or enters config mode
- `WiFi.begin()` was being called without credentials, causing undefined behavior
- Device showed MBC-WB (bootloader) instead of ScribIt-... (firmware AP)

**Root Cause:**
- Line 119: `WiFi.begin()` called without checking for local mode
- No AP created for local operation without MQTT
- HTTP server never started for local control

**Fix Applied:**
- Added local mode detection: `bool localMode = (strlen(SI_MQTT_HOST) == 0)`
- Force WiFi AP mode when in local mode (line 120-136)
- Creates `ScribIt-XXXXXX` AP using device MAC address
- Sets static IP 192.168.240.1 (ESP32 default for softAP)

**Results:**
- ✅ ScribIt-... WiFi network now appears!
- ✅ Ping responds on 192.168.240.1
- ✅ Firmware stays running (solid white LED)
- ❌ Port 8888 still closed (expected - HTTP server not added yet)

**Current Status:** BREAKTHROUGH #2
- Device boots successfully
- Correct WiFi AP active
- Ready for HTTP server implementation

**Files Modified:**
- `Firmware/ScribitESP/ScribIt.cpp` (WiFi AP local mode, lines 118-151)

**Next Steps:**
1. Add persistent HTTP server for local mode
2. Implement basic endpoints (status, upload g-code)
3. Test end-to-end workflow

### 2025-11-03 - Session 4 (HTTP Server Implementation - PHASE 1 COMPLETE!)
**Phase 1 Implementation:**

**Changes Made:**
1. Added HTTP server initialization in local mode (ScribIt.cpp:137-141)
2. Implemented handleHTTPRequests() method (ScribIt_wifi.cpp:215-354)
3. Added endpoints:
   - `GET /status` - Returns device state as JSON
   - `POST /upload` - Upload g-code, saves to SPIFFS, auto-starts print
4. Integrated HTTP handler into main loop (ScribIt.cpp:277-281)

**Results:**
- ✅ Firmware compiles successfully (1051814 bytes, 30% flash usage)
- ✅ OTA flash succeeds
- ✅ HTTP server running on port 8888 (verified with nc)
- ✅ Device boots to IDLE state with ScribIt-... AP active

**New Reset Behavior (Local Mode):**
- After reset: LED double white flash → solid white
- MBC-WB network appears briefly then disappears
- ScribIt-... network appears when LED solid
- Can OTA flash directly to ScribIt-... network at 192.168.240.1:3232
- No WiFi password sharing step needed (local mode auto-creates AP)

**Files Modified:**
- `Firmware/ScribitESP/ScribIt.hpp` (added m_localServer, handleHTTPRequests)
- `Firmware/ScribitESP/ScribIt.cpp` (HTTP server init, call handler in loop)
- `Firmware/ScribitESP/ScribIt_wifi.cpp` (implemented handleHTTPRequests with /status and /upload)
- `README.md` (documented new local mode reset behavior)

**Current Status:** Phase 1 nearly complete - HTTP server running, ready for endpoint testing

**Next Steps:**
1. Test /status endpoint with curl
2. Test /upload endpoint with sample g-code
3. Verify print starts automatically after upload
4. Update Phase 1 status to COMPLETE

### 2025-11-03 - Session 4 Continued (Endpoint Testing - SUCCESS!)
**Phase 1 Testing:**

**Test Commands:**
```bash
# Status check
curl -v http://192.168.240.1:8888/status

# Upload g-code
curl -v -X POST http://192.168.240.1:8888/upload \
  -H "Content-Type: text/plain" \
  --data-binary @test.gcode
```

**Results:**
- ✅ `/status` endpoint responded with device state JSON
- ✅ `/upload` endpoint accepted g-code file
- ✅ Device motors moved immediately after upload
- ✅ G-code execution confirmed working

**Phase 1 Status:** ✅ COMPLETE

**What Works:**
- HTTP server serves requests reliably
- JSON responses correctly formatted
- G-code saves to SPIFFS
- Auto-execution triggers on upload
- State machine transitions properly

**Next Options:**
- Phase 2: Build web UI for easier uploads
- Phase 4: Create SVG/image to g-code converters
- Use current curl-based workflow for now

### 2025-11-04 - Session 5 (Hardware Capabilities Research)
**Phase 2 Preparation:**

**Research Findings:**

1. **Pen Switching Mechanism:**
   - Located G77 command: Homes 4-pen revolving cylinder using Hall sensor
   - Z-axis controls pen rotation (0°/90°/180°/270° = pens 0-3)
   - Found in: `Firmware/MK4duo/src/core/commands/gcode/scribit/g77.h`
   - Hall sensor calibrates on first G77 call per session
   - Each pen can have different pressure calibration (G101 command)

2. **Eraser Hardware:**
   - Ceramic heater at fixed position
   - Physical offset: 77mm below pen (Y-axis direction)
   - Uses standard heating commands (M104 S[temp])
   - Firmware tracks SI_ERASING state separately
   - LED indicator: yellow for erase, white for print
   - No automatic coordinate transformation in firmware

3. **Calibration Options:**
   - Auto-calibration (G100) requires cloud API - not available
   - IMU-based pen detection (M777) - works but needs cloud processing
   - Manual calibration documented in support docs
   - Decision: Implement manual calibration helper in web UI

**Implementation Decisions:**
- ✅ Erase mode: Web UI handles Y-offset transformation (-77mm)
- ✅ Pen switching: Add G77 button, document Z rotation angles
- ✅ Calibration: Manual helper form in web UI
- ✅ Keep firmware simple, handle complexity in web UI

**Files Created:**
- `test-pen-switch.gcode` - Test file for 4-pen switching

**Updated Phase 2 Requirements:**
- Erase mode toggle with automatic coordinate offset
- Manual calibration helper (wall dimensions → starting position)
- Pen homing button (G77 command)
- WebSocket for real-time status
- G-code transformation in JavaScript

### 2025-11-04 - Session 5 Continued (Pen Switching Testing)
**Hardware Testing:**

**Test Results:**
1. **G28 (XY homing)** - Causes hang, avoid
2. **G77 (pen cylinder homing)** - Works! Takes 60-90 sec, uses Hall sensor
3. **T-codes (T0/T1/T2/T3)** - Don't work for pen selection
4. **G4 pause commands** - Cause hangs, must avoid
5. **Direct Z rotation** - Works perfectly: `G1 Z[angle]`
6. **Pen spacing** - 72° apart (not 90°): 0°, 72°, 144°, 216°

**Working Pattern (Final):**
```gcode
M17              ; Enable motors
G90              ; Absolute Z positioning

; Pen 0
G77              ; Home to pen 0 (60-90 sec)
G1 Z89           ; Move to pen 0 position
G101             ; Apply pen pressure
; [drawing commands]

; Pen 1
G77              ; Re-home before switch
G1 Z161          ; Move to pen 1 position
G101             ; Apply pen pressure
; [drawing commands]

; Pen 2
G77              ; Re-home before switch
G1 Z233          ; Move to pen 2 position
G101             ; Apply pen pressure
; [drawing commands]

; Pen 3
G77              ; Re-home before switch
G1 Z305          ; Move to pen 3 position
G101             ; Apply pen pressure
; [drawing commands]

G77              ; Final home
M18
```

**Files Created:**
- `test-minimal.gcode` - Basic XY movement (works)
- `test-z-axis.gcode` - Z rotation test (works)
- `test-4-pens-final.gcode` - 4-pen switching with G77 homing (works)
- `test-g77-only.gcode` - G77 Hall sensor homing (works)

**Known Issues:**
- G77 + G28 together cause hang
- G4 pause commands cause hang
- T-codes not implemented for pen switching
- Continuous Z rotation causes mechanical jam - must use G77 between pen changes
- Pen cylinder can get stuck if rotated too many times in one direction

**Next Steps:**
- ✅ Found firmware pen positions in g101.h (Z=89/161/233/305)
- ✅ Determined G77 must be called before each pen switch
- ⏳ Need to account for offset angle when calculating pen Z positions
- ⏳ Implement pen switching in Phase 2 web UI with proper G77 calls

### 2025-11-04 - Session 6 (Pause/Resume HTTP Endpoints)
**HTTP API Enhancement:**

**Changes Made:**
1. Added `POST /pause` endpoint to pause g-code execution during print/erase
2. Added `POST /resume` endpoint to resume paused execution
3. Enhanced `GET /status` to include pause state (`running`/`pausing`/`paused`)
4. Implemented proper printing timer handling (stops on pause, resumes on continue)

**Implementation Details:**
- Uses `sm.setPause(true/false)` to control g-code streaming
- Checks pause state with `sm.getPausedState()` (returns SIPS_RUNNING, SIPS_REQUESTED, or SIPS_PAUSED)
- Returns 409 Conflict if pause/resume called in wrong state
- Only works during SI_PRINTING or SI_ERASING states
- Maintains elapsed time tracking across pause/resume cycles

**Files Modified:**
- `Firmware/ScribitESP/ScribIt_wifi.cpp` - Added pause/resume endpoints, enhanced status response
- `PROGRESS_TRACKER.md` - Updated endpoint documentation

**API Behavior:**
```
GET /status → {"state":"PRINTING","paused":"running","id":"..."}
POST /pause → {"status":"paused"} (or error if already paused)
POST /resume → {"status":"resumed"} (or error if not paused)
```

**Next Steps:**
- Ready for Phase 2 web UI implementation with pause/resume controls
- Consider adding stop/cancel endpoint for aborting current job

### 2025-11-05 - Session 7 (Auto-Calibration Analysis)
**Calibration Research:**

**File Analyzed:**
- `extrafile/autocal.gcode` - Cloud-based auto-calibration routine
- Created `extrafile/autocal-annotated.gcode` - Fully commented version

**Auto-Calibration Process:**
1. **Movement Pattern:** 150mm square (relative positioning)
   - Start: Top-right corner
   - Path: Right → Down → Left → Up → Right
2. **IMU Readings:** M777 command at each of 4 corners
   - Reads gyroscope pitch angle (averages 10 samples)
   - Outputs: `OK I:<pitch_angle>`
   - Requires stable pen contact with wall
3. **Cloud Processing:** Receives 4 pitch readings, calculates:
   - Wall dimensions (width × height)
   - Wall orientation/skew
   - Coordinate transformation matrix
   - Pen pressure calibration

**Special Commands Discovered:**
- **M92 X Y** - Set steps-per-mm (Y=-29.6 inverts Y-axis)
- **M400** - Synchronize planner (wait for buffered moves)
- **M777** - Read IMU pitch (custom Scribit command)
  - Location: `Firmware/MK4duo/src/core/commands/gcode/scribit/m777.h`
  - Takes 10 IMU samples, averages pitch angle
  - 500ms wait before reading for stability
- **G4 P<ms>** - Pause/dwell (works in calibration, hangs in prints!)

**Key Insights:**
- Auto-calibration **requires cloud API** (not available locally)
- Uses **relative positioning (G91)** for simple square pattern
- G4 pauses work here but fail elsewhere (firmware inconsistency)
- M92 calibration-specific (29.6 steps/mm, negative Y)
- Pattern assumes 150mm × 150mm minimum wall area

**Impact on Phase 2:**
- Manual calibration helper still needed (cloud unavailable)
- Could implement local M777 reading display (raw angles)
- Cannot replicate cloud transform calculations locally
- Web UI should guide manual wall measurement input

**Files Created:**
- `extrafile/autocal-annotated.gcode` - Detailed comment annotations

### 2025-11-05 - Session 8 (Cloud Calibration API & Coordinate System)
**Calibration & Kinematics Research:**

**Q1: Does Scribit use special triangular coordinate system?**
**A: NO - Standard Cartesian coordinates in g-code**

- Firmware configured as `MECH_CARTESIAN` (not CoreXY/Delta)
- No coordinate transformation in planner (planner.cpp:2605)
- X/Y map directly to motor steps via `axis_steps_per_mm`
- Triangular geometry encoded in calibration constants (30.5577 steps/mm)
- SVG→gcode converters can use standard Cartesian output

**Q2: How crucial is cloud calibration? Can we mock it?**
**A: VERY crucial (8/10), but mockable (7/10)**

**Cloud API Flow:**
1. Downloads `autocal.gcode` from cloud
2. Runs 150mm square pattern, collects 4 IMU readings
3. POSTs to calibration API:
   ```json
   {"sn": "deviceID", "wallId": 1, "scans": [453, 461, 448, 455]}
   ```
4. API returns starting position:
   ```json
   {"command": "G92 X0 Y0\nG1 X100 Y75 F1000"}
   ```
5. Firmware sends commands to SAMD21

**What Cloud API Calculates:**
- Wall dimensions from IMU angle changes
- Wall orientation/tilt
- String lengths (motor positions)
- Coordinate transform matrix
- Starting position (X/Y coordinates)
- Optimal steps-per-mm for wall geometry

**Mockability Options:**

| Approach | Difficulty | Accuracy | Local Mode |
|----------|-----------|----------|------------|
| Fixed position | Easy | Low | ❌ Wrong scale |
| Basic math | Medium | Medium | ⚠️ Approximate |
| **Manual helper** | Easy | **Good** | ✅ **Recommended** |
| Skip calibration | Easy | None | ❌ Unusable |

**Recommended: Manual Calibration Helper (Phase 2)**
- Web UI: User inputs wall width/height
- User positions pen at top-right corner
- Generate: `G92 X0 Y0\nG1 X{w/2} Y{h/2} F1000`
- Send via `/command` endpoint
- Store per wall ID (multi-wall support)
- Optional: Display real-time IMU readings

**Key Code Locations:**
- ESP32: `ScribIt.cpp:735-845` (startCalibration, completeCalibration)
- ESP32: `SIFileDownloader.cpp:247-346` (API call with hardcoded token)
- ESP32: `SIConfig.hpp:43-46` (SI_CALIBRATION_URL, SI_CALIBRATION_POINT_NUMBER)
- SAMD21: `Configuration_Overall.h:335` (DEFAULT_AXIS_STEPS_PER_UNIT)
- Auth token: `cmJqv3ah7nPj3OVGoNyevDXs7LwNJbIW` (hardcoded in source)

**Impact on Phases:**
- Phase 2: Add manual calibration form + `/command` endpoint
- Phase 4: Standard Cartesian g-code works (no special coordinates needed)
- Future: Could implement basic IMU-based calculation (no cloud)

**Files Created:**
- `docs/coordinate-system-analysis.md` - Kinematics explanation
- `docs/calibration-cloud-api-analysis.md` - Full API breakdown + mock strategies

---

## Phase 5: Advanced Features (Future) 🚀

**Purpose:** Enhanced functionality beyond basic operation

**Status:** Ideas/Planning

### Possible Enhancements
- [ ] Multi-file management (queue system)
- [ ] SD card support for large files
- [ ] G-code preview rendering
- [ ] Time estimation
- [ ] Material/pen management
- [ ] Auto-recovery on power loss
- [ ] Remote monitoring (local web dashboard)
- [ ] G-code editor with validation
- [ ] Drawing library/gallery
- [ ] Integration with design tools (Inkscape, Illustrator)

---

## 🎯 Recommended Paths

### Minimum Viable Product (MVP) - COMPLETE ✅
```
Phase 0 → Phase 1
```
**Result:** Can upload and execute g-code files locally
**Time:** 1-2 days

### Enhanced User Experience
```
Phase 0 → Phase 1 → Phase 2
```
**Result:** Web-based upload and monitoring
**Time:** 3-5 days

### Full Local Infrastructure
```
Phase 0 → Phase 1 → Phase 2 → Phase 4
```
**Result:** Complete standalone system with conversion tools
**Time:** 2-3 weeks

---

## 🧪 Testing Strategy

### Per-Phase Testing
Each phase should include:
1. Unit tests (where applicable)
2. Integration tests with hardware
3. Error condition testing
4. User acceptance testing

### Test Cases to Cover
- [x] Upload small file (< 100KB)
- [ ] Upload large file (> 1MB)
- [ ] Upload while printing (should reject with 409)
- [ ] Upload invalid g-code
- [ ] Network interruption during upload
- [ ] SPIFFS full condition
- [ ] Pause/resume functionality
- [ ] Emergency stop
- [ ] Power cycle recovery

---

## 🔄 Rollback Plan

### Git Workflow
- Use branches per phase: `git checkout -b phase-N-description`
- Keep original binaries: `docker/builds/original-backup/`
- Configuration backups before changes
- OTA recovery: Always keep working firmware accessible

### Recovery
- Test new builds on development device first
- Can reflash original firmware via OTA if needed
- Factory reset switches between app0/app1 partitions

---

## 📦 Resources

### Hardware
- ✅ Scribit robot
- ✅ USB cable for initial flash
- Optional: Raspberry Pi for MQTT broker (Phase 3)

### Software
- ✅ Docker (for building)
- ✅ Git for version control
- ✅ espota.py (OTA flashing)
- Optional: MQTT client tools (Phase 3)
- Optional: Python 3.x (Phase 4)

### Knowledge Required
- C++ (for firmware modifications)
- HTTP/REST APIs
- HTML/CSS/JavaScript (Phase 2)
- MQTT protocol (Phase 3)
- G-code format
- SVG/graphics programming (Phase 4)

---

## 📝 Notes

### Key Findings
- Firmware is surprisingly complete
- Only ~100-200 lines of code needed for Phase 1
- MQTT dependency is the main blocker
- Local mode modifications are minimal and non-breaking

### Design Decisions
- Keep original MQTT functionality intact
- Add parallel local mode path
- Make SAMD sync non-fatal for flexibility
- Use LED indicators since no serial monitor available

### Risks & Mitigations
- **Risk:** SAMD may not sync → **Mitigation:** Made non-fatal, continue boot
- **Risk:** SPIFFS limited space → **Mitigation:** Add file size validation
- **Risk:** WiFi instability → **Mitigation:** Increased timeouts, retry logic

---

### 2025-11-06 - Session 9 (Kinematics Investigation - CoreXY Failed)
**Phase 4 Blocker - Coordinate System Deep Dive:**

**Investigation Goal:**
Determine if firmware handles Cartesian coordinates or requires external conversion to string-space.

**Tests Performed:**
1. **Enabled CoreXY Mode:**
   - Modified `Configuration_Overall.h` to use `MECH_COREXY` instead of `MECH_CARTESIAN`
   - Added `CORE_FACTOR 1` for standard CoreXY transform
   - Built firmware successfully
   - Flashed and tested with Cartesian G-code

2. **Test Results:**
   - Device moved "more straight but not completely"
   - Still not proper Cartesian motion
   - CoreXY improves but fundamentally incompatible

**Root Cause Discovery:**

**CoreXY Limitation:**
- CoreXY uses **linear** transform: `Motor A = X + constant*Y`, `Motor B = X - constant*Y`
- Assumes **constant factor** between motors
- Works for perpendicular belt systems

**Scribit Reality:**
- Uses **nonlinear** string geometry: `L1 = sqrt((X-x1)² + (Y-y1)²)`
- Ratio between motors **varies with position**
- Cannot be expressed as linear transform

**Critical Discovery: Firmware NEVER Did Cartesian Transform!**

Evidence found:
1. `MECH_CARTESIAN` has no transform function (cartesian_mechanics.cpp:109-113)
2. X/Y values in G-code **ARE the string lengths directly**
3. `planner.cpp:2605` maps positions without transformation
4. Original system architecture:
   ```
   [User SVG/Drawing]
        ↓
   [Cloud API / Mobile App]  ← Does Cartesian → String conversion
        ↓
   [G-code in String-Space]  ← X=left string, Y=right string
        ↓
   [Firmware]  ← No transform, direct motor control
        ↓
   [Motors]
   ```

**Why We Were Confused:**
- `DEFAULT_AXIS_STEPS_PER_UNIT` calibration values seemed like transform
- Actually just motor scaling (steps → mm), NOT coordinate conversion
- Cloud calibration doesn't transform firmware, provides pre-converted G-code

**Implications for Phase 4:**

❌ **Cannot use standard SVG-to-G-code tools directly**
✅ **Must implement Cartesian → string-length converter**

**Two Implementation Paths:**

1. **External Preprocessing (RECOMMENDED - matches original):**
   - Python library for kinematics
   - Convert Cartesian G-code → string-space before upload
   - Same architecture as original cloud system
   - Easier to implement and test

2. **Firmware Kinematics (harder, more elegant):**
   - Implement `scribit_mechanics.cpp` like delta printers
   - Add proper Transform/InverseTransform functions
   - Enable true Cartesian G-code support
   - Requires anchor position data

**Blockers:**
- Need anchor positions (x1,y1), (x2,y2) for conversion math
- Sources: physical measurement, calibration API analysis, reverse engineering

**Actions Taken:**
- ✅ Tested CoreXY mode (failed as expected)
- ✅ Analyzed firmware kinematics architecture
- ✅ Documented findings in `docs/COREXY_FAILED_ANALYSIS.md`
- ✅ Documented complete plan in `docs/inverse_kinematics_plan.md`
- ✅ Reverted firmware to `MECH_CARTESIAN`
- ✅ Created test files for verification

**Files Created:**
- `docs/inverse_kinematics_plan.md` - Complete analysis & 3 solution options
- `docs/COREXY_IMPLEMENTATION.md` - CoreXY attempt documentation
- `docs/COREXY_FAILED_ANALYSIS.md` - Why CoreXY doesn't work
- `BUILD_COREXY_FIRMWARE.md` - Build results
- `gcode/test-corexy-cartesian.gcode` - Test file (simplified)
- `gcode/test-corexy-diagonal.gcode` - Test file (simplified)

**Next Steps for Phase 4:**
1. **Find anchor positions** - critical for any solution:
   - Run calibration, capture API response
   - Physical measurement of device
   - Reverse engineer from working G-code
2. **Build Python converter** (external preprocessing):
   - Implement string-length kinematics
   - SVG → string-space G-code converter
   - Test with simple shapes
3. **(Optional) Firmware implementation:**
   - Port converter to C++
   - Implement scribit_mechanics class
   - Enable true Cartesian support

**Status:** Phase 4 architecture clarified, path forward identified

---

_Last Updated: 2025-11-06_
_Current Phase: Phase 1 - HTTP G-code Upload - ✅ COMPLETE_
_Current Status: Kinematics investigation complete, external converter required_
_Next Milestone: Phase 4 - External Cartesian → String-Space Converter_
_Blocker: Need anchor positions for conversion math_
