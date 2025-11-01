# Scribit Local Operation - Implementation Plan

**Goal**: Enable Scribit to execute g-code files without cloud dependencies

**Current Status**: Firmware compiles ✅ | Hardware available ✅ | Cloud services offline ❌

---

## Phase 0: Validation & Testing (RECOMMENDED FIRST)

**Purpose**: Verify hardware and existing firmware before modifications

### Tasks
- [ ] Flash existing compiled binaries to Scribit
  - ESP32: `docker/builds/ScribitESP.ino.bin`
  - SAMD21: `docker/builds/MK4duo.ino.bin`
- [ ] Verify WiFi AP mode works (ScribIt-XXXXXX network)
- [ ] Connect to WiFi via JSON POST to `192.168.240.1:8888`
- [ ] Check SAMD21 serial communication (LED responses)
- [ ] Test manual g-code via MQTT debug mode (if possible)

### Success Criteria
- ✅ Device boots and creates WiFi AP
- ✅ Can configure WiFi network
- ✅ LED indicators work
- ✅ SAMD21 responds to ESP32 commands

### Estimated Time
- 2-4 hours (includes troubleshooting)

### Dependencies
- USB cable or OTA access
- Arduino IDE or CLI tools
- Physical access to robot

---

## Phase 1: HTTP G-code Upload Endpoint

**Purpose**: Add simple HTTP POST endpoint to upload g-code files directly

### Overview
Extend the existing WiFi configuration HTTP server to accept g-code file uploads.

### Files to Modify
1. `Firmware/ScribitESP/ScribIt_wifi.cpp`
   - Add new HTTP route handler for `/upload`
   - Parse multipart/form-data or raw g-code POST
   - Save to SPIFFS as `/temp.gcode`

2. `Firmware/ScribitESP/ScribIt.hpp`
   - Add public method: `bool uploadAndStart()`
   - Wrapper around existing `saveGcodeStringInFile()` + `sm.streamLocalFile()`

3. `Firmware/ScribitESP/ScribIt.cpp`
   - Implement state transition to SI_PRINTING
   - Add LED feedback for upload progress

4. `Firmware/ScribitESP/SIConfig.hpp`
   - Add flag: `SI_LOCAL_MODE` to disable MQTT requirement
   - Add port config: `SI_HTTP_PORT` (default 8888)

### Implementation Details

#### New HTTP Handler Pattern
```cpp
// In ScribIt_wifi.cpp - Add to configureWifi() or new method
if (requestPath == "/upload") {
    // Read g-code from POST body
    // Validate file size (< SPIFFS available)
    // Call saveGcodeStringInFile()
    // Call uploadAndStart()
    // Return JSON status
}
```

#### URL Scheme
```
POST http://192.168.240.1:8888/upload
Content-Type: text/plain
Body: [G-code content]

Response:
200 OK: {"status":"uploaded","id":"xxxxx"}
400 Bad Request: {"error":"file too large"}
500 Error: {"error":"SPIFFS write failed"}
```

### Testing Plan
1. Compile modified firmware
2. Flash to device
3. Upload test g-code via curl:
   ```bash
   curl -X POST http://192.168.240.1:8888/upload \
        -H "Content-Type: text/plain" \
        --data-binary @test.gcode
   ```
4. Verify execution starts
5. Check LED feedback

### Success Criteria
- ✅ Can upload g-code via HTTP POST
- ✅ File saves to SPIFFS correctly
- ✅ Execution starts automatically
- ✅ LED shows upload/print status
- ✅ Error handling for large files/SPIFFS full

### Estimated Time
- 4-8 hours (coding + testing)

### Risk Assessment
- **Low Risk**: Uses existing methods, minimal new code
- **Reversible**: Can revert to original functionality
- **Non-breaking**: Doesn't affect MQTT path if kept

---

## Phase 2: Web Interface

**Purpose**: Create simple web UI for easy file upload without command-line tools

### Overview
Serve HTML page from SPIFFS with JavaScript uploader.

### Files to Create
1. `Firmware/ScribitESP/data/index.html`
   - Upload form with drag-and-drop
   - Status display
   - Print controls (start/pause/stop)
   - LED color indicator

2. `Firmware/ScribitESP/data/style.css`
   - Simple, mobile-friendly styling

3. `Firmware/ScribitESP/ScribIt_webserver.cpp`
   - HTTP server for static files
   - WebSocket for real-time status updates

### Files to Modify
1. `Firmware/ScribitESP/ScribIt.cpp`
   - Initialize web server in `begin()`
   - Add status broadcast method

### Implementation Details

#### Web Server Routes
```
GET  /                → Serve index.html
GET  /status          → JSON status
POST /upload          → G-code upload (from Phase 1)
POST /control         → Start/pause/stop
GET  /files           → List uploaded files (future)
WS   /ws              → WebSocket status updates
```

#### Features
- Real-time print progress
- LED color preview
- File size validation
- Visual feedback
- Mobile responsive design

### Testing Plan
1. Upload HTML/CSS to SPIFFS
2. Access `http://192.168.240.1/` in browser
3. Upload g-code via web form
4. Monitor status updates
5. Test on mobile device

### Success Criteria
- ✅ Web UI loads in browser
- ✅ Can upload files via drag-and-drop
- ✅ Real-time status updates work
- ✅ Mobile-friendly interface
- ✅ Error messages displayed clearly

### Estimated Time
- 6-10 hours (HTML/CSS/JS + backend integration)

### Dependencies
- Phase 1 must be complete
- Basic HTML/CSS/JavaScript knowledge

---

## Phase 3: Local MQTT Broker (Optional)

**Purpose**: Enable original MQTT workflow without cloud dependency

### Overview
Run local MQTT broker (Mosquitto) and configure firmware to use it.

### Components
1. **Mosquitto** on local network (Raspberry Pi, NAS, or laptop)
2. **MQTT client** for sending commands
3. **Local web server** for g-code file hosting

### Files to Modify
1. `Firmware/ScribitESP/SIConfig.hpp`
   - Set `SI_MQTT_HOST` to local IP
   - Set `SI_MQTT_PORT` to 1883 (non-TLS)
   - Optionally disable TLS for local network

### Workflow
```
User → MQTT Publish → Local Broker → Scribit
                      (192.168.x.x)

User → HTTP Server → Scribit downloads g-code
       (local NAS)
```

### Setup Steps
1. Install Mosquitto on local server
   ```bash
   # Docker example
   docker run -d -p 1883:1883 eclipse-mosquitto
   ```

2. Configure SIConfig.hpp:
   ```cpp
   const char SI_MQTT_HOST[] = "192.168.1.100";
   const unsigned long SI_MQTT_PORT = 1883;
   ```

3. Set up local file server:
   ```bash
   # Simple Python HTTP server
   python3 -m http.server 8080
   ```

4. Send print command:
   ```bash
   mosquitto_pub -h 192.168.1.100 -t "tin/xxxxxx/print" \
     -m '{"url":"http://192.168.1.100:8080/drawing.gcode"}'
   ```

### Success Criteria
- ✅ Scribit connects to local MQTT broker
- ✅ Can send PRINT/ERASE commands
- ✅ Downloads from local HTTP server
- ✅ Status updates via MQTT

### Estimated Time
- 4-6 hours (setup + configuration + testing)

### Pros/Cons
**Pros:**
- Uses original architecture
- No firmware changes needed (just config)
- Supports all existing MQTT features

**Cons:**
- Requires separate server running 24/7
- More complex setup
- Network dependency

---

## Phase 4: G-code Conversion Tools (Future)

**Purpose**: Convert common formats (SVG, images, text) to Scribit g-code

### Overview
Create conversion pipeline for various input formats.

### Tools to Build
1. **SVG to G-code converter**
   - Parse SVG paths
   - Convert to G0/G1 commands
   - Add pen up/down commands

2. **Image to G-code** (stippling/hatching)
   - Edge detection
   - Path planning
   - Grayscale to line density

3. **Text to G-code**
   - Font rendering
   - Stroke path generation
   - Line breaking for wall width

4. **Drawing optimization**
   - Path ordering (reduce travel)
   - Pen change minimization
   - Preview generator

### Example Tools
```bash
# SVG converter
python svg2gcode.py drawing.svg -o output.gcode \
  --wall-width 200 --wall-height 150

# Text renderer
python text2gcode.py "Hello World" -o text.gcode \
  --font Arial --size 50

# Image converter
python image2gcode.py photo.jpg -o stipple.gcode \
  --style stipple --density 50
```

### Success Criteria
- ✅ Can convert SVG to valid g-code
- ✅ Respects wall boundaries
- ✅ Optimizes pen travel
- ✅ Generates preview images

### Estimated Time
- 20-40 hours (depends on features)

### Dependencies
- Python libraries: svgpathtools, Pillow, matplotlib
- G-code knowledge
- Understanding of Scribit coordinate system

---

## Phase 5: Advanced Features (Future)

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
- [ ] Integration with design tools

---

## Recommended Sequence

### Minimum Viable Product (MVP)
```
Phase 0 → Phase 1
```
**Result**: Can upload and execute g-code files locally
**Time**: 1-2 days

### Enhanced User Experience
```
Phase 0 → Phase 1 → Phase 2
```
**Result**: Web-based upload and monitoring
**Time**: 3-5 days

### Full Local Infrastructure
```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
```
**Result**: Complete standalone system with conversion tools
**Time**: 2-3 weeks

---

## Decision Points

### After Phase 0
**Question**: Does existing firmware work with hardware?
- ✅ Yes → Proceed to Phase 1
- ❌ No → Debug hardware/firmware issues

### After Phase 1
**Question**: Is command-line upload sufficient?
- ✅ Yes → Skip Phase 2, consider Phase 4
- ❌ No → Implement Phase 2 for web UI

### After Phase 2
**Question**: Do you prefer MQTT workflow?
- ✅ Yes → Implement Phase 3
- ❌ No → Skip to Phase 4

---

## Testing Strategy

### Per-Phase Testing
Each phase should include:
1. Unit tests (where applicable)
2. Integration tests with hardware
3. Error condition testing
4. User acceptance testing

### Test Cases to Cover
- [ ] Upload small file (< 100KB)
- [ ] Upload large file (> 1MB)
- [ ] Upload while printing (should reject)
- [ ] Upload invalid g-code
- [ ] Network interruption during upload
- [ ] SPIFFS full condition
- [ ] Pause/resume functionality
- [ ] Emergency stop
- [ ] Power cycle recovery

---

## Rollback Plan

Each phase should maintain ability to rollback:

1. **Git branches per phase**
   ```bash
   git checkout -b phase-1-http-upload
   # Work on phase 1
   git commit -m "Phase 1 complete"
   ```

2. **Keep original binaries**
   ```bash
   cp docker/builds/*.bin docker/builds/original-backup/
   ```

3. **Configuration backups**
   ```bash
   cp Firmware/ScribitESP/SIConfig.hpp SIConfig.hpp.backup
   ```

4. **OTA recovery**
   - Always keep working firmware accessible via OTA
   - Test new builds on development device first

---

## Documentation Requirements

For each completed phase, document:
- [ ] Code changes made
- [ ] New API endpoints
- [ ] Configuration options
- [ ] Testing results
- [ ] Known issues
- [ ] Usage examples
- [ ] Troubleshooting guide

---

## Success Metrics

### Phase 1
- Time to upload < 5 seconds for typical file
- 100% upload success rate on local network
- Zero data corruption

### Phase 2
- Web UI loads in < 2 seconds
- Works on mobile and desktop browsers
- Intuitive enough for non-technical users

### Phase 3
- MQTT latency < 500ms on local network
- Broker uptime > 99.9%

### Phase 4
- SVG conversion accuracy > 95%
- Optimization reduces print time by > 20%

---

## Resources Needed

### Hardware
- Scribit robot (already owned ✅)
- USB cable for initial flash
- Optional: Raspberry Pi for MQTT broker (Phase 3)

### Software
- Docker (for building) ✅
- Text editor / IDE
- Git for version control
- MQTT client (mosquitto-clients)
- Web browser for testing
- Python 3.x (for Phase 4)

### Knowledge
- C++ (for firmware modifications)
- HTTP/REST APIs
- HTML/CSS/JavaScript (Phase 2)
- MQTT protocol (Phase 3)
- G-code format
- SVG/graphics programming (Phase 4)

---

## Getting Help

### Useful Resources
- **MK4duo/Marlin Documentation**: Understanding g-code implementation
- **ESP32 Documentation**: Web server, SPIFFS, WiFi
- **MQTT Protocol**: If implementing Phase 3
- **G-code Reference**: RepRap wiki, LinuxCNC docs

### Community
- Original Scribit users (Kickstarter community)
- RepRap/3D printer forums (g-code expertise)
- ESP32 forums (Arduino ESP32 community)

---

## Timeline Estimate

```
Week 1:  Phase 0 validation
Week 2:  Phase 1 implementation
Week 3:  Phase 1 testing + Phase 2 start
Week 4:  Phase 2 completion
Week 5+: Phase 3/4 as needed
```

**Conservative estimate**: 4-5 weeks for full implementation
**Aggressive estimate**: 2-3 weeks with focused effort
**MVP only**: 1 week

---

## Next Session Checklist

When resuming work:
- [ ] Review FIRMWARE_ANALYSIS.md
- [ ] Check which phase to resume/start
- [ ] Read phase objectives and success criteria
- [ ] Ensure hardware is accessible
- [ ] Set up development environment
- [ ] Create phase-specific git branch
- [ ] Run existing build to confirm environment
- [ ] Begin implementation

---

## Notes

- Each phase builds on the previous one
- Phases can be implemented independently after Phase 1
- Phase 3 is truly optional (alternative approach)
- Phase 4 can be external tools, doesn't require firmware changes
- Keep original firmware behavior intact where possible
- Test thoroughly before deploying to actual robot

---

**Last Updated**: 2025-10-31
**Status**: Planning complete, ready for Phase 0
