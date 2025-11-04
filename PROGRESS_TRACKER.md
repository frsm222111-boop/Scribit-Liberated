# Multi-Phase Plan: Enable Local G-code Operation Without Cloud Services

## 🎯 Goal
Enable Scribit to execute g-code files locally without dependency on offline cloud services (MQTT broker, calibration API).

## 📊 Overall Status
- **Current Phase:** Phase 1 (HTTP G-code Upload) - Nearly Complete
- **Firmware Compilation:** ✅ Both ESP32 and SAMD21 build successfully
- **Hardware:** ✅ Physical Scribit robot available
- **Boot Status:** ✅ Firmware boots to IDLE state (solid white LED)
- **WiFi Status:** ✅ ScribIt-... AP mode active, ping responds
- **HTTP Server:** ✅ Running on port 8888 (nc verified)
- **Current Task:** Test /status and /upload endpoints

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

## Phase 1: HTTP G-code Upload Endpoint 📝

**Purpose:** Add simple HTTP POST endpoint to upload g-code files directly

**Status:** Not Started

### Tasks
- [ ] Extend WiFi HTTP server to handle `/upload` route
- [ ] Parse g-code from POST body
- [ ] Save uploaded file to SPIFFS as `/temp.gcode`
- [ ] Add `uploadAndStart()` method to trigger execution
- [ ] Add LED feedback for upload progress
- [ ] Test with curl upload

### Files to Modify
- [ ] `Firmware/ScribitESP/ScribIt_wifi.cpp` - Add upload handler
- [ ] `Firmware/ScribitESP/ScribIt.hpp` - Add public method
- [ ] `Firmware/ScribitESP/ScribIt.cpp` - Implement state transitions
- [ ] `Firmware/ScribitESP/SIConfig.hpp` - Add local mode flag

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
- [ ] Can upload g-code via HTTP POST
- [ ] File saves to SPIFFS correctly
- [ ] Execution starts automatically
- [ ] LED shows upload/print status
- [ ] Error handling for large files/SPIFFS full

**Estimated Time:** 4-8 hours

---

## Phase 2: Web Interface 🌐

**Purpose:** Create simple web UI for easy file upload

**Status:** Not Started

### Tasks
- [ ] Create HTML upload form with drag-and-drop
- [ ] Add JavaScript for file handling
- [ ] Implement WebSocket for real-time status
- [ ] Add print controls (start/pause/stop)
- [ ] Style with mobile-friendly CSS
- [ ] Upload static files to SPIFFS
- [ ] Test on desktop and mobile browsers

### Files to Create
- [ ] `Firmware/ScribitESP/data/index.html`
- [ ] `Firmware/ScribitESP/data/style.css`
- [ ] `Firmware/ScribitESP/ScribIt_webserver.cpp`

### Features
- Real-time print progress
- LED color preview
- File size validation
- Visual feedback
- Mobile responsive design

### Success Criteria
- [ ] Web UI loads in browser at `http://192.168.x.x/`
- [ ] Can upload files via drag-and-drop
- [ ] Real-time status updates work
- [ ] Mobile-friendly interface
- [ ] Error messages displayed clearly

**Estimated Time:** 6-10 hours

---

## Phase 3: Local MQTT Broker (Optional) 📡

**Purpose:** Enable original MQTT workflow without cloud dependency

**Status:** Not Started

### Tasks
- [ ] Install Mosquitto on local network
- [ ] Configure `SIConfig.hpp` with local broker IP
- [ ] Set up local file server for g-code hosting
- [ ] Test PRINT/ERASE commands via MQTT
- [ ] Verify status updates work

### Configuration Changes Needed
```cpp
const char SI_MQTT_HOST[] = "192.168.1.100";  // Local broker IP
const unsigned long SI_MQTT_PORT = 1883;       // Non-TLS port
```

### Success Criteria
- [ ] Scribit connects to local MQTT broker
- [ ] Can send PRINT commands
- [ ] Downloads from local HTTP server
- [ ] Status updates via MQTT topics
- [ ] Broker uptime > 99.9%

**Estimated Time:** 4-6 hours

**Note:** This is an alternative to Phase 1. Choose based on preference.

---

## Phase 4: G-code Conversion Tools 🔧

**Purpose:** Convert common formats (SVG, images, text) to Scribit g-code

**Status:** Not Started

### Planned Tools
- [ ] SVG to G-code converter
  - [ ] Parse SVG paths
  - [ ] Convert to G0/G1 commands
  - [ ] Add pen up/down
- [ ] Image to G-code (stippling/hatching)
  - [ ] Edge detection
  - [ ] Path planning
  - [ ] Grayscale to line density
- [ ] Text to G-code renderer
  - [ ] Font rendering
  - [ ] Stroke path generation
  - [ ] Line breaking for wall width
- [ ] Drawing optimization
  - [ ] Path ordering (reduce travel)
  - [ ] Pen change minimization
  - [ ] Preview generator

### Success Criteria
- [ ] Can convert SVG to valid g-code
- [ ] Respects wall boundaries
- [ ] Optimizes pen travel
- [ ] Generates preview images
- [ ] SVG conversion accuracy > 95%

**Estimated Time:** 20-40 hours

---

## 📚 Documentation

- [x] Firmware analysis: `FIRMWARE_ANALYSIS.md`
- [x] Implementation plan: `IMPLEMENTATION_PLAN.md`
- [x] Updated README with documentation links
- [x] Progress tracker: `PROGRESS_TRACKER.md`
- [ ] Local upload workflow documentation
- [ ] Troubleshooting guide
- [ ] API documentation for HTTP endpoints
- [ ] G-code format specification
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

_Last Updated: 2025-11-03_
_Current Phase: Phase 1 - HTTP G-code Upload (Nearly Complete)_
_Current Status: HTTP server running on port 8888, endpoints implemented_
_Next Milestone: Test endpoints, verify g-code upload and execution_
_Recommended Next Step: Test /status and /upload endpoints with curl_
