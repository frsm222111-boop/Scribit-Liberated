/* Scribit Liberated — Scribit Web Interface (built on UnBrickIt) */

const DEVICE_IP = window.location.hostname || '192.168.240.1';

// User settings (persisted). Defaults match the prior hardcoded behavior.
const SETTINGS_DEFAULT = { units: 'mm', defaultSize: 300, feed: 1000, segment: 1.5, penDepth: 40, eraseOffset: -77, confirmSend: false, ip: '', wallColor: '#f2e9d0' };
function applyWallColor() { try { document.documentElement.style.setProperty('--wall', SETTINGS.wallColor || '#f2e9d0'); } catch (e) {} }
function loadSettings() { var s = {}; try { s = JSON.parse(localStorage.getItem('scribit_settings')) || {}; } catch (e) {} var out = {}; for (var k in SETTINGS_DEFAULT) out[k] = (s[k] == null ? SETTINGS_DEFAULT[k] : s[k]); return out; }
let SETTINGS = loadSettings();
function saveSettings() { localStorage.setItem('scribit_settings', JSON.stringify(SETTINGS)); ERASE_Y_OFFSET = SETTINGS.eraseOffset; applyWallColor(); document.dispatchEvent(new Event('settings-changed')); }
function confirmSend() { return !SETTINGS.confirmSend || confirm('Send this drawing to the robot?'); }

const API_BASE = 'http://' + (SETTINGS.ip || DEVICE_IP) + ':8888';

let deviceState = 'BOOT';
let currentFile = null;
let uploadedGcode = null;

// Pen rack — which marker/color is physically loaded in each carousel slot (1-4,
// at Z 89/161/233/305). colorToPen() routes a drawing's colors to the nearest loaded pen.
const PEN_RACK_DEFAULT = [
  { color: '#1a1a1a', label: 'Black' },
  { color: '#e23b3b', label: 'Red' },
  { color: '#2d7dff', label: 'Blue' },
  { color: '#2faf5a', label: 'Green' },
];
const PEN_SLOT_Z = [89, 161, 233, 305];
function loadPenRack() {
  try { var s = JSON.parse(localStorage.getItem('scribit_pens')); if (Array.isArray(s) && s.length === 4) return s; } catch (e) {}
  return PEN_RACK_DEFAULT.map(function (p) { return { color: p.color, label: p.label }; });
}
let PEN_RACK = loadPenRack();
function penColor(slot1based) { var p = PEN_RACK[(slot1based - 1) % 4]; return (p && p.color) || '#46c6f5'; }
function savePenRack() { localStorage.setItem('scribit_pens', JSON.stringify(PEN_RACK)); document.dispatchEvent(new Event('pens-changed')); }
function colorToHex(c) {
  var rgb = parseCssColor(c); if (!rgb) return '#000000';
  return '#' + rgb.map(function (v) { return ('0' + (v & 255).toString(16)).slice(-2); }).join('');
}

// Reusable "Draw with: [slot]" picker for single-pen tools (Image, Text).
function makePenPicker(onChange) {
  var wrap = document.createElement('div'); wrap.className = 'pen-pick-row';
  var lab = document.createElement('label'); lab.textContent = 'Draw with';
  var sel = document.createElement('select'); sel.className = 'pen-pick';
  function fill() {
    var v = sel.value || '1'; sel.innerHTML = '';
    PEN_RACK.forEach(function (p, i) { var o = document.createElement('option'); o.value = i + 1; o.textContent = (i + 1) + ' · ' + p.label; sel.appendChild(o); });
    sel.value = v;
  }
  fill();
  sel.addEventListener('change', onChange);
  document.addEventListener('pens-changed', function () { fill(); onChange(); });
  wrap.appendChild(lab); wrap.appendChild(sel);
  return { el: wrap, slot: function () { return parseInt(sel.value, 10) || 1; } };
}

(function penRack() {
  var box = document.getElementById('pen-rack');
  if (!box) return;
  // Round carousel hub with the 4 sockets clustered on the left (gap on the
  // right = the active/drawing position), matching the physical device:
  // slot1 upper-left, slot2 top, slot3 lower-left, slot4 bottom.
  var SLOT_ANGLE = [-145, -95, 145, 95];  // degrees (0=right, +down)
  var ROT = 90;                            // clockwise rotation of the whole cluster (deg)
  function render() {
    box.className = 'pen-rack carousel';
    box.innerHTML = '';
    var R = 36;
    PEN_RACK.forEach(function (p, i) {
      var a = ((SLOT_ANGLE[i] || 0) + ROT) * Math.PI / 180;
      var slot = document.createElement('div'); slot.className = 'pen-slot';
      slot.style.left = (50 + Math.cos(a) * R) + '%';
      slot.style.top = (50 + Math.sin(a) * R) + '%';
      var no = document.createElement('div'); no.className = 'pen-slot-no'; no.textContent = (i + 1) + ' · Z' + PEN_SLOT_Z[i];
      var sw = document.createElement('button'); sw.type = 'button'; sw.className = 'pen-swatch'; sw.style.background = p.color;
      sw.title = 'Slot ' + (i + 1) + ' — click to set color';
      var ci = document.createElement('input'); ci.type = 'color'; ci.className = 'pen-color-input'; ci.value = colorToHex(p.color);
      sw.addEventListener('click', function () { ci.click(); });
      ci.addEventListener('input', function () { PEN_RACK[i].color = ci.value; sw.style.background = ci.value; savePenRack(); });
      var lab = document.createElement('input'); lab.type = 'text'; lab.className = 'pen-label'; lab.value = p.label; lab.maxLength = 12;
      lab.addEventListener('change', function () { PEN_RACK[i].label = lab.value; savePenRack(); });
      slot.appendChild(no); slot.appendChild(sw); slot.appendChild(ci); slot.appendChild(lab);
      box.appendChild(slot);
    });
  }
  render();
})();

// DOM refs
const statusDot    = document.getElementById('status-dot');
const statusText   = document.getElementById('status-text');
const dropZone     = document.getElementById('drop-zone');
const fileInput    = document.getElementById('file-input');
const fileInfo     = document.getElementById('file-info');
const fileName     = document.getElementById('file-name');
const fileSizeEl   = document.getElementById('file-size');
const uploadBtn    = document.getElementById('upload-btn');
const progressDiv  = document.getElementById('upload-progress');
const progressBar  = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const eraseToggle  = document.getElementById('erase-mode');
const btnHome      = document.getElementById('btn-home');
const btnPause     = document.getElementById('btn-pause');
const btnResume    = document.getElementById('btn-resume');
const btnStop      = document.getElementById('btn-stop');
const infoState    = document.getElementById('info-state');
const infoSerial   = document.getElementById('info-serial');
const infoFirmware = document.getElementById('info-firmware');
const connInfo     = document.getElementById('connection-info');
const calibAnchor  = document.getElementById('calib-anchor');
const calibLeft    = document.getElementById('calib-left');
const calibRight   = document.getElementById('calib-right');
const calibXoff    = document.getElementById('calib-xoff');
const calibDrop    = document.getElementById('calib-drop');
const calibCanvasW = document.getElementById('calib-canvas-w');
const calibCanvasH = document.getElementById('calib-canvas-h');
const calibMethod  = document.getElementById('calib-method');
const methodPosition = document.getElementById('method-position');
const methodStrings  = document.getElementById('method-strings');
const calibComputed= document.getElementById('calib-computed');
const calibMsg     = document.getElementById('calib-msg');
const calibDiagram = document.getElementById('calib-diagram');
const calibSaveBtn = document.getElementById('calib-save');
const calibApplyBtn= document.getElementById('calib-apply');
const calibWallName= document.getElementById('calib-wall-name');
const calibWallSelect = document.getElementById('calib-wall-select');
const calibWallLoad = document.getElementById('calib-wall-load');
const calibWallDelete = document.getElementById('calib-wall-delete');
const toast        = document.getElementById('toast');

// Toast
let toastTimer;
function showToast(msg, type) {
  type = type || '';
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// API helpers
async function apiGet(path) {
  var r = await fetch(API_BASE + path, { signal: AbortSignal.timeout(5000) });
  return r.json();
}

async function apiPost(path, body, isText) {
  isText = isText || false;
  var opts = { method: 'POST', signal: AbortSignal.timeout(15000) };
  if (!isText) opts.headers = { 'Content-Type': 'application/json' };
  opts.body = isText ? body : JSON.stringify(body);
  var r = await fetch(API_BASE + path, opts);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return isText ? r.text() : r.json();
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// ---- Stream mode -----------------------------------------------------------
// Send a drawing to the robot line-by-line via /gcode, bypassing the /upload
// file path (which writes the whole job to this unit's broken/tiny SPIFFS first
// and stalls on anything but the smallest files). The firmware keeps the device
// in PRINTING for the duration and replies {"status":"full"} when its line buffer
// is full, so we apply backpressure (retry) and never overflow it.
var streamActive = false, streamCancel = false;

function gcodeLines(gcode) {
  return gcode.split('\n')
    .map(function (l) { return l.replace(/\r/g, '').trim(); })
    .filter(function (l) { return l.length > 0 && l[0] !== ';'; });
}

// Simulate the XY (string-delta) moves from the current calibrated position and
// return a reason string if the drawing would leave the canvas or climb into the
// anchors. Pre-send guard so a bad drawing is refused, not run (a runaway move is
// what pulled a string bracket out during testing). calcPosition/calibMM are
// defined later in the file but only referenced here at call time.
function gcodeLeavesCanvas(lines) {
  var A = calibMM.anchor, L = calibMM.left, R = calibMM.right;
  if (!A || !L || !R) return null;
  var cw = calibMM.canvasW || 0, ch = calibMM.canvasH || 0;
  var p0 = calcPosition(A, L, R);
  var TOP = 40, SIDE = 20;   // mm clearance from the anchor line / anchors
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i];
    if (m.charAt(0) !== 'G') continue;
    var xm = m.match(/X(-?\d+(?:\.\d+)?)/), ym = m.match(/Y(-?\d+(?:\.\d+)?)/);
    if (!xm && !ym) continue;                  // Z-only / feedrate lines don't move XY
    if (xm) L += parseFloat(xm[1]);
    if (ym) R += -parseFloat(ym[1]);           // G-code Y = -(right-string delta)
    var p = calcPosition(A, L, R);
    if (p.y < TOP) return 'the robot would climb too close to the top anchors';
    if (p.x < SIDE || p.x > A - SIDE) return 'the robot would reach past an anchor';
    if (cw > 0 && Math.abs(p.x - p0.x) > cw / 2 + 0.5) return 'the drawing is wider than your ' + Math.round(cw) + ' mm canvas';
    if (ch > 0 && Math.abs(p.y - p0.y) > ch / 2 + 0.5) return 'the drawing is taller than your ' + Math.round(ch) + ' mm canvas';
  }
  return null;
}

// Returns quickly after kicking off the background feed, so the caller's
// "sent — drawing" toast fires right away. The robot draws as we feed it.
// opts.bounds === false skips the canvas/anchor guard (for intentional reposition
// moves like Center on wall).
async function streamDrawing(gcode, opts) {
  opts = opts || {};
  if (streamActive) throw new Error('Already drawing — press Stop first');
  var lines = gcodeLines(gcode);
  if (!lines.length) throw new Error('Nothing to draw');
  if (opts.bounds !== false) {
    var be = gcodeLeavesCanvas(lines);
    if (be) throw new Error('Refused — ' + be + '. Use "Fit to wall" or recenter the robot.');
  }
  _runStream(lines);
  return { status: 'streaming', lines: lines.length };
}

async function _runStream(lines) {
  streamActive = true;
  streamCancel = false;
  var ok = false;
  var sumX = 0, sumY = 0;   // net string-deltas actually sent → tracked machine position
  try {
    await apiPost('/stream/start', '', true);
    for (var i = 0; i < lines.length; i++) {
      if (streamCancel) break;
      var tries = 0;
      while (true) {
        var resp = await apiPost('/gcode', lines[i], true);
        var full = false;
        try { full = (JSON.parse(resp).status === 'full'); } catch (e) {}
        if (!full) break;                 // accepted
        if (streamCancel) break;
        await sleep(50);                  // buffer full → back off and retry
        if (++tries > 4000) throw new Error('robot stopped accepting g-code');
      }
      var mx = lines[i].match(/X(-?\d+(?:\.\d+)?)/), my = lines[i].match(/Y(-?\d+(?:\.\d+)?)/);
      if (mx) sumX += parseFloat(mx[1]);
      if (my) sumY += parseFloat(my[1]);
      if (i % 20 === 0) showToast('Drawing… ' + Math.round(100 * i / lines.length) + '%', '');
    }
    ok = !streamCancel;
  } catch (e) {
    showToast('Stream error: ' + e.message, 'error');
  } finally {
    try {
      if (ok) await apiPost('/stream/end', '', true);   // finish cleanly
      else await apiPost('/stop', '', true);            // cancelled/errored → halt
    } catch (e) {}
    advanceMachinePos(sumX, sumY);   // keep the tracked position in sync with what was sent
    streamActive = false;
    if (ok) showToast('All lines sent — robot finishing…', 'success');
  }
}

var drawStartT = 0, wasDrawing = false;
async function pollStatus() {
  try {
    var s = await apiGet('/status');
    deviceState = s.state || 'IDLE';
    var drawing = (deviceState === 'PRINTING' || deviceState === 'ERASING');
    if (drawing && !wasDrawing) { drawStartT = Date.now(); wasDrawing = true; }
    else if (!drawing && wasDrawing) { wasDrawing = false; showToast('Drawing complete!', 'success'); }
    renderStatus(deviceState, drawing ? Date.now() - drawStartT : 0);
    connInfo.textContent = 'Connected';
    connInfo.style.color = '#4ade80';
    updateButtons(deviceState);
    if (s.id) {
      document.getElementById('device-info').classList.remove('hidden');
      infoState.textContent = deviceState;
      infoSerial.textContent = s.id.slice(0, 16);
    }
    if (s.version) infoFirmware.textContent = s.version;
    return true;
  } catch (e) {
    connInfo.textContent = 'Disconnected';
    connInfo.style.color = '#f87171';
    renderStatus('ERROR');
    return false;
  }
}

function renderStatus(state, elapsedMs) {
  var label = state || 'UNKNOWN';
  if (elapsedMs > 0) { var t = Math.floor(elapsedMs / 1000); label = (state === 'ERASING' ? 'ERASING ' : 'DRAWING ') + Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
  statusText.textContent = label;
  statusDot.className = 'status-dot';
  if (state === 'IDLE' || state === 'STANDBY') statusDot.classList.add('idle');
  else if (state === 'PRINTING' || state === 'ERASING' || state === 'HOMING') statusDot.classList.add('printing');
  else statusDot.classList.add('error');
}

function updateButtons(state) {
  btnPause.disabled  = !(state === 'PRINTING' || state === 'ERASING');
  btnResume.disabled  = state !== 'PAUSED';
  btnStop.disabled    = !(state === 'PRINTING' || state === 'ERASING' || state === 'PAUSED');
}

// File handling
// NOTE: the click-to-browse is handled by the inline onclick in index.html
// (#drop-zone). Do NOT also add a JS click listener here — that fired the file
// picker twice (one user click -> two dialogs).
dropZone.addEventListener('dragover', function(e) {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', function() {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', function(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', function() {
  if (fileInput.files.length) {
    handleFile(fileInput.files[0]);
    handleFileUpload(fileInput.files[0]);
  }
});

function handleFile(file) {
  currentFile = file;
  fileName.textContent = file.name;
  fileSizeEl.textContent = formatSize(file.size);
  fileInfo.classList.remove('hidden');
  uploadBtn.disabled = false;
  progressDiv.classList.add('hidden');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function setProgress(pct) {
  progressDiv.classList.remove('hidden');
  progressBar.style.width = pct + '%';
  progressText.textContent = Math.round(pct) + '%';
}

function isSVG(file) {
  return file.name.toLowerCase().endsWith('.svg');
}

// ===== SVG to G-code converter =====

function parseCssColor(colorStr) {
  if (!colorStr || colorStr === 'none') return null;
  colorStr = colorStr.trim().toLowerCase();

  var namedColors = {
    'black': [0, 0, 0],
    'white': [255, 255, 255],
    'red': [255, 0, 0],
    'green': [0, 128, 0],
    'lime': [0, 255, 0],
    'blue': [0, 0, 255],
    'navy': [0, 0, 128],
    'cyan': [0, 255, 255],
    'magenta': [255, 0, 255],
    'yellow': [255, 255, 0],
    'orange': [255, 165, 0],
    'purple': [128, 0, 128],
    'pink': [255, 192, 203],
    'brown': [165, 42, 42],
    'gray': [128, 128, 128],
    'grey': [128, 128, 128],
  };

  if (namedColors[colorStr]) return namedColors[colorStr];

  var hex3 = colorStr.match(/^#([0-9a-f]{3})$/);
  if (hex3) {
    var h = hex3[1];
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }

  var hex6 = colorStr.match(/^#([0-9a-f]{6})$/);
  if (hex6) {
    var h = hex6[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  var rgb = colorStr.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) return [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];

  var rgba = colorStr.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/);
  if (rgba) return [parseInt(rgba[1]), parseInt(rgba[2]), parseInt(rgba[3])];

  return null;
}

function colorToPen(colorStr) {
  var rgb = parseCssColor(colorStr);
  if (!rgb) return 1;
  var r = rgb[0], g = rgb[1], b = rgb[2];
  var minDist = Infinity, bestPen = 1;
  for (var i = 0; i < PEN_RACK.length; i++) {
    var t = parseCssColor(PEN_RACK[i].color) || [0, 0, 0];
    var dist = (r - t[0]) ** 2 + (g - t[1]) ** 2 + (b - t[2]) ** 2;
    if (dist < minDist) { minDist = dist; bestPen = i + 1; }
  }
  return bestPen;
}

function bezierPoint(t, points) {
  var n = points.length - 1, x = 0, y = 0;
  for (var i = 0; i <= n; i++) {
    var px = points[i][0], py = points[i][1];
    var binom = factorial(n) / (factorial(i) * factorial(n - i));
    var bernstein = binom * Math.pow(t, i) * Math.pow(1 - t, n - i);
    x += bernstein * px;
    y += bernstein * py;
  }
  return [x, y];
}

function factorial(n) {
  if (n <= 1) return 1;
  var r = 1;
  for (var k = 2; k <= n; k++) r *= k;
  return r;
}

function svgArcToCenter(x1, y1, x2, y2, rx, ry, phi, fa, fs) {
  var cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
  var dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  var x1p = cosPhi * dx + sinPhi * dy;
  var y1p = -sinPhi * dx + cosPhi * dy;

  var lambda = (x1p / rx) ** 2 + (y1p / ry) ** 2;
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }

  var sign = (fa === fs) ? -1 : 1;
  var sq = Math.max(0, (rx * ry) ** 2 - (rx * y1p) ** 2 - (ry * x1p) ** 2);
  sq = sign * Math.sqrt(sq / ((rx * y1p) ** 2 + (ry * x1p) ** 2));

  var cxp = sq * rx * y1p / ry;
  var cyp = -sq * ry * x1p / rx;

  var cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  var cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  function angleBetween(ux, uy, vx, vy) {
    var dot = ux * vx + uy * vy;
    var mod = Math.sqrt(ux ** 2 + ux ** 2) * Math.sqrt(vx ** 2 + vy ** 2);
    var rad = Math.acos(Math.min(1, Math.max(-1, dot / mod)));
    return (ux * vy - uy * vx >= 0) ? rad : -rad;
  }

  var ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry;
  var vx = (-x1p - cxp) / rx, vy = (-y1p - cyp) / ry;
  var theta1 = angleBetween(1, 0, ux, uy);
  var dtheta = angleBetween(ux, uy, vx, vy);

  if (fs === 0 && dtheta > 0) dtheta -= 2 * Math.PI;
  else if (fs === 1 && dtheta < 0) dtheta += 2 * Math.PI;

  return [cx, cy, rx, ry, theta1, dtheta];
}

function parsePathToPoints(pathData, resolution) {
  var points = [];
  var currentX = 0, currentY = 0;
  var subpathStartX = 0, subpathStartY = 0;
  var lastControlX = null, lastControlY = null;

  // Tokenize: separate commands from numbers
  var tokens = pathData.replace(/,/g, ' ').match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || [];
  var i = 0;

  function num() { return parseFloat(tokens[i++]); }

  while (i < tokens.length) {
    var cmd = tokens[i++];

    if (cmd === 'M') {
      currentX = num(); currentY = num();
      subpathStartX = currentX; subpathStartY = currentY;
      points.push([currentX, currentY, false]);
      lastControlX = lastControlY = null;
    } else if (cmd === 'm') {
      currentX += num(); currentY += num();
      subpathStartX = currentX; subpathStartY = currentY;
      points.push([currentX, currentY, false]);
      lastControlX = lastControlY = null;
    } else if (cmd === 'L') {
      currentX = num(); currentY = num();
      points.push([currentX, currentY, true]);
      lastControlX = lastControlY = null;
    } else if (cmd === 'l') {
      currentX += num(); currentY += num();
      points.push([currentX, currentY, true]);
      lastControlX = lastControlY = null;
    } else if (cmd === 'H') {
      currentX = num();
      points.push([currentX, currentY, true]);
      lastControlX = lastControlY = null;
    } else if (cmd === 'h') {
      currentX += num();
      points.push([currentX, currentY, true]);
      lastControlX = lastControlY = null;
    } else if (cmd === 'V') {
      currentY = num();
      points.push([currentX, currentY, true]);
      lastControlX = lastControlY = null;
    } else if (cmd === 'v') {
      currentY += num();
      points.push([currentX, currentY, true]);
      lastControlX = lastControlY = null;
    } else if (cmd === 'C') {
      var x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
      var curvePts = [[currentX, currentY], [x1, y1], [x2, y2], [x, y]];
      var steps = Math.max(10, resolution | 0);
      for (var j = 1; j <= steps; j++) {
        var t = j / steps;
        var p = bezierPoint(t, curvePts);
        points.push([p[0], p[1], true]);
      }
      currentX = x; currentY = y;
      lastControlX = x2; lastControlY = y2;
    } else if (cmd === 'c') {
      x1 = currentX + num(); y1 = currentY + num();
      x2 = currentX + num(); y2 = currentY + num();
      x = currentX + num(); y = currentY + num();
      curvePts = [[currentX, currentY], [x1, y1], [x2, y2], [x, y]];
      steps = Math.max(10, resolution | 0);
      for (j = 1; j <= steps; j++) {
        t = j / steps;
        p = bezierPoint(t, curvePts);
        points.push([p[0], p[1], true]);
      }
      currentX = x; currentY = y;
      lastControlX = x2; lastControlY = y2;
    } else if (cmd === 'S') {
      if (lastControlX !== null) { x1 = 2 * currentX - lastControlX; y1 = 2 * currentY - lastControlY; }
      else { x1 = currentX; y1 = currentY; }
      x2 = num(); y2 = num(); x = num(); y = num();
      curvePts = [[currentX, currentY], [x1, y1], [x2, y2], [x, y]];
      steps = Math.max(10, resolution | 0);
      for (j = 1; j <= steps; j++) {
        t = j / steps;
        p = bezierPoint(t, curvePts);
        points.push([p[0], p[1], true]);
      }
      currentX = x; currentY = y;
      lastControlX = x2; lastControlY = y2;
    } else if (cmd === 's') {
      if (lastControlX !== null) { x1 = 2 * currentX - lastControlX; y1 = 2 * currentY - lastControlY; }
      else { x1 = currentX; y1 = currentY; }
      x2 = currentX + num(); y2 = currentY + num();
      x = currentX + num(); y = currentY + num();
      curvePts = [[currentX, currentY], [x1, y1], [x2, y2], [x, y]];
      steps = Math.max(10, resolution | 0);
      for (j = 1; j <= steps; j++) {
        t = j / steps;
        p = bezierPoint(t, curvePts);
        points.push([p[0], p[1], true]);
      }
      currentX = x; currentY = y;
      lastControlX = x2; lastControlY = y2;
    } else if (cmd === 'Q') {
      x1 = num(); y1 = num(); x = num(); y = num();
      curvePts = [[currentX, currentY], [x1, y1], [x, y]];
      steps = Math.max(10, resolution | 0);
      for (j = 1; j <= steps; j++) {
        t = j / steps;
        p = bezierPoint(t, curvePts);
        points.push([p[0], p[1], true]);
      }
      currentX = x; currentY = y;
      lastControlX = x1; lastControlY = y1;
    } else if (cmd === 'q') {
      x1 = currentX + num(); y1 = currentY + num();
      x = currentX + num(); y = currentY + num();
      curvePts = [[currentX, currentY], [x1, y1], [x, y]];
      steps = Math.max(10, resolution | 0);
      for (j = 1; j <= steps; j++) {
        t = j / steps;
        p = bezierPoint(t, curvePts);
        points.push([p[0], p[1], true]);
      }
      currentX = x; currentY = y;
      lastControlX = x1; lastControlY = y1;
    } else if (cmd === 'T') {
      if (lastControlX !== null) { x1 = 2 * currentX - lastControlX; y1 = 2 * currentY - lastControlY; }
      else { x1 = currentX; y1 = currentY; }
      x = num(); y = num();
      curvePts = [[currentX, currentY], [x1, y1], [x, y]];
      steps = Math.max(10, resolution | 0);
      for (j = 1; j <= steps; j++) {
        t = j / steps;
        p = bezierPoint(t, curvePts);
        points.push([p[0], p[1], true]);
      }
      currentX = x; currentY = y;
      lastControlX = x1; lastControlY = y1;
    } else if (cmd === 't') {
      if (lastControlX !== null) { x1 = 2 * currentX - lastControlX; y1 = 2 * currentY - lastControlY; }
      else { x1 = currentX; y1 = currentY; }
      x = currentX + num(); y = currentY + num();
      curvePts = [[currentX, currentY], [x1, y1], [x, y]];
      steps = Math.max(10, resolution | 0);
      for (j = 1; j <= steps; j++) {
        t = j / steps;
        p = bezierPoint(t, curvePts);
        points.push([p[0], p[1], true]);
      }
      currentX = x; currentY = y;
      lastControlX = x1; lastControlY = y1;
    } else if (cmd === 'A') {
      rx = num(); ry = num();
      var xAxisRot = num() * Math.PI / 180;
      var largeArc = num() | 0;
      var sweep = num() | 0;
      x = num(); y = num();
      if (rx === 0 || ry === 0) {
        points.push([x, y, true]);
      } else {
        var arcResult = svgArcToCenter(currentX, currentY, x, y, rx, ry, xAxisRot, largeArc, sweep);
        var cx = arcResult[0], cy = arcResult[1], rx2 = arcResult[2], ry2 = arcResult[3], theta1 = arcResult[4], dtheta = arcResult[5];
        steps = Math.max(10, Math.abs(dtheta) * Math.max(rx2, ry2) / resolution | 0);
        for (j = 1; j <= steps; j++) {
          t = theta1 + (j / steps) * dtheta;
          points.push([cx + rx2 * Math.cos(t), cy + ry2 * Math.sin(t), true]);
        }
      }
      currentX = x; currentY = y;
      lastControlX = lastControlY = null;
    } else if (cmd === 'a') {
      rx = num(); ry = num();
      xAxisRot = num() * Math.PI / 180;
      largeArc = num() | 0;
      sweep = num() | 0;
      x = currentX + num(); y = currentY + num();
      if (rx === 0 || ry === 0) {
        points.push([x, y, true]);
      } else {
        arcResult = svgArcToCenter(currentX, currentY, x, y, rx, ry, xAxisRot, largeArc, sweep);
        cx = arcResult[0]; cy = arcResult[1]; rx2 = arcResult[2]; ry2 = arcResult[3]; theta1 = arcResult[4]; dtheta = arcResult[5];
        steps = Math.max(10, Math.abs(dtheta) * Math.max(rx2, ry2) / resolution | 0);
        for (j = 1; j <= steps; j++) {
          t = theta1 + (j / steps) * dtheta;
          points.push([cx + rx2 * Math.cos(t), cy + ry2 * Math.sin(t), true]);
        }
      }
      currentX = x; currentY = y;
      lastControlX = lastControlY = null;
    } else if (cmd === 'Z' || cmd === 'z') {
      if (currentX !== subpathStartX || currentY !== subpathStartY) {
        points.push([subpathStartX, subpathStartY, true]);
        currentX = subpathStartX; currentY = subpathStartY;
      }
      lastControlX = lastControlY = null;
    }
  }

  return points;
}

function calcStringLengths(anchorDist, x, y) {
  var leftLen = Math.sqrt(x * x + y * y);
  var rightLen = Math.sqrt((anchorDist - x) ** 2 + y * y);
  return [leftLen, rightLen];
}

function parseSVGPaths(svgText) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(svgText, 'image/svg+xml');
  var paths = [];

  var allPaths = doc.querySelectorAll('path');
  for (var i = 0; i < allPaths.length; i++) {
    var path = allPaths[i];
    var d = path.getAttribute('d');
    if (!d) continue;

    var color = null;
    var stroke = path.getAttribute('stroke');
    var fill = path.getAttribute('fill');
    var style = path.getAttribute('style') || '';

    var strokeMatch = style.match(/stroke:\s*([^;]+)/);
    if (strokeMatch) color = strokeMatch[1].trim();
    else if (stroke && stroke !== 'none') color = stroke;
    else if (fill && fill !== 'none') color = fill;

    var pen = colorToPen(color);
    paths.push({ d: d, pen: pen, color: color });
  }

  return paths;
}

function penDir() { return localStorage.getItem('scribit_pen_invert') === '1' ? -1 : 1; }

function svgToGcode(svgText, anchorDist, leftLen, rightLen, opts) {
  var paths = parseSVGPaths(svgText);
  if (!paths.length) return '';
  opts = opts || {};
  var yOffset = opts.yOffset || 0;   // erase mode shifts the pen path up so the eraser (77mm below) tracks the line
  var pdir = opts.penDir || 1;       // pen-carousel rotation direction (configurable for the wrong-way bug)
  var pd = SETTINGS.penDepth, seg = opts.segment || SETTINGS.segment;   // pen depth + max segment (opts.segment lets fills use coarser segments to shrink g-code)

  var startX = (leftLen * leftLen - rightLen * rightLen + anchorDist * anchorDist) / (2 * anchorDist);
  var startY = Math.sqrt(Math.max(0, leftLen * leftLen - startX * startX));

  var gcode = [
    '; Scribit Liberated — self-contained: home pen 1, then draw',
    '; Anchor: ' + anchorDist + 'mm, Left: ' + leftLen + 'mm, Right: ' + rightLen + 'mm',
    'M17 ; enable steppers',
    'G77 ; home pen carousel',
    'G90 ; absolute',
    'G1 Z160 ; overshoot to seat pen 1',
    'G91 ; relative mode',
    'G1 Z-70 ; settle pen 1 up (now at Z90)',
    'G1 F' + SETTINGS.feed,
  ];

  var currentL = leftLen, currentR = rightLen;
  // penZRel is relative to the selected-pen rest: 0 = rest/switch-safe, -pd = marking,
  // +penClear = travel (retracted clear of the wall so pen-up moves don't graze/drag a line).
  var penZRel = 0;
  var penClear = 12; // travel-clearance retract; must stay < 72 (the carousel-index step)
  var currentPen = 1;
  function goZ(target) { var d = target - penZRel; if (d) gcode.push('G1 Z' + d); penZRel = target; }

  // Collect all points with pen info for bounding. opts.colorMap overrides a
  // color's pen assignment (the Upload tab's color->slot mapper); opts.penOverride
  // overrides an INDIVIDUAL path by its index (click-to-assign in the preview) and
  // wins over the color map.
  var colorMap = opts.colorMap || null;
  var penOverride = opts.penOverride || null;
  var allPoints = [];
  for (var pi = 0; pi < paths.length; pi++) {
    var pts = parsePathToPoints(paths[pi].d, 5);
    var pen = paths[pi].pen;
    if (colorMap && paths[pi].color != null && colorMap[paths[pi].color] != null) pen = colorMap[paths[pi].color];
    if (penOverride && penOverride[pi] != null) pen = penOverride[pi];
    if (pen === 0) continue;   // pen 0 = "skip / don't draw" (eraser brush) — omit from g-code (e.g. an SVG background)
    allPoints.push({ pts: pts, pen: pen });
  }
  // Find SVG bounding box / center (for centering + the nearest-path start point)
  var svgMinX = Infinity, svgMaxX = -Infinity, svgMinY = Infinity, svgMaxY = -Infinity;
  for (var k = 0; k < allPoints.length; k++) {
    for (var j = 0; j < allPoints[k].pts.length; j++) {
      var px = allPoints[k].pts[j][0], py = allPoints[k].pts[j][1];
      if (px < svgMinX) svgMinX = px;
      if (px > svgMaxX) svgMaxX = px;
      if (py < svgMinY) svgMinY = py;
      if (py > svgMaxY) svgMaxY = py;
    }
  }
  var svgCenterX = (svgMinX + svgMaxX) / 2;
  var svgCenterY = (svgMinY + svgMaxY) / 2;

  // Pen-aware + nearest-path ordering: group strokes by pen (fewest carousel
  // changes), then within each pen greedily visit the nearest next stroke to cut
  // pen-up travel time.
  if (opts.orderByPen !== false) {
    var groups = {};
    allPoints.forEach(function (e) { (groups[e.pen] = groups[e.pen] || []).push(e); });
    var pens = Object.keys(groups).map(Number).sort(function (a, b) { return a - b; });
    var ordered = [], cur = [svgCenterX, svgCenterY];
    pens.forEach(function (pen) {
      var rem = groups[pen];
      while (rem.length) {
        var bi = 0, bd = Infinity;
        for (var i = 0; i < rem.length; i++) { var s = rem[i].pts[0]; var d = (s[0] - cur[0]) * (s[0] - cur[0]) + (s[1] - cur[1]) * (s[1] - cur[1]); if (d < bd) { bd = d; bi = i; } }
        var e = rem.splice(bi, 1)[0]; ordered.push(e);
        var last = e.pts[e.pts.length - 1]; cur = [last[0], last[1]];
      }
    });
    allPoints = ordered;
  }

  // Process paths
  for (var pi = 0; pi < allPoints.length; pi++) {
    var penNum = allPoints[pi].pen;
    if (penNum > 4) penNum = 1;
    var pts = allPoints[pi].pts;

    // Switch pen if needed
    if (penNum !== currentPen) {
      goZ(0); // return to selected-pen rest so the Z72 carousel-index steps are clean

      var penDist = penNum - currentPen;

      if (currentPen === 4 && penNum === 1) {
        gcode.push('G1 Z' + (72 * pdir), 'G1 Z' + (72 * pdir), 'G1 Z' + (60 * pdir), 'G1 Z' + (-60 * pdir));
      } else {
        for (var p = 0; p < Math.abs(penDist); p++) gcode.push('G1 Z' + (72 * pdir));
        gcode.push('G1 Z' + (60 * pdir), 'G1 Z' + (-60 * pdir));
      }

      currentPen = penNum;
      penZRel = 0;
    }

    for (var ji = 0; ji < pts.length; ji++) {
      var svgX = pts[ji][0], svgY = pts[ji][1], penDown = pts[ji][2];

      // Route every Z change THROUGH rest(0) so the plunge is always a safe -pd move,
      // never (-pd - penClear) in one go — that deeper combined move neared the carousel
      // index threshold and made the first press after a travel skip (missing edges).
      if (penDown) { if (penZRel !== -pd) { goZ(0); goZ(-pd); } }
      else { if (penZRel !== penClear) { goZ(0); goZ(penClear); } }

      var targetX = startX + (svgX - svgCenterX);
      var targetY = startY + (svgY - svgCenterY) + yOffset;

      // Subdivide pen-down moves in Cartesian space so straight lines stay
      // straight: the firmware interpolates string lengths linearly, so a
      // single long move bows into an arc. Pen-up travel moves stay single.
      var cur = calcPosition(anchorDist, currentL, currentR);
      var segLen = Math.hypot(targetX - cur.x, targetY - cur.y);
      var nSeg = penDown ? Math.max(1, Math.ceil(segLen / seg)) : 1;
      for (var s = 1; s <= nSeg; s++) {
        var t = s / nSeg;
        var ix = cur.x + (targetX - cur.x) * t;
        var iy = cur.y + (targetY - cur.y) * t;
        var sl = calcStringLengths(anchorDist, ix, iy);
        gcode.push('G1 X' + (sl[0] - currentL).toFixed(3) + ' Y' + (-(sl[1] - currentR)).toFixed(3));
        currentL = sl[0];
        currentR = sl[1];
      }
    }
  }

  // Return to start
  goZ(penClear); // lift clear of the wall before the return travel

  var finalDeltaL = leftLen - currentL;
  var finalDeltaR = rightLen - currentR;
  gcode.push('G1 X' + finalDeltaL.toFixed(3) + ' Y' + (-finalDeltaR).toFixed(3));
  gcode.push('M18 ; Disable steppers');

  return gcode.join('\n');
}

// ===== End SVG to G-code converter =====

var uploadSvgText = null;   // last-loaded SVG, kept so we can re-convert on assignment/pen changes
var uploadColorMap = {};    // color string -> slot (1-4)
var uploadPathOverride = {};// path index -> slot (1-4): per-shape override from clicking the preview

function elementStrokeColor(el) {
  var style = el.getAttribute('style') || '';
  var m = style.match(/stroke:\s*([^;]+)/); if (m) return m[1].trim();
  var stroke = el.getAttribute('stroke'); if (stroke && stroke !== 'none') return stroke;
  var fill = el.getAttribute('fill'); if (fill && fill !== 'none') return fill;
  return null;
}

function detectUploadColors() {
  var seen = {}, list = [];
  parseSVGPaths(uploadSvgText).forEach(function (p) {
    if (p.color == null || seen[p.color]) return;
    seen[p.color] = true; list.push(p.color);
  });
  return list;
}

function rebuildUploadGcode() {
  if (!uploadSvgText) return;
  uploadedGcode = svgToGcode(uploadSvgText, calibMM.anchor, calibMM.left, calibMM.right,
    { yOffset: eraseToggle.checked ? ERASE_Y_OFFSET : 0, penDir: penDir(), colorMap: uploadColorMap, penOverride: uploadPathOverride });
}

// Pen a path resolves to: per-shape override (click) > color map > nearest-color default.
// Path index here matches parseSVGPaths order (both use querySelectorAll('path')).
function penForPath(idx, color) {
  if (uploadPathOverride[idx] != null) return uploadPathOverride[idx];
  if (color != null && uploadColorMap[color]) return uploadColorMap[color];
  return colorToPen(color);
}

// ===== Paint mode: pick a brush pen, then click/drag preview shapes to color them =====
var activePaintPen = 1;   // the current brush (1-4 = pen, 0 = skip/don't-draw)
var PAINTING = false;     // a paint stroke (mouse/touch down) is in progress
var paintMode = false;    // paint-by-hand is opt-in (toggle); off by default

// Apply the resolved pen color to one preview shape. Uses inline STYLE props so it always wins
// over the SVG's own presentation attributes / style attribute (the old bug where a file's
// style="stroke:..." overrode our setAttribute and the preview ignored the assignment).
function paintColorEl(el) {
  var slot = penForPath(el.__idx, el.__color);
  if (slot === 0) {   // "skip" — faint dashed so it's clearly NOT going to be drawn
    el.style.stroke = 'rgba(130,150,170,0.35)';
    el.style.strokeWidth = '1';
    el.style.strokeDasharray = '4 4';
    el.style.fill = 'none';
    el.style.fillOpacity = '';
    el.setAttribute('vector-effect', 'non-scaling-stroke');
    return;
  }
  var col = penColor(slot);
  el.style.stroke = col;
  el.style.strokeWidth = '2';
  el.style.strokeDasharray = '';
  el.style.fill = el.__hadFill ? col : 'none';        // filled logos stay filled (with their pen color)…
  el.style.fillOpacity = el.__hadFill ? '0.42' : '';  // …softened so you can see the artwork through it
  el.setAttribute('vector-effect', 'non-scaling-stroke');
}

function paintShape(el) {
  if (!el || el.__idx == null) return;
  uploadPathOverride[el.__idx] = activePaintPen;   // paint this shape with the active brush
  paintColorEl(el);
}

function endPainting() {
  if (!PAINTING) return;
  PAINTING = false;
  rebuildUploadGcode();   // recompute g-code once, after the brush stroke finishes
}
document.addEventListener('mouseup', endPainting);
document.addEventListener('touchend', endPainting);

function renderCaPreview() {
  var wrap = document.getElementById('ca-preview');
  if (!wrap || !uploadSvgText) return;
  wrap.innerHTML = uploadSvgText;
  var svg = wrap.querySelector('svg'); if (!svg) return;
  svg.removeAttribute('width'); svg.removeAttribute('height');
  svg.style.touchAction = 'none';   // let us drag-paint on touch screens without the page scrolling
  Array.prototype.forEach.call(svg.querySelectorAll('path'), function (el, idx) {
    var c = elementStrokeColor(el);
    var fillAttr = el.getAttribute('fill');
    var styleFill = (el.getAttribute('style') || '').match(/fill:\s*([^;]+)/);
    var hadFill = styleFill ? styleFill[1].trim() !== 'none' : (fillAttr != null && fillAttr !== 'none');
    el.__idx = idx; el.__color = c; el.__hadFill = !!hadFill;
    paintColorEl(el);
    if (paintMode) {
      el.style.cursor = 'crosshair';
      el.style.pointerEvents = 'all';   // the whole shape is a paint target, not just the thin stroke
      el.addEventListener('mousedown', function (e) { e.preventDefault(); PAINTING = true; paintShape(el); });
      el.addEventListener('mouseenter', function () { if (PAINTING) paintShape(el); });
    } else {
      el.style.cursor = '';
    }
  });
  if (paintMode) {
    var touchPaint = function (e) {
      if (!e.touches.length) return;
      var t = e.touches[0];
      var el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && el.__idx != null) { e.preventDefault(); PAINTING = true; paintShape(el); }
    };
    svg.addEventListener('touchstart', touchPaint, { passive: false });
    svg.addEventListener('touchmove', touchPaint, { passive: false });
  }
}

// The brush palette: tap a pen to make it the active brush.
function buildPaintPalette() {
  var box = document.getElementById('paint-palette'); if (!box) return;
  box.innerHTML = '';
  var label = document.createElement('span'); label.className = 'paint-label'; label.textContent = 'Brush:';
  box.appendChild(label);
  PEN_RACK.forEach(function (p, i) {
    var b = document.createElement('button'); b.type = 'button';
    b.className = 'paint-pen' + (activePaintPen === i + 1 ? ' active' : '');
    b.style.background = p.color; b.textContent = String(i + 1);
    b.title = 'Pen ' + (i + 1) + ' · ' + p.label;
    b.addEventListener('click', function () { activePaintPen = i + 1; buildPaintPalette(); });
    box.appendChild(b);
  });
  // Skip / don't-draw brush — paint a shape with this to keep the robot from drawing it (e.g. a background)
  var skip = document.createElement('button'); skip.type = 'button';
  skip.className = 'paint-pen paint-skip' + (activePaintPen === 0 ? ' active' : '');
  skip.textContent = '⊘'; skip.title = "Skip — don't draw this shape";
  skip.addEventListener('click', function () { activePaintPen = 0; buildPaintPalette(); });
  box.appendChild(skip);
  // Reset — clear all per-shape painting back to automatic
  var reset = document.createElement('button'); reset.type = 'button'; reset.className = 'paint-reset';
  reset.textContent = 'Reset'; reset.title = 'Clear all per-shape painting';
  reset.addEventListener('click', function () { uploadPathOverride = {}; rebuildUploadGcode(); renderCaPreview(); });
  box.appendChild(reset);
}

function buildColorAssignUI() {
  var panel = document.getElementById('color-assign'), listEl = document.getElementById('color-assign-list');
  if (!panel || !listEl) return;
  var colors = detectUploadColors();
  if (!colors.length) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  var fresh = {};
  colors.forEach(function (c) { fresh[c] = uploadColorMap[c] || colorToPen(c); });
  uploadColorMap = fresh;
  listEl.innerHTML = '';
  colors.forEach(function (c) {
    var row = document.createElement('div'); row.className = 'ca-row';
    // LEFT: the color found in your file
    var sw = document.createElement('span'); sw.className = 'ca-swatch'; sw.title = 'Color in your file';
    sw.style.background = c;
    var name = document.createElement('span'); name.className = 'ca-color'; name.textContent = c;
    var arrow = document.createElement('span'); arrow.className = 'ca-arrow'; arrow.textContent = '→';
    // RIGHT: the pen that will actually draw it — show the pen's REAL color so it matches the preview
    var penSw = document.createElement('span'); penSw.className = 'ca-swatch ca-pen-swatch'; penSw.title = 'Pen that draws it';
    var sel = document.createElement('select'); sel.className = 'ca-select';
    PEN_RACK.forEach(function (p, i) {
      var o = document.createElement('option'); o.value = i + 1; o.textContent = 'Pen ' + (i + 1) + ' · ' + p.label; sel.appendChild(o);
    });
    sel.value = uploadColorMap[c];
    penSw.style.background = penColor(uploadColorMap[c]);
    sel.addEventListener('change', function () {
      uploadColorMap[c] = parseInt(sel.value, 10);
      penSw.style.background = penColor(uploadColorMap[c]);   // keep the swatch in sync with the chosen pen
      rebuildUploadGcode(); renderCaPreview();
    });
    row.appendChild(sw); row.appendChild(name); row.appendChild(arrow); row.appendChild(penSw); row.appendChild(sel);
    listEl.appendChild(row);
  });
  var toggle = document.getElementById('paint-toggle');
  var pal = document.getElementById('paint-palette');
  if (toggle) {
    toggle.checked = paintMode;
    toggle.onchange = function () {
      paintMode = toggle.checked;
      if (pal) pal.classList.toggle('hidden', !paintMode);
      renderCaPreview();   // re-bind shapes as paintable / not
    };
  }
  if (pal) pal.classList.toggle('hidden', !paintMode);
  buildPaintPalette();
  renderCaPreview();
}

async function handleFileUpload(file) {
  if (isSVG(file)) {
    uploadSvgText = await file.text();
    uploadPathOverride = {};   // fresh file → clear any per-shape pen overrides
    buildColorAssignUI();
    rebuildUploadGcode();
    var cmdCount = (uploadedGcode.match(/G1 /g) || []).length;
    showToast((eraseToggle.checked ? 'Erase path' : 'SVG') + ' ready: ' + cmdCount + ' moves', 'success');
    return;
  }

  // Raw .gcode file: used as-is. Erase mode can't be applied to pre-baked string-delta G-code.
  uploadSvgText = null;
  var panel = document.getElementById('color-assign'); if (panel) panel.classList.add('hidden');
  var gcode = await file.text();
  if (eraseToggle.checked) {
    showToast('Erase mode applies to SVG & generative art, not raw G-code', 'error');
  }
  uploadedGcode = gcode;
  showToast('Ready to upload', 'success');
}

document.addEventListener('pens-changed', function () { if (uploadSvgText) { buildColorAssignUI(); rebuildUploadGcode(); } });
if (typeof eraseToggle !== 'undefined' && eraseToggle) {
  eraseToggle.addEventListener('change', function () { if (uploadSvgText) rebuildUploadGcode(); });
}

// Eraser sits ~77mm below the pen, so to erase a line the pen path shifts UP 77mm.
// Configurable via Settings (eraseOffset); kept as a var so saveSettings() can update it.
var ERASE_Y_OFFSET = SETTINGS.eraseOffset;

// Upload
uploadBtn.addEventListener('click', async function() {
  if (!currentFile || !uploadedGcode) return;
  if (!confirmSend()) return;
  var drift = machineHomeDriftMM();
  if (drift > 10 && !confirm('Heads up: the robot has drifted ~' + Math.round(drift) + ' mm from its calibrated home, so this drawing may land off-position. Tip: "Center on wall" (Calibrate tab) first.\n\nSend anyway?')) return;
  uploadBtn.disabled = true;
  setProgress(10);

  try {
    setProgress(30);
    var result = await streamDrawing(uploadedGcode);
    setProgress(90);
    showToast('Uploaded successfully!', 'success');
    setProgress(100);
    setTimeout(function() { progressDiv.classList.add('hidden'); }, 1500);
  } catch (e) {
    showToast('Upload failed: ' + e.message, 'error');
    progressDiv.classList.add('hidden');
  } finally {
    uploadBtn.disabled = false;
  }
});

// Calibration test pattern: 120 mm square + inscribed circle + center cross.
// Square should be square and circle round if geometry is calibrated correctly.
function testPatternSVG() {
  var col = penColor(1), s = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">';
  s += '<path d="M0 0 L120 0 L120 120 L0 120 L0 0" stroke="' + col + '" fill="none"/>';
  s += '<path d="M0 0 L120 120" stroke="' + col + '" fill="none"/>';
  s += '<path d="M120 0 L0 120" stroke="' + col + '" fill="none"/>';
  var pts = []; for (var a = 0; a <= 360; a += 5) { var t = a * Math.PI / 180; pts.push((60 + 60 * Math.cos(t)).toFixed(2) + ' ' + (60 + 60 * Math.sin(t)).toFixed(2)); }
  s += '<path d="M ' + pts.join(' L ') + '" stroke="' + col + '" fill="none"/>';
  s += '<path d="M50 60 L70 60" stroke="' + col + '" fill="none"/><path d="M60 50 L60 70" stroke="' + col + '" fill="none"/>';
  return s + '</svg>';
}
var btnTest = document.getElementById('btn-testpattern');
if (btnTest) btnTest.addEventListener('click', async function () {
  if (!confirm('Draw a 120 mm calibration test pattern at the current pen?')) return;
  btnTest.disabled = true;
  try {
    var cmap = {}; cmap[penColor(1)] = 1;
    var g = svgToGcode(testPatternSVG(), calibMM.anchor, calibMM.left, calibMM.right, { penDir: penDir(), colorMap: cmap });
    await streamDrawing(g);
    showToast('Test pattern sent — drawing!', 'success');
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
  finally { btnTest.disabled = false; }
});

// Device controls
btnHome.addEventListener('click', async function() {
  btnHome.disabled = true;
  try {
    // Full pen-home: home the cylinder, then overshoot to Z160 and settle to Z-70
    // so pen 1 is seated in the up position. (G77 alone only homes — it does NOT
    // seat the cam, which is why a plain G77 made pen-down just rotate.)
    await streamDrawing('M17\nG77\nG90\nG1 Z160\nG91\nG1 Z-70\n');
    showToast('Homing pen — pen 1 ready (up)', 'success');
  } catch (e) {
    showToast('Command failed: ' + e.message, 'error');
  }
  btnHome.disabled = false;
});

btnPause.addEventListener('click', async function() {
  btnPause.disabled = true;
  try {
    await apiPost('/pause', {});
    showToast('Paused', 'success');
    pollStatus();
  } catch (e) {
    showToast('Pause failed', 'error');
    btnPause.disabled = false;
  }
});

btnResume.addEventListener('click', async function() {
  btnResume.disabled = true;
  try {
    await apiPost('/resume', {});
    showToast('Resumed', 'success');
    pollStatus();
  } catch (e) {
    showToast('Resume failed', 'error');
    btnResume.disabled = false;
  }
});

btnStop.addEventListener('click', async function() {
  if (!confirm('Stop current job?')) return;
  streamCancel = true;   // interrupt any in-flight browser stream
  btnStop.disabled = true;
  try {
    await apiPost('/stop', '', true);
    await apiPost('/gcode', 'M410', true);   // quickstop: abort moves already in the motion buffer
    showToast('Stopped', 'success');
    pollStatus();
  } catch (e) {
    showToast('Stop failed', 'error');
    btnStop.disabled = false;
  }
});

// EMERGENCY STOP — for a jam/grinding. /stop + M410 halt the motion; M18 cuts motor power so
// the steppers stop driving into a jam (the plain Stop keeps them energized/holding). Disabling
// the motors means the robot is no longer held and can drop, hence the explicit warning.
var btnEstop = document.getElementById('btn-estop');
if (btnEstop) btnEstop.addEventListener('click', async function() {
  if (!confirm('EMERGENCY STOP\n\nThis cuts motor power to halt a jam. The robot will NO LONGER be held and can DROP — make sure you are supporting it.\n\nContinue?')) return;
  streamCancel = true;
  try {
    await apiPost('/stop', '', true);
    await apiPost('/gcode', 'M410', true);   // abort in-flight moves
    await apiPost('/gcode', 'M18', true);    // disable steppers — stops motors grinding into a jam
    showToast('EMERGENCY STOP — motors off. Support the robot!', 'error');
    pollStatus();
  } catch (e) {
    showToast('E-stop send failed — UNPLUG the robot if it is still grinding', 'error');
  }
});

// Calibration helper
function calcPosition(anchor, leftLen, rightLen) {
  var x = (leftLen * leftLen - rightLen * rightLen + anchor * anchor) / (2 * anchor);
  var y = Math.sqrt(Math.max(0, leftLen * leftLen - x * x));
  return { x: x, y: y };
}

var calibMethodName = 'position';

// Units: input fields may be mm or inches; the converter always uses calibMM (mm).
var calibUnit = 'mm';
var calibMM = { anchor: 2515, left: 1585, right: 1585, canvasW: 0, canvasH: 0 };   // canvasW/H in mm, 0 = unset

// ---- Machine position tracking -------------------------------------------------------------
// The robot has NO position memory and NO XY home — it only knows where it is by accumulating
// the moves we send from a known reference. We persist that reference (string lengths, mm) so
// the app knows where the robot is across drawings AND page reloads, and can warn if it has
// drifted from the calibrated home before a draw. (Set once at calibration; updated by every
// streamed move; survives reload as long as the robot itself hasn't been moved by hand.)
var MACHINE_POS = (function () {
  try { var m = JSON.parse(localStorage.getItem('scribit_mpos')); if (m && isFinite(m.L) && isFinite(m.R)) return m; } catch (e) {}
  return null;
})();
function setMachinePos(L, R) {
  MACHINE_POS = { L: L, R: R };
  try { localStorage.setItem('scribit_mpos', JSON.stringify(MACHINE_POS)); } catch (e) {}
}
// Apply the net X/Y of a streamed G91 job to the tracked position (gcode X = left-string delta,
// Y = -(right-string delta)). Drawings net ~0 (they return to start); jogs/center move it.
function advanceMachinePos(sumX, sumY) {
  if (!MACHINE_POS) return;
  setMachinePos(MACHINE_POS.L + sumX, MACHINE_POS.R - sumY);
}
// How far (mm) the robot is from the calibrated home right now.
function machineHomeDriftMM() {
  if (!MACHINE_POS || !calibMM || !calibMM.anchor) return 0;
  var a = calcPosition(calibMM.anchor, MACHINE_POS.L, MACHINE_POS.R);
  var b = calcPosition(calibMM.anchor, calibMM.left, calibMM.right);
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function calibFactor() { return calibUnit === 'in' ? 25.4 : 1; }   // field value * factor = mm

// Rough reachability check: does a maxDim-mm drawing centered at the pen fit the wall?
function drawingFits(maxDim) {
  var A = calibMM.anchor, p = calcPosition(A, calibMM.left, calibMM.right), half = (maxDim || 0) / 2, msgs = [];
  if (p.y - half < 40) msgs.push('the top reaches above / too near the anchor line');
  if (p.x - half < 20) msgs.push('it extends past the left anchor');
  if (p.x + half > A - 20) msgs.push('it extends past the right anchor');
  return { ok: msgs.length === 0, msg: msgs.join('; ') };
}

// Largest square (mm) that still fits the reachable area, centered at the pen.
function maxFitDim() {
  var A = calibMM.anchor, p = calcPosition(A, calibMM.left, calibMM.right);
  var half = Math.min(p.y - 40, p.x - 20, (A - 20) - p.x);
  if (calibMM.canvasW > 0) half = Math.min(half, calibMM.canvasW / 2);
  if (calibMM.canvasH > 0) half = Math.min(half, calibMM.canvasH / 2);
  return Math.max(20, Math.floor(2 * half));
}
// "Fit to wall" buttons (any .fit-btn) set their target size input to the max safe size.
document.addEventListener('click', function (e) {
  var b = e.target.closest('.fit-btn'); if (!b) return;
  var inp = document.getElementById(b.dataset.target); if (!inp) return;
  var d = maxFitDim(); inp.value = d; inp.dispatchEvent(new Event('input'));
  showToast('Fit to wall: ' + d + ' mm', 'success');
});

function calibInputs() {
  var f = calibFactor();
  var anchorRaw = parseFloat(calibAnchor.value);
  if (isNaN(anchorRaw) || anchorRaw <= 0) return { ok: false, msg: 'Enter the anchor distance.' };
  var anchor = anchorRaw * f;   // mm

  var x, y, L, R, warn = '';
  if (calibMethodName === 'position') {
    var xr = parseFloat(calibXoff.value), yr = parseFloat(calibDrop.value);
    if (isNaN(xr) || isNaN(yr)) return { ok: false, msg: 'Enter horizontal offset and vertical drop.' };
    x = xr * f; y = yr * f;
    if (y <= 0) return { ok: false, msg: 'Vertical drop must be greater than 0.' };
    if (x < 0 || x > anchor) warn = 'Pen is outside the anchors horizontally — double-check.';
    L = Math.sqrt(x * x + y * y);
    R = Math.sqrt((anchor - x) * (anchor - x) + y * y);
  } else {
    var lr = parseFloat(calibLeft.value), rr = parseFloat(calibRight.value);
    if (isNaN(lr) || isNaN(rr)) return { ok: false, msg: 'Enter both string lengths.' };
    L = lr * f; R = rr * f;
    if (L <= 0 || R <= 0) return { ok: false, msg: 'String lengths must be positive.' };
    if (L + R <= anchor) return { ok: false, msg: 'Strings too short to span the anchors (L + R must exceed anchor distance).' };
    if (Math.abs(L - R) >= anchor) return { ok: false, msg: 'String lengths are inconsistent with the anchor distance.' };
    var p = calcPosition(anchor, L, R);
    x = p.x; y = p.y;
  }
  var cwRaw = parseFloat(calibCanvasW.value), chRaw = parseFloat(calibCanvasH.value);
  var canvasW = (isNaN(cwRaw) || cwRaw <= 0) ? 0 : cwRaw * f;   // mm, 0 = unset
  var canvasH = (isNaN(chRaw) || chRaw <= 0) ? 0 : chRaw * f;
  return { ok: true, msg: warn, anchor: anchor, x: x, y: y, L: L, R: R, canvasW: canvasW, canvasH: canvasH };   // all mm
}

function drawCalibDiagram(anchor, x, y) {
  var W = 300, H = 210, m = 26, top = 24;
  var scale = (W - 2 * m) / anchor;
  var lx = m, rx = m + anchor * scale;
  var px = m + x * scale;
  var py = Math.min(H - 14, top + y * scale);
  function el(t, a) { var s = '<' + t; for (var k in a) s += ' ' + k + '="' + a[k] + '"'; return s + '></' + t + '>'; }
  var s = '';
  s += el('line', { x1: lx, y1: top, x2: rx, y2: top, stroke: '#3a3f4d', 'stroke-width': 2 });
  s += el('line', { x1: lx, y1: top, x2: px, y2: py, stroke: '#60a5fa', 'stroke-width': 1.5 });
  s += el('line', { x1: rx, y1: top, x2: px, y2: py, stroke: '#60a5fa', 'stroke-width': 1.5 });
  s += el('circle', { cx: lx, cy: top, r: 4, fill: '#e0e0e0' });
  s += el('circle', { cx: rx, cy: top, r: 4, fill: '#e0e0e0' });
  s += el('circle', { cx: px, cy: py, r: 5, fill: '#4ade80' });

  // Measurement guides — label WHAT to measure for each calibration step.
  function dimText(tx, ty, str, anchor) {
    return '<text x="' + tx + '" y="' + ty + '" fill="#46c6f5" font-size="9"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + str + '</text>';
  }
  var dTop = top - 11;                                   // ① anchor distance, above the anchor line
  s += el('line', { x1: lx, y1: dTop, x2: rx, y2: dTop, stroke: '#46c6f5', 'stroke-width': 1 });
  s += el('line', { x1: lx, y1: dTop - 3, x2: lx, y2: dTop + 3, stroke: '#46c6f5', 'stroke-width': 1 });
  s += el('line', { x1: rx, y1: dTop - 3, x2: rx, y2: dTop + 3, stroke: '#46c6f5', 'stroke-width': 1 });
  s += dimText((lx + rx) / 2, dTop - 3, '① anchor', 'middle');
  s += el('line', { x1: px, y1: top, x2: px, y2: py, stroke: '#7fa0c0', 'stroke-width': 1, 'stroke-dasharray': '3 2' });
  s += dimText(px + 4, (top + py) / 2 + 3, '② drop');   // ② vertical drop
  var hy = py + 12;                                       // ② horizontal from left
  s += el('line', { x1: lx, y1: hy, x2: px, y2: hy, stroke: '#7fa0c0', 'stroke-width': 1, 'stroke-dasharray': '3 2' });
  s += dimText((lx + px) / 2, hy + 10, '② from left', 'middle');

  calibDiagram.innerHTML = s;
}

function calibRecompute() {
  var r = calibInputs();
  if (!r.ok) {
    calibComputed.textContent = '—';
    calibMsg.textContent = r.msg || '';
    calibMsg.className = 'calib-msg' + (r.msg ? ' warn' : ' hidden');
    return null;
  }
  calibMM = { anchor: r.anchor, left: r.L, right: r.R, canvasW: r.canvasW, canvasH: r.canvasH };   // canonical mm for the converter
  var f = calibFactor(), u = calibUnit, dp = (u === 'in') ? 2 : 1, dp0 = (u === 'in') ? 1 : 0;
  calibLeft.value = (r.L / f).toFixed(dp);
  calibRight.value = (r.R / f).toFixed(dp);
  calibComputed.innerHTML = 'Position: <b>x ' + (r.x / f).toFixed(dp0) + '</b> · <b>y ' + (r.y / f).toFixed(dp0) + '</b> ' + u + '<br>' +
    'Strings: L <b>' + (r.L / f).toFixed(dp) + '</b> · R <b>' + (r.R / f).toFixed(dp) + '</b> ' + u;
  calibMsg.textContent = r.msg || '';
  calibMsg.className = 'calib-msg' + (r.msg ? ' warn' : ' hidden');
  drawCalibDiagram(r.anchor, r.x, r.y);
  return r;
}

function setCalibMethod(method) {
  calibMethodName = method;
  Array.prototype.forEach.call(calibMethod.children, function (c) {
    c.classList.toggle('active', c.dataset.method === method);
  });
  methodPosition.classList.toggle('hidden', method !== 'position');
  methodStrings.classList.toggle('hidden', method !== 'strings');
  calibRecompute();
}

calibMethod.addEventListener('click', function (e) {
  var b = e.target.closest('.seg');
  if (b) setCalibMethod(b.dataset.method);
});

// Center the robot between the anchors (best accuracy: equal strings) and make that home.
var btnCenter = document.getElementById('calib-center');
if (btnCenter) btnCenter.addEventListener('click', async function () {
  if (!calibMM || !calibMM.anchor || !calibMM.left) { showToast('Set your calibration first', 'error'); return; }
  var A = calibMM.anchor, p = calcPosition(A, calibMM.left, calibMM.right);
  var cx = A / 2, cy = p.y;
  var tL = Math.sqrt(cx * cx + cy * cy), tR = Math.sqrt((A - cx) * (A - cx) + cy * cy);
  if (!confirm('Move the robot to the center of the wall and use that as home?')) return;
  var dL = tL - calibMM.left, dR = tR - calibMM.right;
  var g = 'M17\nG77\nG90\nG1 Z160\nG91\nG1 Z-70\nG1 F1500\nG1 X' + dL.toFixed(3) + ' Y' + (-dR).toFixed(3) + '\nM18\n';
  btnCenter.disabled = true;
  try {
    await streamDrawing(g, { bounds: false });
    calibMM = { anchor: A, left: tL, right: tR, canvasW: calibMM.canvasW, canvasH: calibMM.canvasH };
    var f = calibFactor(), u = calibUnit, dp = (u === 'in') ? 2 : 1, dp0 = (u === 'in') ? 1 : 0;
    if (calibLeft) calibLeft.value = (tL / f).toFixed(dp);
    if (calibRight) calibRight.value = (tR / f).toFixed(dp);
    if (calibXoff) calibXoff.value = (cx / f).toFixed(dp0);
    if (calibDrop) calibDrop.value = (cy / f).toFixed(dp0);
    calibComputed.innerHTML = 'Position: <b>x ' + (cx / f).toFixed(dp0) + '</b> · <b>y ' + (cy / f).toFixed(dp0) + '</b> ' + u + '<br>Strings: L <b>' + (tL / f).toFixed(dp) + '</b> · R <b>' + (tR / f).toFixed(dp) + '</b> ' + u;
    drawCalibDiagram(A, cx, cy);
    showToast('Robot centered on wall', 'success');
  } catch (e) { showToast('Center failed: ' + e.message, 'error'); }
  finally { btnCenter.disabled = false; }
});

var calibUnitBar = document.getElementById('calib-unit');
if (calibUnitBar) calibUnitBar.addEventListener('click', function (e) {
  var b = e.target.closest('.seg');
  if (!b || b.dataset.unit === calibUnit) return;
  var oldToNew = (b.dataset.unit === 'in') ? (1 / 25.4) : 25.4;   // mm->in or in->mm
  var dp = b.dataset.unit === 'in' ? 2 : 1;
  [calibAnchor, calibXoff, calibDrop, calibLeft, calibRight, calibCanvasW, calibCanvasH].forEach(function (inp) {
    if (inp && inp.value !== '' && !isNaN(parseFloat(inp.value))) inp.value = (parseFloat(inp.value) * oldToNew).toFixed(dp);
  });
  calibUnit = b.dataset.unit;
  Array.prototype.forEach.call(calibUnitBar.children, function (c) { c.classList.toggle('active', c.dataset.unit === calibUnit); });
  calibRecompute();
});

[calibAnchor, calibXoff, calibDrop, calibLeft, calibRight, calibCanvasW, calibCanvasH].forEach(function (inp) {
  if (inp) inp.addEventListener('input', calibRecompute);
});

function loadWalls() { try { return JSON.parse(localStorage.getItem('scribit_walls') || '{}'); } catch (e) { return {}; } }
function refreshWalls() {
  var w = loadWalls();
  calibWallSelect.innerHTML = '<option value="">— saved walls —</option>';
  Object.keys(w).forEach(function (name) {
    var o = document.createElement('option');
    o.value = name; o.textContent = name;
    calibWallSelect.appendChild(o);
  });
}

calibSaveBtn.addEventListener('click', function () {
  var r = calibRecompute();
  if (!r) { showToast('Fix the values before saving', 'error'); return; }
  var name = (calibWallName.value || '').trim();
  if (!name) { showToast('Enter a wall name to save', 'error'); return; }
  var w = loadWalls();
  w[name] = { anchor: r.anchor, left: +r.L.toFixed(1), right: +r.R.toFixed(1), canvasW: r.canvasW, canvasH: r.canvasH };
  localStorage.setItem('scribit_walls', JSON.stringify(w));
  refreshWalls();
  calibWallSelect.value = name;
  showToast('Saved wall "' + name + '"', 'success');
});

calibWallLoad.addEventListener('click', function () {
  var name = calibWallSelect.value;
  if (!name) return;
  var w = loadWalls()[name];
  if (!w) return;
  var f = calibFactor(), dp = calibUnit === 'in' ? 2 : 1;
  calibAnchor.value = (w.anchor / f).toFixed(dp);
  setCalibMethod('strings');
  calibLeft.value = (w.left / f).toFixed(dp);
  calibRight.value = (w.right / f).toFixed(dp);
  calibCanvasW.value = w.canvasW ? (w.canvasW / f).toFixed(dp) : '';
  calibCanvasH.value = w.canvasH ? (w.canvasH / f).toFixed(dp) : '';
  calibWallName.value = name;
  calibRecompute();
  showToast('Loaded "' + name + '"', 'success');
});

calibWallDelete.addEventListener('click', function () {
  var name = calibWallSelect.value;
  if (!name) return;
  if (!confirm('Delete saved wall "' + name + '"?')) return;
  var w = loadWalls();
  delete w[name];
  localStorage.setItem('scribit_walls', JSON.stringify(w));
  refreshWalls();
  showToast('Deleted', 'success');
});

calibApplyBtn.addEventListener('click', function () {
  var r = calibRecompute();
  if (!r) { showToast('Fix the calibration values first', 'error'); return; }
  localStorage.setItem('scribit_last_calib', JSON.stringify({ anchor: r.anchor, left: +r.L.toFixed(1), right: +r.R.toFixed(1), canvasW: r.canvasW, canvasH: r.canvasH }));
  setMachinePos(r.L, r.R);   // applying calibration declares the robot is AT this position now
  showToast('Calibration applied: anchor ' + r.anchor.toFixed(0) + ', L ' + r.L.toFixed(0) + ', R ' + r.R.toFixed(0), 'success');
});

(function initCalib() {
  refreshWalls();
  try {
    var last = JSON.parse(localStorage.getItem('scribit_last_calib') || 'null');
    if (last) {
      calibAnchor.value = last.anchor;
      calibLeft.value = last.left;
      calibRight.value = last.right;
      if (last.canvasW) calibCanvasW.value = last.canvasW;
      if (last.canvasH) calibCanvasH.value = last.canvasH;
      setCalibMethod('strings');
      return;
    }
  } catch (e) {}
  setCalibMethod('position');
})();

// Seed the tracked machine position from the calibrated home the first time (no prior tracking).
(function initMachinePos() {
  if (!MACHINE_POS && calibMM && isFinite(calibMM.left) && calibMM.left > 0) setMachinePos(calibMM.left, calibMM.right);
})();

// ===== Image -> Line Art (hatching + outline) =====
(function imgArt() {
  var input = document.getElementById('img-input');
  if (!input) return;
  var drop = document.getElementById('img-drop');
  var controls = document.getElementById('img-controls');
  var modeBar = document.getElementById('img-mode');
  var paramsBox = document.getElementById('img-params');
  var invertEl = document.getElementById('img-invert');
  var frameEl = document.getElementById('img-frame');
  var fillSel = document.getElementById('img-fill');
  var sizeInput = document.getElementById('img-size');
  function fillStyle() { return fillSel ? fillSel.value : 'horizontal'; }
  var canvas = document.getElementById('img-canvas');
  var ctx = canvas.getContext('2d');
  var info = document.getElementById('img-info');
  var sendBtn = document.getElementById('img-send');
  var dlBtn = document.getElementById('img-download');

  var mode = 'hatch';
  var gray = null, gproc = null, rgb = null, alpha = null, W = 0, H = 0;   // gray=lum; rgb=color; alpha=opaque mask; gproc=adjusted
  var polylines = [];              // work-pixel coords (mono mode)
  var colorGroups = null;          // [{color:[r,g,b], pen, polys}] when colors > 1
  var paletteAssign = [];          // palette index -> pen slot (user override)

  var PARAMS = [
    { key: 'colors', label: 'Colors (1 = single pen)', min: 1, max: 4, step: 1, val: 1 },
    { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 5, val: 0 },
    { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 5, val: 0 },
    { key: 'blur', label: 'Blur', min: 0, max: 4, step: 1, val: 0 },
    { key: 'thresh', label: 'Threshold', min: 20, max: 240, step: 5, val: 130 },
    { key: 'spacing', label: 'Line spacing', min: 1, max: 10, step: 1, val: 3 },
    { key: 'tone', label: 'Tone (cross-hatch levels)', min: 1, max: 4, step: 1, val: 1 }
  ];
  function pval(k) {
    var el = document.getElementById('ip-' + k);
    if (el) return parseFloat(el.value);
    for (var i = 0; i < PARAMS.length; i++) if (PARAMS[i].key === k) return PARAMS[i].val;
    return 0;
  }

  function buildParams() {
    paramsBox.innerHTML = '';
    PARAMS.forEach(function (p) {
      var row = document.createElement('div'); row.className = 'gen-slider';
      var lab = document.createElement('label');
      lab.innerHTML = p.label + ' <span id="iv-' + p.key + '">' + p.val + '</span>';
      var inp = document.createElement('input');
      inp.type = 'range'; inp.id = 'ip-' + p.key; inp.min = p.min; inp.max = p.max; inp.step = p.step; inp.value = p.val;
      inp.addEventListener('input', function () { document.getElementById('iv-' + p.key).textContent = inp.value; regenerate(); });
      row.appendChild(lab); row.appendChild(inp); paramsBox.appendChild(row);
    });
  }

  function loadImage(file) {
    var img = new Image();
    img.onload = function () {
      var maxW = 200, scale = Math.min(1, maxW / img.width);
      W = Math.max(1, Math.round(img.width * scale));
      H = Math.max(1, Math.round(img.height * scale));
      var off = document.createElement('canvas'); off.width = W; off.height = H;
      var octx = off.getContext('2d');
      octx.drawImage(img, 0, 0, W, H);
      var data = octx.getImageData(0, 0, W, H).data;
      gray = new Uint8ClampedArray(W * H);
      rgb = new Uint8ClampedArray(W * H * 3);
      alpha = new Uint8Array(W * H);
      for (var i = 0; i < W * H; i++) {
        var r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
        alpha[i] = a >= 128 ? 1 : 0;       // 0 = transparent -> never drawn
        gray[i] = a < 128 ? 255 : (0.299*r + 0.587*g + 0.114*b);
        rgb[i*3] = r; rgb[i*3+1] = g; rgb[i*3+2] = b;
      }
      paletteAssign = [];
      controls.classList.remove('hidden');
      regenerate();
    };
    img.src = URL.createObjectURL(file);
  }

  function clampv(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function boxBlur(src, r) {
    var tmp = new Float32Array(W * H), out = new Float32Array(W * H), d = 2 * r + 1, x, y, s;
    for (y = 0; y < H; y++) { s = 0; for (x = -r; x <= r; x++) s += src[y*W + clampv(x,0,W-1)]; for (x = 0; x < W; x++) { tmp[y*W+x] = s/d; s += src[y*W+clampv(x+r+1,0,W-1)] - src[y*W+clampv(x-r,0,W-1)]; } }
    for (x = 0; x < W; x++) { s = 0; for (y = -r; y <= r; y++) s += tmp[clampv(y,0,H-1)*W+x]; for (y = 0; y < H; y++) { out[y*W+x] = s/d; s += tmp[clampv(y+r+1,0,H-1)*W+x] - tmp[clampv(y-r,0,H-1)*W+x]; } }
    return out;
  }
  function proc() {   // apply brightness / contrast / blur -> working buffer
    var b = pval('brightness'), c = pval('contrast'), r = Math.round(pval('blur'));
    var f = (259 * (c + 255)) / (255 * (259 - c)), g2 = new Float32Array(W * H);
    for (var i = 0; i < W * H; i++) { var v = f * (gray[i] + b - 128) + 128; g2[i] = v < 0 ? 0 : v > 255 ? 255 : v; }
    return r > 0 ? boxBlur(g2, r) : g2;
  }

  function hatching(spacing, thresh, invert, tone) {
    function darkAt(x, y, t) { var g = gproc[y * W + x]; return invert ? (g > 255 - t) : (g < t); }
    // Tonal levels: each successive level only covers darker pixels (threshold
    // falls off), filled in the chosen Fill style. tone=1 -> a single pass.
    var polys = [];
    for (var k = 0; k < tone; k++) {
      var tk = thresh * Math.pow(0.72, k);
      polys = polys.concat(fillRegion(function (x, y) { return darkAt(x, y, tk); }, spacing));
    }
    return polys;
  }

  function outline(thresh) {
    var edge = new Uint8Array(W * H), lim = 260 - thresh;  // higher slider -> more edges
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      var gx = -gproc[(y-1)*W+x-1] - 2*gproc[y*W+x-1] - gproc[(y+1)*W+x-1] + gproc[(y-1)*W+x+1] + 2*gproc[y*W+x+1] + gproc[(y+1)*W+x+1];
      var gy = -gproc[(y-1)*W+x-1] - 2*gproc[(y-1)*W+x] - gproc[(y-1)*W+x+1] + gproc[(y+1)*W+x-1] + 2*gproc[(y+1)*W+x] + gproc[(y+1)*W+x+1];
      if (Math.sqrt(gx*gx + gy*gy) > lim) edge[y*W+x] = 1;
    }
    var polys = [];
    for (var yy = 0; yy < H; yy++) {
      var xx = 0;
      while (xx < W) {
        if (edge[yy*W+xx]) { var x0 = xx; while (xx < W && edge[yy*W+xx]) xx++; polys.push([[x0, yy], [xx - 1, yy]]); }
        else xx++;
      }
    }
    return polys;
  }

  // --- Multi-color (quantize the photo to N colors, hatch each, route to pens) ---
  function boxRange(box) {
    var lo = [255, 255, 255], hi = [0, 0, 0];
    for (var i = 0; i < box.length; i++) for (var c = 0; c < 3; c++) { var v = box[i][c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
    return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  }
  function quantize(n) {   // median-cut over the (downsampled) OPAQUE pixels -> n palette colors
    var pts = [], step = Math.max(1, Math.floor((W * H) / 12000));   // sample for speed
    for (var i = 0; i < W * H; i += step) if (alpha[i]) pts.push([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]);
    if (!pts.length) pts.push([0, 0, 0]);
    var boxes = [pts];
    while (boxes.length < n) {
      var bi = -1, best = -1;
      for (var j = 0; j < boxes.length; j++) { if (boxes[j].length < 2) continue; var rg = boxRange(boxes[j]); var mx = Math.max(rg[0], rg[1], rg[2]); if (mx > best) { best = mx; bi = j; } }
      if (bi < 0) break;
      var box = boxes[bi], rg = boxRange(box), ax = rg[0] >= rg[1] && rg[0] >= rg[2] ? 0 : (rg[1] >= rg[2] ? 1 : 2);
      box.sort(function (p, q) { return p[ax] - q[ax]; });
      var mid = box.length >> 1;
      boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
    }
    return boxes.map(function (box) { var s = [0, 0, 0]; box.forEach(function (p) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }); return [Math.round(s[0] / box.length), Math.round(s[1] / box.length), Math.round(s[2] / box.length)]; });
  }
  function nearestPen(c) {   // pen slot (1-4) whose loaded color is closest to c
    var best = 1, bd = Infinity;
    for (var k = 0; k < PEN_RACK.length; k++) { var t = parseCssColor(PEN_RACK[k].color) || [0, 0, 0]; var d = (c[0] - t[0]) ** 2 + (c[1] - t[1]) ** 2 + (c[2] - t[2]) ** 2; if (d < bd) { bd = d; best = k + 1; } }
    return best;
  }
  // Boustrophedon scan-fill of a region at any angle (0=horizontal, 90=vertical, 45=diagonal).
  function scanAngled(on, spacing, angleDeg) {
    var rad = angleDeg * Math.PI / 180, dx = Math.cos(rad), dy = Math.sin(rad), px = -dy, py = dx;
    var diag = Math.ceil(Math.hypot(W, H)), cx = W / 2, cy = H / 2;
    var polys = [], cur = null, prevEnd = null, dir = 1;
    for (var d = -diag; d <= diag; d += spacing) {
      var bx = cx + px * d, by = cy + py * d, runs = [], inRun = false, rs = 0;
      for (var t = -diag; t <= diag; t++) {
        var x = Math.round(bx + dx * t), y = Math.round(by + dy * t);
        var ok = x >= 0 && y >= 0 && x < W && y < H && on(x, y);
        if (ok && !inRun) { inRun = true; rs = t; } else if (!ok && inRun) { inRun = false; runs.push([rs, t - 1]); }
      }
      if (inRun) runs.push([rs, diag]);
      if (!runs.length) { if (cur) { polys.push(cur); cur = null; prevEnd = null; } dir = 1; continue; }
      if (dir < 0) runs.reverse();
      runs.forEach(function (r) {
        var ts = dir > 0 ? r[0] : r[1], te = dir > 0 ? r[1] : r[0];
        var a = [bx + dx * ts, by + dy * ts], b = [bx + dx * te, by + dy * te];
        if (cur && prevEnd && Math.hypot(prevEnd[0] - a[0], prevEnd[1] - a[1]) <= spacing * 1.7) cur.push(a, b);
        else { if (cur) polys.push(cur); cur = [a, b]; }
        prevEnd = b;
      });
      dir = -dir;
    }
    if (cur) polys.push(cur);
    return polys;
  }
  function stippleFill(on, spacing) {
    var p = [], s = Math.max(2, spacing + 1);
    for (var y = s / 2; y < H; y += s) for (var x = s / 2; x < W; x += s) if (on(x | 0, y | 0)) p.push([[x, y], [x + 0.6, y]]);
    return p;
  }
  function fillRegion(on, spacing) {
    var style = fillStyle();
    if (style === 'stipple') return stippleFill(on, spacing);
    if (style === 'vertical') return scanAngled(on, spacing, 90);
    if (style === 'diagonal') return scanAngled(on, spacing, 45);
    if (style === 'grid') return scanAngled(on, spacing, 0).concat(scanAngled(on, spacing, 90));
    if (style === 'crosshatch') return scanAngled(on, spacing, 45).concat(scanAngled(on, spacing, -45));
    return scanAngled(on, spacing, 0);   // horizontal (default)
  }
  function maskHatch(label, k, spacing) {   // fill pixels labeled k, in the chosen style
    return fillRegion(function (x, y) { return label[y * W + x] === k; }, spacing);
  }
  function multiRegenerate(n, spacing) {
    var pal = quantize(n);
    var label = new Uint8Array(W * H);
    for (var i = 0; i < W * H; i++) {
      if (!alpha[i]) { label[i] = 255; continue; }   // transparent -> never drawn
      var best = 0, bd = Infinity;
      for (var k = 0; k < pal.length; k++) { var d = (rgb[i * 3] - pal[k][0]) ** 2 + (rgb[i * 3 + 1] - pal[k][1]) ** 2 + (rgb[i * 3 + 2] - pal[k][2]) ** 2; if (d < bd) { bd = d; best = k; } }
      label[i] = best;
    }
    colorGroups = pal.map(function (c, k) {
      var pen = (paletteAssign[k] != null ? paletteAssign[k] : nearestPen(c));   // pen 0 = don't draw
      return { color: c, pen: pen, polys: pen === 0 ? [] : maskHatch(label, k, spacing) };
    });
    polylines = [];
    buildPaletteUI();
    draw();
    var pts = colorGroups.reduce(function (a, g) { return a + g.polys.reduce(function (b, p) { return b + p.length; }, 0); }, 0);
    info.innerHTML = 'Source: <b>' + W + '×' + H + '</b> · <b>' + n + '</b> colors<br>Strokes: <b>' + colorGroups.reduce(function (a, g) { return a + g.polys.length; }, 0) + '</b> · pts ' + pts;
  }
  function buildPaletteUI() {
    var box = document.getElementById('img-palette');
    if (!box) return;
    if (!colorGroups) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden'); box.innerHTML = '<div class="ca-hint">Each photo color → a pen. Change any below.</div>';
    colorGroups.forEach(function (g, k) {
      var row = document.createElement('div'); row.className = 'ca-row';
      var sw = document.createElement('span'); sw.className = 'ca-swatch'; sw.style.background = 'rgb(' + g.color[0] + ',' + g.color[1] + ',' + g.color[2] + ')';
      var name = document.createElement('span'); name.className = 'ca-color'; name.textContent = 'rgb(' + g.color.join(',') + ')';
      var sel = document.createElement('select'); sel.className = 'ca-select';
      var skip = document.createElement('option'); skip.value = 0; skip.textContent = '✕ Don’t draw'; sel.appendChild(skip);
      PEN_RACK.forEach(function (p, i) { var o = document.createElement('option'); o.value = i + 1; o.textContent = (i + 1) + ' · ' + p.label; sel.appendChild(o); });
      sel.value = g.pen;
      sel.addEventListener('change', function () { paletteAssign[k] = parseInt(sel.value, 10); regenerate(); });
      row.appendChild(sw); row.appendChild(name); row.appendChild(sel); box.appendChild(row);
    });
  }

  function regenerate() {
    if (!gray) return;
    var colors = Math.max(1, Math.round(pval('colors')));
    var spacing = Math.max(1, Math.round(pval('spacing')));
    if (colors > 1 && rgb) { multiRegenerate(colors, spacing); return; }
    colorGroups = null; buildPaletteUI();
    gproc = proc();
    var thresh = pval('thresh'), tone = Math.max(1, Math.round(pval('tone')));
    var polys = [];
    if (mode === 'hatch' || mode === 'both') polys = polys.concat(hatching(spacing, thresh, invertEl.checked, tone));
    if (mode === 'outline' || mode === 'both') polys = polys.concat(outline(thresh));
    if (frameEl && frameEl.checked) polys.push([[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1], [0, 0]]);
    polylines = polys;
    draw();
    var pts = polylines.reduce(function (a, p) { return a + p.length; }, 0);
    info.innerHTML = 'Source: <b>' + W + '×' + H + '</b><br>Strokes: <b>' + polylines.length + '</b><br>Out: <b>' + (parseFloat(sizeInput.value) || 300).toFixed(0) + '</b> mm';
  }

  function draw() {
    var CW = canvas.width, CH = canvas.height;
    ctx.clearRect(0, 0, CW, CH);
    if (!W) return;
    var m = 8, sc = Math.min((CW - 2*m) / W, (CH - 2*m) / H), ox = (CW - W*sc) / 2, oy = (CH - H*sc) / 2;
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    function paint(polys, col) {
      ctx.strokeStyle = col; ctx.beginPath();
      polys.forEach(function (poly) { poly.forEach(function (pt, i) { var x = ox + pt[0]*sc, y = oy + pt[1]*sc; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); });
      ctx.stroke();
    }
    if (colorGroups) colorGroups.forEach(function (g) { paint(g.polys, penColor(g.pen)); });
    else paint(polylines, penColor(penPick.slot()));
  }

  function hasOutput() { return polylines.length || (colorGroups && colorGroups.some(function (g) { return g.polys.length; })); }

  function toSVG() {
    var size = parseFloat(sizeInput.value) || 300, sc = size / Math.max(W, H);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (W*sc).toFixed(1) + '" height="' + (H*sc).toFixed(1) + '">';
    function emit(polys, col) { polys.forEach(function (poly) { s += '<path d="M ' + poly.map(function (pt) { return (pt[0]*sc).toFixed(2) + ' ' + (pt[1]*sc).toFixed(2); }).join(' L ') + '" stroke="' + col + '" fill="none"/>'; }); }
    if (colorGroups) colorGroups.forEach(function (g) { emit(g.polys, penColor(g.pen)); });
    else emit(polylines, penColor(penPick.slot()));
    return s + '</svg>';
  }
  function imgToGcode() {
    var anchor = calibMM.anchor, L = calibMM.left, R = calibMM.right, cmap = {};
    if (colorGroups) colorGroups.forEach(function (g) { if (g.pen) cmap[penColor(g.pen)] = g.pen; });
    else { var slot = penPick.slot(); cmap[penColor(slot)] = slot; }
    // Coarse segment for image fills: hatch lines are ~straight, so fine 1.5mm
    // subdivision just bloats the g-code (this unit can't load huge files).
    return svgToGcode(toSVG(), anchor, L, R, { yOffset: eraseToggle.checked ? ERASE_Y_OFFSET : 0, penDir: penDir(), colorMap: cmap, segment: 12 });
  }

  modeBar.addEventListener('click', function (e) {
    var b = e.target.closest('.seg'); if (!b) return;
    mode = b.dataset.mode;
    Array.prototype.forEach.call(modeBar.children, function (c) { c.classList.toggle('active', c === b); });
    regenerate();
  });
  [invertEl, frameEl, sizeInput].forEach(function (el) { if (el) el.addEventListener('input', regenerate); });
  if (fillSel) fillSel.addEventListener('change', regenerate);
  var penPick = makePenPicker(function () { regenerate(); });
  if (modeBar && modeBar.parentNode) modeBar.parentNode.insertBefore(penPick.el, modeBar.nextSibling);
  input.addEventListener('change', function () { if (input.files && input.files[0]) loadImage(input.files[0]); });
  drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', function () { drop.classList.remove('drag-over'); });
  drop.addEventListener('drop', function (e) {
    e.preventDefault(); drop.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]);
  });

  dlBtn.addEventListener('click', function () {
    if (!hasOutput()) { showToast('Load an image first', 'error'); return; }
    var blob = new Blob([imgToGcode()], { type: 'text/plain' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'image-art.gcode'; a.click();
    showToast('G-code downloaded', 'success');
  });
  sendBtn.addEventListener('click', async function () {
    if (!hasOutput()) { showToast('Load an image first', 'error'); return; }
    if (!confirmSend()) return;
    var bounds = drawingFits(parseFloat(sizeInput.value) || 300);
    if (!bounds.ok && !confirm('Heads up — ' + bounds.msg + '. The robot may not reach it. Send anyway?')) return;
    var g = imgToGcode();
    if (g.length > 90000 && !confirm('This is a large drawing (~' + Math.round(g.length / 1024) + ' KB of G-code). It may draw very slowly, and the robot can fail to load files this big. Try fewer colors / wider line spacing for a smaller file. Send anyway?')) return;
    sendBtn.disabled = true;
    try { await streamDrawing(g); showToast('Sent to robot — drawing!', 'success'); }
    catch (e) { showToast('Send failed: ' + e.message, 'error'); }
    sendBtn.disabled = false;
  });

  buildParams();
})();

// ===== Text -> Line Art =====
(function textArt() {
  var input = document.getElementById('text-input'); if (!input) return;
  var modeBar = document.getElementById('text-mode');
  var fontSel = document.getElementById('text-font');
  var boldEl = document.getElementById('text-bold');
  var sizeInput = document.getElementById('text-size');
  var canvas = document.getElementById('text-canvas'); var ctx = canvas.getContext('2d');
  var info = document.getElementById('text-info');
  var sendBtn = document.getElementById('text-send'); var dlBtn = document.getElementById('text-download');

  var mode = 'outline';
  var gray = null, W = 0, H = 0, polylines = [];

  function renderText() {
    var lines = (input.value || '').split('\n');
    var px = 80, lh = Math.round(px * 1.3), pad = 8;
    var meas = document.createElement('canvas').getContext('2d');
    var font = (boldEl.checked ? 'bold ' : '') + px + 'px ' + fontSel.value;
    meas.font = font;
    var maxW = 1;
    lines.forEach(function (l) { maxW = Math.max(maxW, meas.measureText(l || ' ').width); });
    W = Math.ceil(maxW) + pad * 2;
    H = lines.length * lh + pad * 2;
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var octx = off.getContext('2d');
    octx.fillStyle = '#fff'; octx.fillRect(0, 0, W, H);
    octx.fillStyle = '#000'; octx.textBaseline = 'top'; octx.font = font;
    lines.forEach(function (l, idx) { octx.fillText(l, pad, pad + idx * lh); });
    var data = octx.getImageData(0, 0, W, H).data;
    gray = new Uint8ClampedArray(W * H);
    for (var i = 0; i < W * H; i++) gray[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2];
  }
  function darkAt(x, y) { return gray[y * W + x] < 128; }

  function fill() {
    var polys = [], spacing = 2, cur = null, prevEnd = null, dir = 1;
    for (var y = 0; y < H; y += spacing) {
      var runs = [], x = 0;
      while (x < W) { if (darkAt(x, y)) { var x0 = x; while (x < W && darkAt(x, y)) x++; runs.push([x0, x - 1]); } else x++; }
      if (!runs.length) { if (cur) { polys.push(cur); cur = null; prevEnd = null; } dir = 1; continue; }
      if (dir < 0) runs.reverse();
      for (var ri = 0; ri < runs.length; ri++) {
        var r = runs[ri], a = [dir > 0 ? r[0] : r[1], y], b = [dir > 0 ? r[1] : r[0], y];
        if (cur && prevEnd && Math.abs(prevEnd[0] - a[0]) <= spacing + 1) cur.push(a, b);
        else { if (cur) polys.push(cur); cur = [a, b]; }
        prevEnd = b;
      }
      dir = -dir;
    }
    if (cur) polys.push(cur);
    return polys;
  }
  function outline() {
    var edge = new Uint8Array(W * H), polys = [];
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      var gx = -gray[(y-1)*W+x-1]-2*gray[y*W+x-1]-gray[(y+1)*W+x-1]+gray[(y-1)*W+x+1]+2*gray[y*W+x+1]+gray[(y+1)*W+x+1];
      var gy = -gray[(y-1)*W+x-1]-2*gray[(y-1)*W+x]-gray[(y-1)*W+x+1]+gray[(y+1)*W+x-1]+2*gray[(y+1)*W+x]+gray[(y+1)*W+x+1];
      if (Math.sqrt(gx*gx + gy*gy) > 100) edge[y*W+x] = 1;
    }
    for (var yy = 0; yy < H; yy++) { var xx = 0; while (xx < W) { if (edge[yy*W+xx]) { var x0 = xx; while (xx < W && edge[yy*W+xx]) xx++; polys.push([[x0, yy], [xx - 1, yy]]); } else xx++; } }
    return polys;
  }

  function regen() {
    if (!input.value.trim()) { polylines = []; ctx.clearRect(0, 0, canvas.width, canvas.height); info.textContent = '—'; return; }
    renderText();
    polylines = (mode === 'fill') ? fill() : outline();
    var CW = canvas.width, CH = canvas.height, m = 8, sc = Math.min((CW-2*m)/W, (CH-2*m)/H), ox = (CW-W*sc)/2, oy = (CH-H*sc)/2;
    ctx.clearRect(0, 0, CW, CH); ctx.strokeStyle = penColor(penPick.slot()); ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath();
    polylines.forEach(function (poly) { poly.forEach(function (pt, i) { var x = ox+pt[0]*sc, y = oy+pt[1]*sc; if (i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); });
    ctx.stroke();
    info.innerHTML = 'Strokes: <b>' + polylines.length + '</b><br>Height: <b>' + (parseFloat(sizeInput.value) || 120).toFixed(0) + '</b> mm';
  }

  function toSVG() {
    var size = parseFloat(sizeInput.value) || 120, sc = size / H, col = penColor(penPick.slot());   // text height -> size mm
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (W*sc).toFixed(1) + '" height="' + (H*sc).toFixed(1) + '">';
    polylines.forEach(function (poly) { s += '<path d="M ' + poly.map(function (pt) { return (pt[0]*sc).toFixed(2)+' '+(pt[1]*sc).toFixed(2); }).join(' L ') + '" stroke="' + col + '" fill="none"/>'; });
    return s + '</svg>';
  }
  function textToGcode() { var slot = penPick.slot(), cmap = {}; cmap[penColor(slot)] = slot; return svgToGcode(toSVG(), calibMM.anchor, calibMM.left, calibMM.right, { yOffset: eraseToggle.checked ? ERASE_Y_OFFSET : 0, penDir: penDir(), colorMap: cmap }); }

  var penPick = makePenPicker(function () { regen(); });
  if (modeBar && modeBar.parentNode) modeBar.parentNode.insertBefore(penPick.el, modeBar.nextSibling);
  modeBar.addEventListener('click', function (e) { var b = e.target.closest('.seg'); if (!b) return; mode = b.dataset.mode; Array.prototype.forEach.call(modeBar.children, function (c) { c.classList.toggle('active', c === b); }); regen(); });
  [input, boldEl, sizeInput].forEach(function (el) { if (el) el.addEventListener('input', regen); });
  fontSel.addEventListener('change', regen);
  dlBtn.addEventListener('click', function () { if (!polylines.length) { showToast('Type some text first', 'error'); return; } var blob = new Blob([textToGcode()], { type: 'text/plain' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'text.gcode'; a.click(); showToast('G-code downloaded', 'success'); });
  sendBtn.addEventListener('click', async function () {
    if (!polylines.length) { showToast('Type some text first', 'error'); return; }
    if (!confirmSend()) return;
    var size = parseFloat(sizeInput.value) || 120, maxDim = size * Math.max(W, H) / H;
    var bounds = drawingFits(maxDim);
    if (!bounds.ok && !confirm('Heads up — ' + bounds.msg + '. The robot may not reach it. Send anyway?')) return;
    sendBtn.disabled = true;
    try { await streamDrawing(textToGcode()); showToast('Sent to robot — writing!', 'success'); }
    catch (e) { showToast('Send failed: ' + e.message, 'error'); }
    sendBtn.disabled = false;
  });

  regen();
})();

// Pen rotation direction (for the "carousel turns the wrong way" report)
var penInvert = document.getElementById('pen-invert');
if (penInvert) {
  penInvert.checked = localStorage.getItem('scribit_pen_invert') === '1';
  penInvert.addEventListener('change', function () {
    localStorage.setItem('scribit_pen_invert', penInvert.checked ? '1' : '0');
    showToast(penInvert.checked ? 'Pen rotation inverted' : 'Pen rotation normal', 'success');
  });
}

// ===== Tabbed navigation =====
(function tabs() {
  var bar = document.getElementById('tabs');
  if (!bar) return;
  var sections = document.querySelectorAll('section[data-tab]');
  function show(name) {
    Array.prototype.forEach.call(sections, function (s) { s.classList.toggle('hidden', s.dataset.tab !== name); });
    Array.prototype.forEach.call(bar.children, function (b) { b.classList.toggle('active', b.dataset.tab === name); });
    window.scrollTo(0, 0);
  }
  bar.addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) show(b.dataset.tab); });
  // Any element with data-goto (the Home screen cards / buttons) jumps to that tab.
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (g) show(g.dataset.goto); });
  show('home');
})();

// ===== First-run setup wizard =====
// Labeled "what to measure" illustration for the calibration wizard step. The ② / ③ dimension
// lines gently march (a "tape measure" feel) via the .cal-dim CSS animation.
var CALIB_ILLUS =
  '<svg viewBox="0 0 280 200" class="cal-illus" aria-label="what to measure">' +
  '<line x1="34" y1="34" x2="160" y2="124" stroke="#6f8fb0" stroke-width="1.5"/>' +
  '<line x1="246" y1="34" x2="160" y2="124" stroke="#6f8fb0" stroke-width="1.5"/>' +
  '<circle cx="34" cy="34" r="5" fill="#cfe0f0"/>' +
  '<circle cx="246" cy="34" r="5" fill="#cfe0f0"/>' +
  '<circle cx="160" cy="124" r="16" fill="none" stroke="#9fb6cc" stroke-width="2"/>' +
  '<circle cx="160" cy="124" r="3" fill="#9fb6cc"/>' +
  '<line x1="34" y1="18" x2="246" y2="18" stroke="#46c6f5" stroke-width="1"/>' +
  '<line x1="34" y1="14" x2="34" y2="22" stroke="#46c6f5" stroke-width="1"/>' +
  '<line x1="246" y1="14" x2="246" y2="22" stroke="#46c6f5" stroke-width="1"/>' +
  '<text x="140" y="12" fill="#46c6f5" font-size="11" text-anchor="middle">① anchor distance</text>' +
  '<line x1="34" y1="60" x2="160" y2="60" stroke="#46c6f5" stroke-width="1" stroke-dasharray="4 3" class="cal-dim"/>' +
  '<text x="97" y="74" fill="#46c6f5" font-size="11" text-anchor="middle">② from left</text>' +
  '<line x1="160" y1="34" x2="160" y2="124" stroke="#46c6f5" stroke-width="1" stroke-dasharray="4 3" class="cal-dim"/>' +
  '<text x="166" y="86" fill="#46c6f5" font-size="11">③ drop</text>' +
  '</svg>';

// Welcome/hero: the robot hanging between two anchors, gently swaying, drawing a curve that
// re-draws itself (CSS dash animation). The emotional "your robot is alive again" first frame.
var HERO_ILLUS =
  '<svg viewBox="0 0 280 178" class="su-illus" aria-hidden="true">' +
  '<circle cx="44" cy="26" r="5" fill="#cfe0f0"/>' +
  '<circle cx="236" cy="26" r="5" fill="#cfe0f0"/>' +
  '<g class="su-sway">' +
    '<line x1="44" y1="26" x2="140" y2="92" stroke="#6f8fb0" stroke-width="1.5"/>' +
    '<line x1="236" y1="26" x2="140" y2="92" stroke="#6f8fb0" stroke-width="1.5"/>' +
    '<rect x="116" y="78" width="48" height="40" rx="9" fill="rgba(70,198,245,0.08)" stroke="#46c6f5" stroke-width="2"/>' +
    '<circle cx="129" cy="96" r="3.2" fill="#6a3fb0"/>' +
    '<circle cx="140" cy="94" r="3.2" fill="#2faf5a"/>' +
    '<circle cx="151" cy="96" r="3.2" fill="#e23b3b"/>' +
    '<circle cx="140" cy="108" r="3.2" fill="#1a1a1a"/>' +
  '</g>' +
  '<path class="su-draw su-draw-a" d="M64 152 q76 -54 152 0" fill="none" stroke="#46c6f5" stroke-width="2.6" stroke-linecap="round"/>' +
  '</svg>';

// Mounting: robot hangs from two level anchors and sways slightly.
var MOUNT_ILLUS =
  '<svg viewBox="0 0 280 178" class="su-illus" aria-hidden="true">' +
  '<line x1="50" y1="30" x2="230" y2="30" stroke="#46c6f5" stroke-width="1" stroke-dasharray="5 4"/>' +
  '<text x="140" y="20" fill="#46c6f5" font-size="10" text-anchor="middle">level · about 2.5 m apart</text>' +
  '<circle cx="50" cy="30" r="6" fill="#cfe0f0"/>' +
  '<circle cx="230" cy="30" r="6" fill="#cfe0f0"/>' +
  '<g class="su-sway">' +
    '<line x1="50" y1="30" x2="140" y2="108" stroke="#6f8fb0" stroke-width="1.5"/>' +
    '<line x1="230" y1="30" x2="140" y2="108" stroke="#6f8fb0" stroke-width="1.5"/>' +
    '<rect x="118" y="94" width="44" height="36" rx="8" fill="rgba(70,198,245,0.08)" stroke="#46c6f5" stroke-width="2"/>' +
    '<circle cx="140" cy="112" r="4" fill="#9fb6cc"/>' +
  '</g>' +
  '</svg>';

// Pen loading: the 4-slot carousel with a pulsing ring on slot 1.
var PEN_ILLUS =
  '<svg viewBox="0 0 280 178" class="su-illus" aria-hidden="true">' +
  '<g transform="translate(140,92)">' +
    '<circle r="46" fill="none" stroke="#9fb6cc" stroke-width="2"/>' +
    '<circle cx="0" cy="-46" r="9" fill="#6a3fb0"/>' +
    '<circle cx="46" cy="0" r="8" fill="#2faf5a"/>' +
    '<circle cx="0" cy="46" r="8" fill="#e23b3b"/>' +
    '<circle cx="-46" cy="0" r="8" fill="#1a1a1a" stroke="#456" stroke-width="0.5"/>' +
    '<circle class="su-ring" cx="0" cy="-46" r="9" fill="none" stroke="#46c6f5" stroke-width="2"/>' +
  '</g>' +
  '<text x="140" y="168" fill="#9fb6cc" font-size="10" text-anchor="middle">slot 1 = the one at the back opening</text>' +
  '</svg>';

// First draw: a star that draws itself, on a loop.
var DRAW_ILLUS =
  '<svg viewBox="0 0 280 178" class="su-illus" aria-hidden="true">' +
  '<path class="su-draw su-draw-b" d="M140 46 L151 76 L183 77 L158 97 L167 128 L140 110 L113 128 L122 97 L97 77 L129 76 Z" fill="none" stroke="#46c6f5" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

(function setupWizard() {
  var modal = document.getElementById('setup-modal'); if (!modal) return;
  var titleEl = document.getElementById('setup-title'), bodyEl = document.getElementById('setup-body'), numEl = document.getElementById('setup-num');
  var backBtn = document.getElementById('setup-back'), nextBtn = document.getElementById('setup-next'), skipBtn = document.getElementById('setup-skip');
  var STEPS = [
    { t: 'Welcome to Scribit Liberated', svg: HERO_ILLUS, h: 'Your robot is back — running <b>100% on your own wall</b>: no cloud, no account, no permission. This quick guide takes it from a bare wall to its first drawing in about <b>5 minutes</b>. You can reopen it anytime via “Setup guide” at the bottom.' },
    { t: 'Mount the robot', svg: MOUNT_ILLUS, h: 'Fix two anchors on the wall, <b>level with each other</b> and roughly <b>2.5 m apart</b>, and hang the Scribit on its strings. <b>No more factory-template limits</b> — the upgraded firmware works at any anchor distance, so mount it however suits your wall; you just measure it next.' },
    { t: 'Calibrate', svg: CALIB_ILLUS, h: 'Open the <b>Calibrate</b> tab. Measure the three things shown above: <b>① anchor distance</b>, <b>② horizontal from the left anchor</b> to the pen, and <b>③ vertical drop</b> from the anchor line to the pen (mm or inches). Press <b>Apply</b>, then <b>Save</b> it as a wall so you never redo it.' },
    { t: 'Load a pen & home it', svg: PEN_ILLUS, h: 'Slide a marker into the <b>pen-1 slot</b> (the one that lines up with the opening on the back). In the <b>Controls</b> tab, press <b>Home Pen</b> — the cylinder seats pen 1 in the up position, ready to draw.' },
    { t: 'Draw something', svg: DRAW_ILLUS, h: 'Open <b>Generative</b>, the <b>Gallery</b>, or <b>Image</b>, pick or tune a design, and press <b>SEND / DRAW NOW!</b> Watch your Scribit come back to life. 🎨' }
  ];
  var i = 0;
  function render() {
    var s = STEPS[i];
    numEl.textContent = 'Step ' + (i + 1) + ' / ' + STEPS.length;
    titleEl.textContent = s.t;
    bodyEl.innerHTML = (s.svg || '') + s.h;
    bodyEl.classList.remove('su-in'); void bodyEl.offsetWidth; bodyEl.classList.add('su-in');   // replay fade-in
    backBtn.style.visibility = i === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = i === STEPS.length - 1 ? 'Finish' : 'Next';
  }
  function close() { modal.classList.add('hidden'); localStorage.setItem('scribit_setup_done', '1'); }
  function open() { i = 0; render(); modal.classList.remove('hidden'); }
  nextBtn.addEventListener('click', function () { if (i < STEPS.length - 1) { i++; render(); } else close(); });
  backBtn.addEventListener('click', function () { if (i > 0) { i--; render(); } });
  skipBtn.addEventListener('click', close);
  var openLink = document.getElementById('setup-open');
  if (openLink) openLink.addEventListener('click', function (e) { e.preventDefault(); open(); });
  var homeStart = document.getElementById('home-start');   // Home screen "Get started" launches the same wizard
  if (homeStart) homeStart.addEventListener('click', open);
  if (!localStorage.getItem('scribit_setup_done')) open();
})();

// Init
pollStatus();
setInterval(pollStatus, 3000);

// ===== Generative Art Studio =====
(function genArt() {
  var canvas = document.getElementById('gen-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var styleBar = document.getElementById('gen-style');
  var paramsBox = document.getElementById('gen-params');
  var sizeInput = document.getElementById('gen-size');
  var diceBtn = document.getElementById('gen-dice');
  var info = document.getElementById('gen-info');
  var sendBtn = document.getElementById('gen-send');
  var dlBtn = document.getElementById('gen-download');

  var seed = (Math.random() * 1e9) | 0;
  var currentStyle = 'spiro';
  var polylines = [];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var GEN = {
    spiro: { name: 'Spirograph', params: [
      { key: 'R', label: 'Outer wheel', min: 30, max: 100, step: 1, val: 72 },
      { key: 'r', label: 'Inner wheel', min: 3, max: 95, step: 1, val: 31 },
      { key: 'd', label: 'Pen offset', min: 5, max: 120, step: 1, val: 68 },
      { key: 'turns', label: 'Turns', min: 8, max: 160, step: 1, val: 50 }
    ], gen: genSpiro },
    flow: { name: 'Flow Field', params: [
      { key: 'lines', label: 'Lines', min: 20, max: 220, step: 5, val: 90 },
      { key: 'len', label: 'Length', min: 20, max: 200, step: 5, val: 90 },
      { key: 'swirl', label: 'Swirl', min: 1, max: 18, step: 1, val: 6 }
    ], gen: genFlow },
    maze: { name: 'Maze', params: [
      { key: 'cells', label: 'Grid size', min: 6, max: 44, step: 1, val: 20 }
    ], gen: genMaze },
    hilbert: { name: 'Hilbert', params: [
      { key: 'order', label: 'Order', min: 2, max: 7, step: 1, val: 5 }
    ], gen: genHilbert },
    waves: { name: 'Waves', params: [
      { key: 'lines', label: 'Lines', min: 5, max: 80, step: 1, val: 28 },
      { key: 'amp', label: 'Amplitude', min: 2, max: 40, step: 1, val: 14 },
      { key: 'freq', label: 'Frequency', min: 1, max: 20, step: 1, val: 6 }
    ], gen: genWaves },
    truchet: { name: 'Truchet', params: [
      { key: 'cells', label: 'Grid', min: 4, max: 30, step: 1, val: 12 }
    ], gen: genTruchet }
  };

  function paramVals() {
    var v = {};
    GEN[currentStyle].params.forEach(function (p) {
      var el = document.getElementById('gp-' + p.key);
      v[p.key] = el ? parseFloat(el.value) : p.val;
    });
    return v;
  }

  function fit(polys, minx, miny, maxx, maxy, size) {
    var w = (maxx - minx) || 1, h = (maxy - miny) || 1, sc = size / Math.max(w, h);
    var ox = (size - w * sc) / 2, oy = (size - h * sc) / 2;
    return polys.map(function (poly) {
      return poly.map(function (pt) { return [(pt[0] - minx) * sc + ox, (pt[1] - miny) * sc + oy]; });
    });
  }

  function genSpiro(p, size) {
    var k = p.R - p.r, d = p.d, steps = Math.max(600, p.turns * 60), tmax = p.turns * Math.PI * 2;
    var pts = [], minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (var i = 0; i <= steps; i++) {
      var t = tmax * i / steps;
      var x = k * Math.cos(t) + d * Math.cos(k / p.r * t);
      var y = k * Math.sin(t) - d * Math.sin(k / p.r * t);
      pts.push([x, y]);
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
    return fit([pts], minx, miny, maxx, maxy, size);
  }

  function genFlow(p, size, rng) {
    var s = p.swirl * 0.0009 + 0.001, sx = rng() * 1000, sy = rng() * 1000, step = size / 120;
    function ang(x, y) { return (Math.sin(x * s + sx) + Math.cos(y * s - sy) + 0.6 * Math.sin((x + y) * s * 0.7)) * Math.PI; }
    var polys = [];
    for (var l = 0; l < p.lines; l++) {
      var x = rng() * size, y = rng() * size, poly = [[x, y]];
      for (var i = 0; i < p.len; i++) {
        var a = ang(x, y); x += Math.cos(a) * step; y += Math.sin(a) * step;
        if (x < 0 || y < 0 || x > size || y > size) break;
        poly.push([x, y]);
      }
      if (poly.length > 3) polys.push(poly);
    }
    return polys;
  }

  function genMaze(p, size, rng) {
    var n = Math.round(p.cells), cell = size / n;
    var grid = []; for (var i = 0; i < n * n; i++) grid.push({ v: false, w: [true, true, true, true] });
    function idx(cx, cy) { return cy * n + cx; }
    var dirs = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
    var stack = [[0, 0]]; grid[0].v = true;
    while (stack.length) {
      var c = stack[stack.length - 1], cx = c[0], cy = c[1], opts = [];
      dirs.forEach(function (d) {
        var nx = cx + d[0], ny = cy + d[1];
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && !grid[idx(nx, ny)].v) opts.push(d);
      });
      if (!opts.length) { stack.pop(); continue; }
      var d = opts[(rng() * opts.length) | 0], nx = cx + d[0], ny = cy + d[1];
      grid[idx(cx, cy)].w[d[2]] = false; grid[idx(nx, ny)].w[d[3]] = false;
      grid[idx(nx, ny)].v = true; stack.push([nx, ny]);
    }
    var polys = [];
    for (var cy = 0; cy < n; cy++) for (var cx = 0; cx < n; cx++) {
      var g = grid[idx(cx, cy)], x0 = cx * cell, y0 = cy * cell, x1 = x0 + cell, y1 = y0 + cell;
      if (g.w[0]) polys.push([[x0, y0], [x1, y0]]);
      if (g.w[1]) polys.push([[x1, y0], [x1, y1]]);
      if (g.w[2]) polys.push([[x0, y1], [x1, y1]]);
      if (g.w[3]) polys.push([[x0, y0], [x0, y1]]);
    }
    return polys;
  }

  function genHilbert(p, size) {
    var order = Math.round(p.order), n = 1 << order, total = n * n, pts = [];
    function d2xy(nn, d) {
      var rx, ry, t = d, x = 0, y = 0;
      for (var s = 1; s < nn; s *= 2) {
        rx = 1 & Math.floor(t / 2);
        ry = 1 & (t ^ rx);
        if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } var tmp = x; x = y; y = tmp; }
        x += s * rx; y += s * ry; t = Math.floor(t / 4);
      }
      return [x, y];
    }
    for (var d = 0; d < total; d++) pts.push(d2xy(n, d));
    var sc = size / ((n - 1) || 1);
    return [pts.map(function (q) { return [q[0] * sc, q[1] * sc]; })];
  }

  function genWaves(p, size, rng) {
    var lines = Math.round(p.lines), amp = p.amp, freq = p.freq * 0.018, ph = rng() * 6.28, polys = [];
    for (var i = 0; i < lines; i++) {
      var y0 = (i + 0.5) / lines * size, poly = [];
      for (var x = 0; x <= size; x += 2) {
        var dy = amp * (Math.sin(x * freq + i * 0.4 + ph) + 0.5 * Math.sin(x * freq * 0.5 - i * 0.2));
        poly.push([x, y0 + dy]);
      }
      polys.push(poly);
    }
    return polys;
  }

  function genTruchet(p, size, rng) {
    var n = Math.round(p.cells), cell = size / n, r = cell / 2, polys = [];
    function arc(cx, cy, a0, a1) {
      var pts = [], steps = 8;
      for (var k = 0; k <= steps; k++) { var a = a0 + (a1 - a0) * k / steps; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      return pts;
    }
    for (var cy = 0; cy < n; cy++) for (var cx = 0; cx < n; cx++) {
      var x0 = cx * cell, y0 = cy * cell;
      if (rng() < 0.5) {
        polys.push(arc(x0, y0, 0, Math.PI / 2));
        polys.push(arc(x0 + cell, y0 + cell, Math.PI, 1.5 * Math.PI));
      } else {
        polys.push(arc(x0 + cell, y0, Math.PI / 2, Math.PI));
        polys.push(arc(x0, y0 + cell, 1.5 * Math.PI, 2 * Math.PI));
      }
    }
    return polys;
  }

  function regenerate() {
    var size = parseFloat(sizeInput.value) || 300;
    polylines = GEN[currentStyle].gen(paramVals(), size, mulberry32(seed));
    draw(size);
    var pts = polylines.reduce(function (a, p) { return a + p.length; }, 0);
    info.innerHTML = 'Style: <b>' + GEN[currentStyle].name + '</b><br>Strokes: <b>' + polylines.length + '</b> · points ' + pts + '<br>Size: <b>' + size.toFixed(0) + '</b> mm';
  }

  function multiOn() { var el = document.getElementById('gen-multicolor'); return !!(el && el.checked); }
  function bandOf(poly, size) {
    var ax = 0; poly.forEach(function (p) { ax += p[0]; }); ax /= poly.length;
    return Math.max(0, Math.min(3, Math.floor(ax / size * 4)));
  }
  function orderedPolys(size) {
    if (!multiOn()) return polylines.map(function (p) { return { poly: p, band: 0 }; });
    // band by average x, sorted so each pen draws contiguously (only 3 pen changes)
    return polylines.map(function (p) { return { poly: p, band: bandOf(p, size) }; })
      .sort(function (a, b) { return a.band - b.band; });
  }

  function draw(size) {
    var W = canvas.width, H = canvas.height, m = 10, sc = (W - 2 * m) / size, multi = multiOn();
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowBlur = 4;
    orderedPolys(size).forEach(function (o) {
      var col = multi ? penColor(o.band + 1) : penColor(1);
      ctx.strokeStyle = col; ctx.shadowColor = col;
      ctx.beginPath();
      o.poly.forEach(function (pt, i) {
        var x = m + pt[0] * sc, y = m + pt[1] * sc;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
  }

  function toSVG(size) {
    var multi = multiOn();
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">';
    orderedPolys(size).forEach(function (o) {
      var col = multi ? penColor(o.band + 1) : penColor(1);
      s += '<path d="M ' + o.poly.map(function (pt) { return pt[0].toFixed(2) + ' ' + pt[1].toFixed(2); }).join(' L ') + '" stroke="' + col + '" fill="none"/>';
    });
    return s + '</svg>';
  }

  function genToGcode() {
    var size = parseFloat(sizeInput.value) || 300;
    var anchor = calibMM.anchor, L = calibMM.left, R = calibMM.right;
    var cmap = {}; for (var i = 1; i <= 4; i++) cmap[penColor(i)] = i;   // force exact band -> slot routing
    return svgToGcode(toSVG(size), anchor, L, R,
      { yOffset: eraseToggle.checked ? ERASE_Y_OFFSET : 0, penDir: penDir(), colorMap: cmap });
  }

  document.addEventListener('pens-changed', function () { regenerate(); });

  function buildParams() {
    paramsBox.innerHTML = '';
    GEN[currentStyle].params.forEach(function (p) {
      var row = document.createElement('div'); row.className = 'gen-slider';
      var lab = document.createElement('label');
      lab.innerHTML = p.label + ' <span id="gv-' + p.key + '">' + p.val + '</span>';
      var inp = document.createElement('input');
      inp.type = 'range'; inp.id = 'gp-' + p.key;
      inp.min = p.min; inp.max = p.max; inp.step = p.step || 1; inp.value = p.val;
      inp.addEventListener('input', function () {
        document.getElementById('gv-' + p.key).textContent = inp.value;
        regenerate();
      });
      row.appendChild(lab); row.appendChild(inp); paramsBox.appendChild(row);
    });
  }

  styleBar.addEventListener('click', function (e) {
    var b = e.target.closest('.seg'); if (!b) return;
    currentStyle = b.dataset.style;
    Array.prototype.forEach.call(styleBar.children, function (c) { c.classList.toggle('active', c === b); });
    buildParams(); regenerate();
  });
  sizeInput.addEventListener('input', regenerate);
  var mcEl = document.getElementById('gen-multicolor');
  if (mcEl) mcEl.addEventListener('change', regenerate);

  diceBtn.addEventListener('click', function () {
    seed = (Math.random() * 1e9) | 0;
    var rng = mulberry32(seed);
    GEN[currentStyle].params.forEach(function (p) {
      var el = document.getElementById('gp-' + p.key);
      var step = p.step || 1;
      var v = Math.round((p.min + rng() * (p.max - p.min)) / step) * step;
      el.value = v;
      document.getElementById('gv-' + p.key).textContent = el.value;
    });
    regenerate();
  });

  dlBtn.addEventListener('click', function () {
    if (!polylines.length) { showToast('Nothing to download', 'error'); return; }
    var blob = new Blob([genToGcode()], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = currentStyle + '-art.gcode';
    a.click();
    showToast('G-code downloaded', 'success');
  });

  sendBtn.addEventListener('click', async function () {
    if (!polylines.length) { showToast('Nothing to send', 'error'); return; }
    if (!confirmSend()) return;
    var bounds = drawingFits(parseFloat(sizeInput.value) || 300);
    if (!bounds.ok && !confirm('Heads up — ' + bounds.msg + '. The robot may not reach it. Send anyway?')) return;
    sendBtn.disabled = true;
    try {
      await streamDrawing(genToGcode());
      showToast('Sent to robot — drawing!', 'success');
    } catch (e) {
      showToast('Send failed: ' + e.message, 'error');
    }
    sendBtn.disabled = false;
  });

  buildParams();
  regenerate();
})();

// ===== Design Gallery =====
(function gallery() {
  var grid = document.getElementById('gallery-grid');
  if (!grid) return;
  var detail = document.getElementById('gallery-detail');
  var canvas = document.getElementById('gallery-canvas'), ctx = canvas.getContext('2d');
  var info = document.getElementById('gallery-info');
  var sizeInput = document.getElementById('gallery-size');
  var dlBtn = document.getElementById('gallery-download'), sendBtn = document.getElementById('gallery-send');
  var D = 300, current = null;
  var pick = makePenPicker(function () { draw(); });

  var CX = 150, CY = 150;
  function mul32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function circ(cx, cy, r, st) { var p = []; st = st || 72; for (var i = 0; i <= st; i++) { var t = i / st * 2 * Math.PI; p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } return p; }
  function ngon(cx, cy, r, n, rot) { var p = []; rot = (rot == null ? -Math.PI / 2 : rot); for (var i = 0; i <= n; i++) { var t = rot + i / n * 2 * Math.PI; p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } return p; }
  function starP(cx, cy, r, n, m, rot) { var p = []; rot = (rot == null ? -Math.PI / 2 : rot); for (var i = 0; i <= n; i++) { var t = rot + (i * m % n) / n * 2 * Math.PI; p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } return p; }
  function arc(cx, cy, r, a0, a1, st) { var p = []; st = st || 40; for (var i = 0; i <= st; i++) { var t = a0 + (a1 - a0) * i / st; p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } return p; }
  function petalLoop(cx, cy, a, L, W) { var pts = [], c = Math.cos(a), s = Math.sin(a); function put(l, w) { pts.push([cx + (l * c - w * s), cy + (l * s + w * c)]); } for (var u = 0; u <= 1.001; u += 0.1) put(L * u, W * Math.sin(Math.PI * u)); for (var u2 = 1; u2 >= 0; u2 -= 0.1) put(L * u2, -W * Math.sin(Math.PI * u2)); return pts; }

  // --- Geometric ---
  function gConcentric() { var p = []; for (var r = 18; r <= 140; r += 16) p.push(circ(CX, CY, r)); return p; }
  function gSpiral() { var poly = []; for (var a = 0; a <= 360 * 9; a += 4) { var t = a * Math.PI / 180, r = a / (360 * 9) * 142; poly.push([CX + r * Math.cos(t), CY + r * Math.sin(t)]); } return [poly]; }
  function gPolygons() { var p = []; for (var s = 3; s <= 9; s++) p.push(ngon(CX, CY, 24 + (s - 3) * 19, s)); return p; }
  function gStar5() { return [starP(CX, CY, 140, 5, 2)]; }
  function gStar7() { return [starP(CX, CY, 140, 7, 3)]; }
  function gGrid() { var p = []; for (var x = 30; x <= 270; x += 20) p.push([[x, 30], [x, 270]]); for (var y = 30; y <= 270; y += 20) p.push([[30, y], [270, y]]); return p; }
  function gHex() { var p = [], s = 28, h = s * Math.sqrt(3); for (var col = 0; col < 7; col++) for (var row = 0; row < 7; row++) { var cx = 36 + col * s * 1.5, cy = 36 + row * h + (col % 2 ? h / 2 : 0); if (cx < 285 && cy < 285) p.push(ngon(cx, cy, s * 0.9, 6, 0)); } return p; }
  function gSpiro() { var R = 110, r = 44, d = 70, per = 2 * Math.PI * r / gcd(R, r), poly = []; for (var t = 0; t <= per; t += 0.04) poly.push([CX + (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t), CY + (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t)]); return [poly]; }
  function gFlowerLife() { var p = [circ(CX, CY, 40)]; for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; p.push(circ(CX + 40 * Math.cos(a), CY + 40 * Math.sin(a), 40)); } return p; }
  function gTarget() { var p = []; for (var r = 20; r <= 140; r += 24) p.push(circ(CX, CY, r)); p.push([[10, CY], [290, CY]]); p.push([[CX, 10], [CX, 290]]); return p; }

  // --- Mandala ---
  function rose(k) { return function () { var poly = [], turns = (k % 2 ? 1 : 2); for (var a = 0; a <= 360 * turns; a += 1) { var t = a * Math.PI / 180, r = 142 * Math.cos(k * t); poly.push([CX + r * Math.cos(t), CY + r * Math.sin(t)]); } return [poly]; }; }
  function mLotus() { var p = [], n = 12; for (var i = 0; i < n; i++) p.push(petalLoop(CX, CY, i / n * 2 * Math.PI, 132, 26)); p.push(circ(CX, CY, 22)); return p; }
  function mLayered() { var p = mLotus(); for (var i = 0; i < 12; i++) p.push(petalLoop(CX, CY, (i + 0.5) / 12 * 2 * Math.PI, 84, 18)); return p; }
  function mRings() { var p = []; for (var r = 20; r <= 140; r += 18) p.push(ngon(CX, CY, r, 6 + Math.round(r / 20), r * 0.04)); return p; }

  // --- Celestial ---
  function cSun() { var p = [circ(CX, CY, 42)]; for (var k = 0; k < 16; k++) { var a = k / 16 * 2 * Math.PI; p.push([[CX + 52 * Math.cos(a), CY + 52 * Math.sin(a)], [CX + 74 * Math.cos(a), CY + 74 * Math.sin(a)]]); } return p; }
  function cCrescent() { return [circ(CX, CY, 82), circ(CX + 36, CY - 12, 70)]; }
  function cMoonPhases() { var p = []; for (var i = 0; i < 5; i++) { var cx = 42 + i * 56, k = (i - 2) / 2; p.push(circ(cx, 150, 22)); var term = arc(cx, 150, 22, -Math.PI / 2, Math.PI / 2, 20).map(function (pt) { return [cx + (pt[0] - cx) * k, pt[1]]; }); p.push(term); } return p; }
  function cStar6() { return [starP(CX, CY, 140, 6, 2)]; }
  function cStarburst() { var p = []; for (var k = 0; k < 24; k++) { var a = k / 24 * 2 * Math.PI, r = (k % 2 ? 140 : 90); p.push([[CX, CY], [CX + r * Math.cos(a), CY + r * Math.sin(a)]]); } return p; }
  function cConstellation(seed) { return function () { var rng = mul32(seed), pts = [], n = 7, i; for (i = 0; i < n; i++) pts.push([40 + rng() * 220, 40 + rng() * 220]); var p = []; for (i = 0; i < n - 1; i++) p.push([pts[i], pts[i + 1]]); pts.forEach(function (pt) { p.push(circ(pt[0], pt[1], 3, 10)); }); return p; }; }
  function cOrbits() { var p = []; for (var i = 0; i < 3; i++) { var poly = [], rx = 50 + i * 38, ry = 30 + i * 20; for (var a = 0; a <= 360; a += 5) { var t = a * Math.PI / 180; poly.push([CX + rx * Math.cos(t), CY + ry * Math.sin(t)]); } p.push(poly); } p.push(circ(CX, CY, 12)); return p; }

  // --- Botanical ---
  function bTree(seed) { return function () { var rng = mul32(seed), segs = []; function br(x, y, ang, len, d) { var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len; segs.push([[x, y], [x2, y2]]); if (d <= 0) return; var sp = 0.36 + rng() * 0.22; br(x2, y2, ang - sp, len * 0.72, d - 1); br(x2, y2, ang + sp, len * 0.72, d - 1); } br(150, 286, -Math.PI / 2, 66, 8); return segs; }; }
  function bSunflower() { var p = [], ga = Math.PI * (3 - Math.sqrt(5)); for (var i = 0; i < 150; i++) { var r = 8 * Math.sqrt(i), a = i * ga; if (r > 68) break; p.push(circ(CX + r * Math.cos(a), CY + r * Math.sin(a), 2.4, 8)); } for (var k = 0; k < 20; k++) p.push(petalLoop(CX, CY, k / 20 * 2 * Math.PI, 135, 14)); return p; }
  function bFlower() { var p = []; for (var k = 0; k < 6; k++) p.push(petalLoop(CX, 118, k / 6 * 2 * Math.PI, 68, 22)); p.push(circ(CX, 118, 18)); p.push([[CX, 136], [CX, 286]]); p.push([[CX, 205], [CX - 30, 185]]); p.push([[CX, 232], [CX + 30, 212]]); return p; }
  function bLeaf() { var out = [], u; for (u = 0; u <= 1.001; u += 0.04) out.push([150 + 55 * Math.sin(Math.PI * u), 40 + 220 * u]); for (u = 1; u >= 0; u -= 0.04) out.push([150 - 55 * Math.sin(Math.PI * u), 40 + 220 * u]); var res = [out, [[150, 40], [150, 260]]]; for (u = 0.16; u < 0.9; u += 0.13) { var y = 40 + 220 * u, w = 55 * Math.sin(Math.PI * u); res.push([[150, y], [150 + w * 0.8, y - 18]]); res.push([[150, y], [150 - w * 0.8, y - 18]]); } return res; }
  function bCactus() { function stad(cx, t, b, w) { var p = arc(cx, t, w, Math.PI, 2 * Math.PI, 16); p.push([cx + w, b]); p = p.concat(arc(cx, b, w, 0, Math.PI, 16)); p.push([cx - w, t]); return p; } return [stad(150, 120, 275, 26), stad(112, 150, 205, 15), stad(188, 138, 200, 15)]; }
  function bFloralBorder() { var p = []; for (var x = 40; x <= 260; x += 44) { for (var k = 0; k < 5; k++) p.push(petalLoop(x, 150, k / 5 * 2 * Math.PI, 18, 7)); p.push(circ(x, 150, 5)); } p.push([[20, 150], [280, 150]]); return p; }

  // --- Landscape ---
  function lMountains(seed) { return function () { var rng = mul32(seed), p = []; for (var layer = 0; layer < 3; layer++) { var base = 150 + layer * 38, poly = [[20, base]], x = 20; while (x < 280) { x += 14 + rng() * 22; poly.push([x, base - (70 - layer * 14) - rng() * (50 - layer * 12)]); } poly.push([280, base]); p.push(poly); } p.push(circ(215, 80, 26)); return p; }; }
  function lHills() { var p = []; for (var layer = 0; layer < 3; layer++) { var poly = [], base = 160 + layer * 30; for (var x = 20; x <= 280; x += 4) poly.push([x, base - 26 * Math.sin(x * 0.018 + layer)]); p.push(poly); } p.push(circ(90, 90, 24)); return p; }
  function lWaves() { var p = []; for (var row = 0; row < 16; row++) { var y0 = 24 + row * 16, poly = []; for (var x = 18; x <= 282; x += 3) poly.push([x, y0 + 9 * Math.sin(x * 0.05 + row * 0.55)]); p.push(poly); } return p; }
  function lForest() { var p = []; for (var i = 0; i < 8; i++) { var x = 35 + i * 32, base = 255, h = 80 + (i % 3) * 22; p.push([[x - 22, base], [x, base - h], [x + 22, base], [x - 22, base]]); p.push([[x, base], [x, base + 14]]); } return p; }

  // --- Patterns ---
  function pHearts() { var p = []; for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) { var cx = 40 + gx * 55, cy = 40 + gy * 55, poly = []; for (var a = 0; a <= 360; a += 12) { var t = a * Math.PI / 180; poly.push([cx + 18 * Math.pow(Math.sin(t), 3), cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } p.push(poly); } return p; }
  function pStars() { var p = []; for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) p.push(starP(40 + gx * 55, 40 + gy * 55, 20, 5, 2)); return p; }
  function pChecker() { var p = [], s = 30; for (var gy = 0; gy < 8; gy++) for (var gx = 0; gx < 8; gx++) if ((gx + gy) % 2) { var x = 30 + gx * s, y = 30 + gy * s; for (var l = 0; l < s; l += 5) p.push([[x, y + l], [x + s, y + l]]); } return p; }
  function pFloral() { var p = []; for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 5; gx++) { var cx = 40 + gx * 55, cy = 40 + gy * 55; for (var k = 0; k < 5; k++) p.push(petalLoop(cx, cy, k / 5 * 2 * Math.PI, 18, 7)); p.push(circ(cx, cy, 5)); } return p; }
  function pTriangles() { var p = [], s = 40; for (var gy = 0; gy < 7; gy++) for (var gx = 0; gx < 7; gx++) { var x = 20 + gx * s, y = 20 + gy * s; if (x + s > 282 || y + s > 282) continue; if ((gx + gy) % 2) p.push([[x, y], [x + s, y], [x, y + s], [x, y]]); else p.push([[x + s, y], [x + s, y + s], [x, y + s], [x + s, y]]); } return p; }
  function pScallops() { var p = []; for (var row = 0; row < 6; row++) { var y = 40 + row * 40; for (var x = 30; x <= 250; x += 40) p.push(arc(x + 20, y, 22, Math.PI, 2 * Math.PI, 16)); } return p; }

  // --- Abstract ---
  function aLissajous(a, b, d) { return function () { var poly = []; for (var t = 0; t <= 2 * Math.PI + 0.05; t += 0.015) poly.push([CX + 130 * Math.sin(a * t + d), CY + 130 * Math.sin(b * t)]); return [poly]; }; }
  function aHarmono(seed) { return function () { var rng = mul32(seed), f1 = 2 + ((rng() * 3) | 0), f2 = 2 + ((rng() * 3) | 0), p1 = rng() * 6, p2 = rng() * 6, poly = []; for (var t = 0; t < 220; t += 0.04) { var e = Math.exp(-0.004 * t); poly.push([CX + 120 * e * Math.sin(t * f1 + p1), CY + 120 * e * Math.sin(t * f2 + p2)]); } return [poly]; }; }
  function aInterCircles() { var p = []; for (var k = 0; k < 9; k++) { var a = k / 9 * 2 * Math.PI; p.push(circ(CX + 40 * Math.cos(a), CY + 40 * Math.sin(a), 70)); } return p; }
  function aFlow(seed) { return function () { var rng = mul32(seed), p = []; for (var i = 0; i < 26; i++) { var x = 20 + rng() * 260, y = 20 + rng() * 260, poly = [[x, y]]; for (var s = 0; s < 44; s++) { var ang = Math.sin(x * 0.02) * Math.cos(y * 0.02) * Math.PI * 2; x += Math.cos(ang) * 6; y += Math.sin(ang) * 6; if (x < 10 || x > 290 || y < 10 || y > 290) break; poly.push([x, y]); } if (poly.length > 2) p.push(poly); } return p; }; }

  // --- Holiday ---
  function hSnowflake() { var p = []; for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3, c = Math.cos(a), s = Math.sin(a); var R = function (x, y) { return [CX + x * c - y * s, CY + x * s + y * c]; }; p.push([R(0, 0), R(0, -130)]); for (var b = 40; b <= 110; b += 24) { p.push([R(0, -b), R(22, -b - 18)]); p.push([R(0, -b), R(-22, -b - 18)]); } } return p; }
  function hTree() { var p = []; p.push([[150, 40], [110, 120], [150, 120], [100, 180], [150, 180], [90, 240], [210, 240], [150, 180], [200, 180], [150, 120], [190, 120], [150, 40]]); p.push([[140, 240], [140, 270], [160, 270], [160, 240]]); p.push(starP(150, 38, 12, 5, 2)); return p; }
  function hHeart() { var poly = []; for (var a = 0; a <= 360; a += 2) { var t = a * Math.PI / 180; poly.push([150 + 5.6 * 16 * Math.pow(Math.sin(t), 3), 150 - 6 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } return [poly]; }
  function hPumpkin() { var p = []; for (var dx = -1; dx <= 1; dx++) { var poly = [], rx = 30 + (dx === 0 ? 14 : 0); for (var a = 0; a <= 360; a += 8) { var t = a * Math.PI / 180; poly.push([150 + dx * 22 + rx * Math.cos(t) * 0.8, 170 + 46 * Math.sin(t)]); } p.push(poly); } p.push([[150, 126], [150, 106]]); return p; }

  // --- Kids ---
  function kBalloon() { var p = [circ(150, 110, 58)]; p.push([[150, 168], [146, 176], [154, 176], [150, 168]]); p.push([[150, 176], [162, 220], [140, 268]]); return p; }
  function kRocket() { var p = []; p.push([[150, 40], [125, 92], [125, 210], [175, 210], [175, 92], [150, 40]]); p.push(circ(150, 122, 16)); p.push([[125, 180], [100, 232], [125, 210]]); p.push([[175, 180], [200, 232], [175, 210]]); for (var k = 0; k < 3; k++) p.push([[140 + k * 10, 212], [140 + k * 10, 248]]); return p; }
  function kCloud() { var p = [arc(120, 150, 30, Math.PI, 2 * Math.PI, 16), arc(160, 150, 40, Math.PI, 2 * Math.PI, 16), arc(200, 150, 28, Math.PI, 2 * Math.PI, 16)]; p.push([[90, 150], [228, 150]]); for (var k = 0; k < 3; k++) p.push(starP(110 + k * 45, 215 + (k % 2 ? 18 : 0), 12, 5, 2)); return p; }
  function kFish() { var body = [], a; for (a = 0; a <= 360; a += 8) { var t = a * Math.PI / 180; body.push([150 + 70 * Math.cos(t), 150 + 38 * Math.sin(t)]); } var p = [body]; p.push([[210, 150], [252, 118], [252, 182], [210, 150]]); p.push(circ(118, 140, 5)); return p; }
  function kWhale() { var body = [], a; for (a = 20; a <= 340; a += 8) { var t = a * Math.PI / 180; body.push([150 + 80 * Math.cos(t), 162 + 46 * Math.sin(t)]); } var p = [body]; p.push([[78, 150], [52, 124], [60, 162], [78, 162]]); p.push(arc(172, 118, 18, Math.PI, 2 * Math.PI, 12)); p.push(circ(196, 150, 4)); return p; }
  function kRainbow() { var p = []; for (var r = 120; r >= 72; r -= 14) p.push(arc(150, 205, r, Math.PI, 2 * Math.PI, 30)); return p; }

  // --- Animals (simple / single-line) ---
  function anButterfly() { var p = [[[150, 102], [150, 200]]]; p.push([[150, 102], [134, 80]]); p.push([[150, 102], [166, 80]]); p.push(petalLoop(150, 122, -Math.PI * 0.72, 72, 42)); p.push(petalLoop(150, 122, -Math.PI * 0.28, 72, 42)); p.push(petalLoop(150, 150, Math.PI * 0.74, 56, 32)); p.push(petalLoop(150, 150, Math.PI * 0.26, 56, 32)); return p; }
  function anCat() { var p = [circ(150, 155, 78)]; p.push([[96, 100], [80, 42], [136, 86]]); p.push([[204, 100], [220, 42], [164, 86]]); p.push(circ(126, 148, 8, 14)); p.push(circ(174, 148, 8, 14)); p.push([[145, 170], [155, 170], [150, 178], [145, 170]]); p.push([[150, 174], [98, 164]]); p.push([[150, 176], [98, 182]]); p.push([[150, 174], [202, 164]]); p.push([[150, 176], [202, 182]]); return p; }
  function anBird() { var body = [], a; for (a = 0; a <= 360; a += 8) { var t = a * Math.PI / 180; body.push([150 + 56 * Math.cos(t), 155 + 38 * Math.sin(t)]); } var p = [body]; p.push(circ(205, 122, 26)); p.push([[230, 120], [256, 126], [230, 132]]); p.push(circ(212, 116, 3, 8)); p.push(arc(150, 155, 30, Math.PI * 0.12, Math.PI * 0.88, 20)); p.push([[95, 155], [60, 140], [72, 155], [60, 170]]); p.push([[145, 192], [145, 214]]); p.push([[162, 192], [162, 214]]); return p; }
  function anSnail() { var sh = [], a; for (a = 0; a <= 360 * 3; a += 6) { var t = a * Math.PI / 180, r = a / (360 * 3) * 52; sh.push([168 + r * Math.cos(t), 148 + r * Math.sin(t)]); } var p = [sh]; p.push([[122, 205], [232, 205], [238, 180], [214, 174]]); p.push(arc(96, 190, 24, Math.PI, 2 * Math.PI, 16)); p.push([[122, 205], [78, 190]]); p.push([[84, 170], [76, 148]]); p.push([[96, 168], [102, 146]]); return p; }
  function anDragonfly() { var p = [[[150, 84], [150, 232]]]; p.push(circ(150, 84, 13)); p.push(petalLoop(150, 112, 0.12, 92, 16)); p.push(petalLoop(150, 112, Math.PI - 0.12, 92, 16)); p.push(petalLoop(150, 142, 0.16, 80, 14)); p.push(petalLoop(150, 142, Math.PI - 0.16, 80, 14)); return p; }
  function anPaw() { var p = [circ(150, 182, 42)]; [[112, 118], [140, 104], [172, 108], [196, 128]].forEach(function (t) { p.push(circ(t[0], t[1], 15)); }); return p; }

  // --- more procedural ---
  function gSquares() { var p = []; for (var r = 18; r <= 140; r += 16) p.push([[150 - r, 150 - r], [150 + r, 150 - r], [150 + r, 150 + r], [150 - r, 150 + r], [150 - r, 150 - r]]); return p; }
  function gMoire() { var p = [], x; for (x = 20; x <= 280; x += 10) p.push([[x, 20], [x, 280]]); for (x = 20; x <= 280; x += 10) p.push([[20, 20], [x, 280]]); return p; }
  function cSaturn() { var p = [circ(150, 150, 55)], ring = []; for (var a = 0; a <= 360; a += 6) { var t = a * Math.PI / 180; ring.push([150 + 112 * Math.cos(t), 150 + 38 * Math.sin(t)]); } p.push(ring); return p; }
  function pBricks() { var p = [], bw = 50, bh = 24; for (var row = 0; row < 10; row++) { var y = 30 + row * bh, off = (row % 2) * bw / 2; p.push([[20, y], [280, y]]); for (var x = 20 + off; x < 280; x += bw) p.push([[x, y], [x, y + bh]]); } return p; }
  function aPhyllo() { var p = [], ga = Math.PI * (3 - Math.sqrt(5)); for (var i = 1; i < 260; i++) { var r = 9 * Math.sqrt(i), a = i * ga; if (r > 135) break; p.push(circ(150 + r * Math.cos(a), 150 + r * Math.sin(a), 2.6, 10)); } return p; }

  var CATEGORIES = [
    { name: 'Geometric', items: [{ name: 'Concentric', gen: gConcentric }, { name: 'Spiral', gen: gSpiral }, { name: 'Polygons', gen: gPolygons }, { name: 'Star 5', gen: gStar5 }, { name: 'Star 7', gen: gStar7 }, { name: 'Grid', gen: gGrid }, { name: 'Hexagons', gen: gHex }, { name: 'Spirograph', gen: gSpiro }, { name: 'Flower of Life', gen: gFlowerLife }, { name: 'Target', gen: gTarget }, { name: 'Concentric squares', gen: gSquares }, { name: 'Moiré', gen: gMoire }] },
    { name: 'Mandala', items: [{ name: 'Rose 3', gen: rose(3) }, { name: 'Rose 5', gen: rose(5) }, { name: 'Rose 7', gen: rose(7) }, { name: 'Lotus', gen: mLotus }, { name: 'Layered', gen: mLayered }, { name: 'Rings', gen: mRings }] },
    { name: 'Celestial', items: [{ name: 'Sun', gen: cSun }, { name: 'Crescent', gen: cCrescent }, { name: 'Moon phases', gen: cMoonPhases }, { name: 'Star 6', gen: cStar6 }, { name: 'Starburst', gen: cStarburst }, { name: 'Constellation', gen: cConstellation(42) }, { name: 'Orbits', gen: cOrbits }, { name: 'Saturn', gen: cSaturn }] },
    { name: 'Botanical', items: [{ name: 'Tree', gen: bTree(3) }, { name: 'Sunflower', gen: bSunflower }, { name: 'Flower', gen: bFlower }, { name: 'Leaf', gen: bLeaf }, { name: 'Cactus', gen: bCactus }, { name: 'Floral border', gen: bFloralBorder }] },
    { name: 'Landscape', items: [{ name: 'Mountains', gen: lMountains(7) }, { name: 'Hills + sun', gen: lHills }, { name: 'Ocean waves', gen: lWaves }, { name: 'Forest', gen: lForest }] },
    { name: 'Patterns', items: [{ name: 'Hearts', gen: pHearts }, { name: 'Stars', gen: pStars }, { name: 'Checker', gen: pChecker }, { name: 'Floral', gen: pFloral }, { name: 'Triangles', gen: pTriangles }, { name: 'Scallops', gen: pScallops }, { name: 'Waves', gen: lWaves }, { name: 'Bricks', gen: pBricks }] },
    { name: 'Abstract', items: [{ name: 'Lissajous', gen: aLissajous(3, 2, Math.PI / 2) }, { name: 'Lissajous II', gen: aLissajous(5, 4, Math.PI / 3) }, { name: 'Harmonograph', gen: aHarmono(11) }, { name: 'Harmonograph II', gen: aHarmono(29) }, { name: 'Interlocking', gen: aInterCircles }, { name: 'Flow field', gen: aFlow(5) }, { name: 'Phyllotaxis', gen: aPhyllo }] },
    { name: 'Holiday', items: [{ name: 'Snowflake', gen: hSnowflake }, { name: 'Xmas tree', gen: hTree }, { name: 'Heart', gen: hHeart }, { name: 'Pumpkin', gen: hPumpkin }] },
    { name: 'Kids', items: [{ name: 'Balloon', gen: kBalloon }, { name: 'Rocket', gen: kRocket }, { name: 'Clouds + stars', gen: kCloud }, { name: 'Fish', gen: kFish }, { name: 'Whale', gen: kWhale }, { name: 'Rainbow', gen: kRainbow }] },
    { name: 'Animals', items: [{ name: 'Butterfly', gen: anButterfly }, { name: 'Cat', gen: anCat }, { name: 'Bird', gen: anBird }, { name: 'Fish', gen: kFish }, { name: 'Whale', gen: kWhale }, { name: 'Snail', gen: anSnail }, { name: 'Dragonfly', gen: anDragonfly }, { name: 'Paw print', gen: anPaw }] },
  ];

  function drawPolys(c, polys, col) {
    var cc = c.getContext('2d'), W = c.width, H = c.height, m = 6, sc = Math.min((W - 2 * m) / D, (H - 2 * m) / D), ox = (W - D * sc) / 2, oy = (H - D * sc) / 2;
    cc.clearRect(0, 0, W, H); cc.strokeStyle = col; cc.lineWidth = 1; cc.lineJoin = 'round'; cc.lineCap = 'round';
    polys.forEach(function (poly) { cc.beginPath(); poly.forEach(function (pt, i) { var x = ox + pt[0] * sc, y = oy + pt[1] * sc; if (i === 0) cc.moveTo(x, y); else cc.lineTo(x, y); }); cc.stroke(); });
  }
  function draw() {
    if (!current) return;
    drawPolys(canvas, current.polys, penColor(pick.slot()));
    info.innerHTML = 'Design: <b>' + current.name + '</b><br>Strokes: <b>' + current.polys.length + '</b><br>Size: <b>' + (parseFloat(sizeInput.value) || 300).toFixed(0) + '</b> mm';
  }
  function select(item, card) {
    try { current = { name: item.name, polys: item.gen() }; }
    catch (e) { showToast('Could not generate ' + item.name, 'error'); return; }
    Array.prototype.forEach.call(grid.children, function (c) { c.classList.toggle('active', c === card); });
    detail.classList.remove('hidden'); draw();
  }
  function toSVG() {
    var size = parseFloat(sizeInput.value) || 300, sc = size / D, col = penColor(pick.slot());
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">';
    current.polys.forEach(function (poly) { s += '<path d="M ' + poly.map(function (pt) { return (pt[0] * sc).toFixed(2) + ' ' + (pt[1] * sc).toFixed(2); }).join(' L ') + '" stroke="' + col + '" fill="none"/>'; });
    return s + '</svg>';
  }
  function toGcode() { var slot = pick.slot(), cmap = {}; cmap[penColor(slot)] = slot; return svgToGcode(toSVG(), calibMM.anchor, calibMM.left, calibMM.right, { yOffset: eraseToggle.checked ? ERASE_Y_OFFSET : 0, penDir: penDir(), colorMap: cmap }); }

  var catBar = document.getElementById('gallery-cats');
  function showCategory(cat) {
    grid.innerHTML = '';
    cat.items.forEach(function (item) {
      var card = document.createElement('button'); card.type = 'button'; card.className = 'gallery-card';
      var thumb = document.createElement('canvas'); thumb.width = 110; thumb.height = 110; thumb.className = 'gallery-thumb';
      try { drawPolys(thumb, item.gen(), '#46c6f5'); } catch (e) {}
      var nm = document.createElement('span'); nm.className = 'gallery-name'; nm.textContent = item.name;
      card.appendChild(thumb); card.appendChild(nm);
      card.addEventListener('click', function () { select(item, card); });
      grid.appendChild(card);
    });
  }
  CATEGORIES.forEach(function (cat, ci) {
    var chip = document.createElement('button'); chip.type = 'button'; chip.className = 'gallery-cat' + (ci === 0 ? ' active' : ''); chip.textContent = cat.name;
    chip.addEventListener('click', function () { Array.prototype.forEach.call(catBar.children, function (c) { c.classList.toggle('active', c === chip); }); showCategory(cat); });
    catBar.appendChild(chip);
  });
  showCategory(CATEGORIES[0]);
  if (detail) detail.insertBefore(pick.el, detail.querySelector('.gen-actions'));
  sizeInput.addEventListener('input', draw);
  dlBtn.addEventListener('click', function () { if (!current) { showToast('Pick a design first', 'error'); return; } var blob = new Blob([toGcode()], { type: 'text/plain' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gallery-' + current.name.toLowerCase() + '.gcode'; a.click(); showToast('G-code downloaded', 'success'); });
  sendBtn.addEventListener('click', async function () {
    if (!current) { showToast('Pick a design first', 'error'); return; }
    if (!confirmSend()) return;
    var b = drawingFits(parseFloat(sizeInput.value) || 300);
    if (!b.ok && !confirm('Heads up — ' + b.msg + '. Send anyway?')) return;
    sendBtn.disabled = true;
    try { await streamDrawing(toGcode()); showToast('Sent to robot — drawing!', 'success'); }
    catch (e) { showToast('Send failed: ' + e.message, 'error'); }
    finally { sendBtn.disabled = false; }
  });
})();

// ===== Freehand Draw =====
(function drawPad() {
  var canvas = document.getElementById('draw-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var info = document.getElementById('draw-info');
  var sizeInput = document.getElementById('draw-size');
  var undoBtn = document.getElementById('draw-undo'), clearBtn = document.getElementById('draw-clear');
  var dlBtn = document.getElementById('draw-download'), sendBtn = document.getElementById('draw-send');
  var strokes = [], cur = null, drawing = false;
  var pick = makePenPicker(function () { repaint(); });

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    var cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    var cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return [cx * canvas.width / r.width, cy * canvas.height / r.height];
  }
  function start(e) { e.preventDefault(); drawing = true; cur = [pos(e)]; strokes.push(cur); }
  function move(e) { if (!drawing) return; e.preventDefault(); var p = pos(e), last = cur[cur.length - 1]; if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 2) { cur.push(p); repaint(); } }
  function end() { drawing = false; cur = null; repaint(); }
  function repaint() {
    var W = canvas.width, H = canvas.height; ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = penColor(pick.slot()); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    strokes.forEach(function (s) { if (!s.length) return; ctx.beginPath(); s.forEach(function (pt, i) { if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]); }); if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1]); ctx.stroke(); });
    var pts = strokes.reduce(function (a, s) { return a + s.length; }, 0);
    info.innerHTML = 'Strokes: <b>' + strokes.length + '</b> · points ' + pts + '<br>Size: <b>' + (parseFloat(sizeInput.value) || 300).toFixed(0) + '</b> mm';
  }
  canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', end);
  undoBtn.addEventListener('click', function () { strokes.pop(); repaint(); });
  clearBtn.addEventListener('click', function () { strokes = []; repaint(); });
  sizeInput.addEventListener('input', repaint);

  function toSVG() {
    var W = canvas.width, H = canvas.height, size = parseFloat(sizeInput.value) || 300, sc = size / Math.max(W, H), col = penColor(pick.slot());
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (W * sc).toFixed(1) + '" height="' + (H * sc).toFixed(1) + '">';
    strokes.forEach(function (st) { if (st.length < 2) return; s += '<path d="M ' + st.map(function (pt) { return (pt[0] * sc).toFixed(2) + ' ' + (pt[1] * sc).toFixed(2); }).join(' L ') + '" stroke="' + col + '" fill="none"/>'; });
    return s + '</svg>';
  }
  function toGcode() { var slot = pick.slot(), cmap = {}; cmap[penColor(slot)] = slot; return svgToGcode(toSVG(), calibMM.anchor, calibMM.left, calibMM.right, { yOffset: eraseToggle.checked ? ERASE_Y_OFFSET : 0, penDir: penDir(), colorMap: cmap }); }

  var actions = canvas.closest('section').querySelector('.gen-actions');
  if (actions) actions.parentNode.insertBefore(pick.el, actions);
  dlBtn.addEventListener('click', function () { if (!strokes.length) { showToast('Draw something first', 'error'); return; } var blob = new Blob([toGcode()], { type: 'text/plain' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'freehand.gcode'; a.click(); showToast('G-code downloaded', 'success'); });
  sendBtn.addEventListener('click', async function () {
    if (!strokes.length) { showToast('Draw something first', 'error'); return; }
    if (!confirmSend()) return;
    var b = drawingFits(parseFloat(sizeInput.value) || 300);
    if (!b.ok && !confirm('Heads up — ' + b.msg + '. Send anyway?')) return;
    sendBtn.disabled = true;
    try { await streamDrawing(toGcode()); showToast('Sent to robot — drawing!', 'success'); }
    catch (e) { showToast('Send failed: ' + e.message, 'error'); }
    finally { sendBtn.disabled = false; }
  });
  repaint();
})();

// ===== QR Code plotter (uses qrcode.js global) =====
(function qrArt() {
  var input = document.getElementById('qr-text');
  if (!input || typeof qrcode === 'undefined') return;
  var canvas = document.getElementById('qr-canvas'), ctx = canvas.getContext('2d');
  var info = document.getElementById('qr-info'), sizeInput = document.getElementById('qr-size');
  var dlBtn = document.getElementById('qr-download'), sendBtn = document.getElementById('qr-send');
  var pick = makePenPicker(function () { render(); });

  function build() { var qr = qrcode(0, 'M'); qr.addData(input.value || ' '); qr.make(); return qr; }

  function render() {
    var qr;
    try { qr = build(); } catch (e) { info.textContent = 'Text is too long for a single QR code.'; ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    var n = qr.getModuleCount(), margin = 4, total = n + margin * 2;
    var W = canvas.width, H = canvas.height, cell = Math.min(W, H) / total, ox = (W - cell * total) / 2, oy = (H - cell * total) / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = penColor(pick.slot());
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(ox + (c + margin) * cell, oy + (r + margin) * cell, cell + 0.6, cell + 0.6);
    info.innerHTML = 'Modules: <b>' + n + '×' + n + '</b><br>Size: <b>' + (parseFloat(sizeInput.value) || 300).toFixed(0) + '</b> mm';
  }

  function qrPolys(size) {
    var qr = build(), n = qr.getModuleCount(), margin = 4, total = n + margin * 2;
    var cell = size / total, gap = cell / 4, x0 = margin * cell, col = penColor(pick.slot());
    var polys = [], cur = null, prevEnd = null, dir = 1;
    // Boustrophedon horizontal scan-fill so dark modules plot solid (scannable).
    for (var y = margin * cell + gap * 0.5; y < (margin + n) * cell; y += gap) {
      var rr = Math.floor(y / cell) - margin; if (rr < 0 || rr >= n) continue;
      var runs = [], c = 0;
      while (c < n) { if (qr.isDark(rr, c)) { var s = c; while (c < n && qr.isDark(rr, c)) c++; runs.push([x0 + s * cell, x0 + c * cell]); } else c++; }
      if (!runs.length) { if (cur) { polys.push(cur); cur = null; prevEnd = null; } dir = 1; continue; }
      if (dir < 0) runs.reverse();
      runs.forEach(function (rn) {
        var a = [dir > 0 ? rn[0] : rn[1], y], b = [dir > 0 ? rn[1] : rn[0], y];
        if (cur && prevEnd && Math.abs(prevEnd[1] - y) <= gap * 1.6 && Math.abs(prevEnd[0] - a[0]) <= cell) cur.push(a, b);
        else { if (cur) polys.push(cur); cur = [a, b]; }
        prevEnd = b;
      });
      dir = -dir;
    }
    if (cur) polys.push(cur);
    return { polys: polys, col: col };
  }

  function toSVG() {
    var size = parseFloat(sizeInput.value) || 300, q = qrPolys(size);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">';
    q.polys.forEach(function (poly) { s += '<path d="M ' + poly.map(function (pt) { return pt[0].toFixed(2) + ' ' + pt[1].toFixed(2); }).join(' L ') + '" stroke="' + q.col + '" fill="none"/>'; });
    return s + '</svg>';
  }
  function toGcode() { var slot = pick.slot(), cmap = {}; cmap[penColor(slot)] = slot; return svgToGcode(toSVG(), calibMM.anchor, calibMM.left, calibMM.right, { yOffset: eraseToggle.checked ? ERASE_Y_OFFSET : 0, penDir: penDir(), colorMap: cmap }); }

  input.addEventListener('input', render);
  sizeInput.addEventListener('input', render);
  var actions = canvas.closest('section').querySelector('.gen-actions');
  if (actions) actions.parentNode.insertBefore(pick.el, actions);
  dlBtn.addEventListener('click', function () { try { var blob = new Blob([toGcode()], { type: 'text/plain' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qr.gcode'; a.click(); showToast('G-code downloaded', 'success'); } catch (e) { showToast('Text too long for one QR', 'error'); } });
  sendBtn.addEventListener('click', async function () {
    if (!confirmSend()) return;
    var b = drawingFits(parseFloat(sizeInput.value) || 300);
    if (!b.ok && !confirm('Heads up — ' + b.msg + '. Send anyway?')) return;
    sendBtn.disabled = true;
    try { await streamDrawing(toGcode()); showToast('Sent to robot — drawing!', 'success'); }
    catch (e) { showToast('Send failed: ' + e.message, 'error'); }
    finally { sendBtn.disabled = false; }
  });
  render();
})();

// ===== Settings page =====
(function settingsPage() {
  var u = document.getElementById('set-units');
  if (!u) return;
  var size = document.getElementById('set-size'), feed = document.getElementById('set-feed'), seg = document.getElementById('set-seg'),
    pen = document.getElementById('set-pen'), erase = document.getElementById('set-erase'), ip = document.getElementById('set-ip'),
    confirmEl = document.getElementById('set-confirm'), note = document.getElementById('set-note'),
    wall = document.getElementById('set-wall');

  function fill() {
    u.value = SETTINGS.units; size.value = SETTINGS.defaultSize; feed.value = SETTINGS.feed; seg.value = SETTINGS.segment;
    pen.value = SETTINGS.penDepth; erase.value = SETTINGS.eraseOffset; ip.value = SETTINGS.ip; confirmEl.checked = !!SETTINGS.confirmSend;
    if (wall) wall.value = SETTINGS.wallColor || '#f2e9d0';
  }
  fill();
  applyWallColor();   // tint previews to the wall color on load

  function commit() {
    SETTINGS.units = u.value;
    SETTINGS.defaultSize = parseFloat(size.value) || 300;
    SETTINGS.feed = parseInt(feed.value, 10) || 1000;
    SETTINGS.segment = parseFloat(seg.value) || 1.5;
    SETTINGS.penDepth = parseInt(pen.value, 10) || 30;
    var eo = parseFloat(erase.value); SETTINGS.eraseOffset = isNaN(eo) ? -77 : eo;
    SETTINGS.ip = ip.value.trim();
    SETTINGS.confirmSend = confirmEl.checked;
    if (wall) SETTINGS.wallColor = wall.value;
    saveSettings();
  }
  [u, size, feed, seg, pen, erase, ip, confirmEl, wall].forEach(function (el) { if (el) el.addEventListener('change', commit); });
  if (wall) wall.addEventListener('input', function () { SETTINGS.wallColor = wall.value; applyWallColor(); }); // live preview while dragging the picker

  // Keep the calibration unit toggle in sync with the global units setting.
  function syncCalibUnit() {
    var bar = document.getElementById('calib-unit'); if (!bar) return;
    var btn = bar.querySelector('[data-unit="' + SETTINGS.units + '"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  }
  u.addEventListener('change', syncCalibUnit);
  syncCalibUnit();

  // Apply default drawing size to drawing-size inputs (Text uses height — left alone).
  ['gen-size', 'img-size', 'gallery-size', 'draw-size', 'qr-size'].forEach(function (id) {
    var el = document.getElementById(id); if (el) { el.value = SETTINGS.defaultSize; el.dispatchEvent(new Event('input')); }
  });

  ip.addEventListener('change', function () { note.textContent = 'IP change takes effect after you reload the page.'; });

  var KEYS = ['scribit_settings', 'scribit_pens', 'scribit_walls', 'scribit_last_calib', 'scribit_pen_invert', 'scribit_setup_done'];
  document.getElementById('set-setup').addEventListener('click', function () { var s = document.getElementById('setup-open'); if (s) s.click(); });
  document.getElementById('set-export').addEventListener('click', function () {
    var data = {}; KEYS.forEach(function (k) { var v = localStorage.getItem(k); if (v != null) data[k] = v; });
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'scribit-settings.json'; a.click();
    showToast('Settings exported', 'success');
  });
  document.getElementById('set-import').addEventListener('click', function () { document.getElementById('set-import-file').click(); });
  document.getElementById('set-import-file').addEventListener('change', async function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    try { var data = JSON.parse(await f.text()); Object.keys(data).forEach(function (k) { if (KEYS.indexOf(k) >= 0) localStorage.setItem(k, data[k]); }); showToast('Settings imported — reloading…', 'success'); setTimeout(function () { location.reload(); }, 800); }
    catch (err) { showToast('Invalid settings file', 'error'); }
  });
  document.getElementById('set-reset').addEventListener('click', function () {
    if (!confirm('Reset ALL saved data (settings, pen rack, saved walls, setup state)? This cannot be undone.')) return;
    KEYS.forEach(function (k) { localStorage.removeItem(k); });
    showToast('Cleared — reloading…', 'success'); setTimeout(function () { location.reload(); }, 800);
  });

  document.addEventListener('settings-changed', fill);
})();