# GUI App Development Progress

## Phase 1: Project Setup & Structure ✅
- [x] Create gui-app directory and initialize electron-vite + Vue3 project
- [x] Install dependencies (electron, electron-builder, vue3, vue-router)
- [x] Setup project structure (src/main, src/renderer, resources dirs)
- [x] Configure electron-builder for Win/macOS
- [x] Test basic window and dev environment

## Phase 2: GitHub Actions - Firmware Build ✅
- [x] Create `.github/workflows/build-release.yml`
- [x] Workflow triggers on release tag push and manual dispatch
- [x] Build firmware via docker-compose
- [x] Copy .bin files to `gui-app/resources/firmware/`
- [x] Add .gitignore for gui-app
- [x] Test workflow - Working on macOS/Windows

## Phase 3: Bundle Python & Scripts ✅
- [x] Download portable Python runtimes (Win/macOS) - Using system Python
- [x] Copy espota.py to `resources/python/`
- [x] Port scribit_svg_to_gcode.py to `resources/scripts/`
- [x] Bundle svg.path dependency - Not needed (stdlib only)
- [x] Create `src/main/python-runner.js`
- [x] Create `src/main/espota-runner.js`
- [x] Test Python execution - Will test in Phase 4 UI

## Phase 4: Firmware Upload Feature
- [ ] Create `FirmwareUpload.vue`
- [ ] Create `WifiPrompt.vue`
- [ ] Create `ProgressBar.vue`
- [ ] Implement Step 1: "Connect to ScribIt-XXXXXX"
- [ ] Implement Step 2: WiFi form → POST 192.168.240.1:8888
- [ ] Implement Step 3: "Connect to MBC-WB-XXXXXX"
- [ ] Implement Step 4: espota.py uploads .bin files
- [ ] HTTP client + error handling
- [ ] LED status guide

## Phase 5: G-code Features
- [ ] Create `GcodeSender.vue`
- [ ] Create `DeviceStatus.vue`
- [ ] Create `GcodeEditor.vue`
- [ ] File picker for .gcode
- [ ] POST to /upload endpoint
- [ ] Status polling (GET /status)
- [ ] Bundle example .gcode files

## Phase 6: SVG to G-code Converter
- [ ] Create `SvgConverter.vue`
- [ ] SVG → G-code via Python script
- [ ] Preview generated G-code
- [ ] Chain to sender
- [ ] Conversion progress UI

## Phase 7: GitHub Actions - App Build & Release
- [ ] Build Electron app (Win/macOS)
- [ ] Sign binaries (optional)
- [ ] Create installers (.dmg, .exe)
- [ ] Upload to GitHub Release
- [ ] Test full release pipeline

## Phase 8: Polish & Testing
- [ ] Vue Router navigation
- [ ] Error messages + troubleshooting
- [ ] Logging system
- [ ] Icons + splash screen
- [ ] Manual testing on Win/macOS

## Phase 9: Documentation
- [ ] User guide
- [ ] Developer guide
- [ ] Update main README
