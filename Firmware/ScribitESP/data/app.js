/* Unbrickit — Scribit Web Interface */

const DEVICE_IP = window.location.hostname || '192.168.240.1';
const API_BASE = `http://${DEVICE_IP}:8888`;

let deviceState = 'BOOT';
let currentFile = null;
let uploadedGcode = null;

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
const calibHeight  = document.getElementById('calib-height');
const calibGenBtn  = document.getElementById('calib-generate');
const calibOutput  = document.getElementById('calib-output');
const calibUpload  = document.getElementById('calib-upload');
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

async function pollStatus() {
  try {
    var s = await apiGet('/status');
    deviceState = s.state || 'IDLE';
    renderStatus(deviceState);
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

function renderStatus(state) {
  statusText.textContent = state || 'UNKNOWN';
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
dropZone.addEventListener('click', function() { fileInput.click(); });

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

async function handleFileUpload(file) {
  var gcode = await file.text();

  if (isSVG(file)) {
    showToast('SVG processing coming soon...', '');
    return;
  }

  if (eraseToggle.checked) {
    gcode = applyEraseOffset(gcode);
  }

  uploadedGcode = gcode;
  showToast('Ready to upload', 'success');
}

function applyEraseOffset(gcode) {
  // Erase mode shifts Y by -77mm (ceramic eraser position below pen)
  return gcode.replace(/^([^GYNZ\n]*G1[^Y]*\s+)Y(-?[\d.]+)/gim, function(match, prefix, val) {
    return prefix + 'Y' + (parseFloat(val) - 77).toFixed(3);
  });
}

// Upload
uploadBtn.addEventListener('click', async function() {
  if (!currentFile || !uploadedGcode) return;
  uploadBtn.disabled = true;
  setProgress(10);

  try {
    setProgress(30);
    var result = await apiPost('/upload', uploadedGcode, true);
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

// Device controls
btnHome.addEventListener('click', async function() {
  btnHome.disabled = true;
  try {
    await apiPost('/gcode', 'G77\n', true);
    showToast('Homing started', 'success');
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
  btnStop.disabled = true;
  try {
    await apiPost('/stop', {});
    showToast('Stopped', 'success');
    pollStatus();
  } catch (e) {
    showToast('Stop failed', 'error');
    btnStop.disabled = false;
  }
});

// Calibration helper
function calcPosition(anchor, leftLen, rightLen) {
  var x = (leftLen * leftLen - rightLen * rightLen + anchor * anchor) / (2 * anchor);
  var y = Math.sqrt(Math.max(0, leftLen * leftLen - x * x));
  return { x: x, y: y };
}

calibGenBtn.addEventListener('click', function() {
  var anchor = parseFloat(calibAnchor.value);
  var left   = parseFloat(calibLeft.value);
  var right  = parseFloat(calibRight.value);

  if (isNaN(anchor) || isNaN(left) || isNaN(right)) {
    showToast('Enter anchor distance and string lengths', 'error');
    return;
  }

  var pos = calcPosition(anchor, left, right);

  var gcode = '; === Calibration starting position ===\n' +
    '; Manual calibration helper\n' +
    '; Measured anchor distance: ' + anchor + ' mm\n' +
    '; Measured left string: ' + left + ' mm\n' +
    '; Measured right string: ' + right + ' mm\n' +
    '; Calculated position: x=' + pos.x.toFixed(1) + 'mm, y=' + pos.y.toFixed(1) + 'mm\n\n' +
    'M17    ; Enable steppers\n' +
    'G77    ; Home pen cylinder\n' +
    'G90    ; Absolute positioning\n' +
    'G1 Z89 ; Raise to pen 1 up position\n' +
    'G91    ; Relative mode for string moves\n' +
    'G1 Z-70; Engage pen 1 against wall\n' +
    'G90    ; Back to absolute\n\n' +
    '; Robot is calibrated and ready\n';

  calibOutput.textContent = gcode;
  calibOutput.classList.remove('hidden');
  calibUpload.classList.remove('hidden');
});

calibUpload.addEventListener('click', async function() {
  var gcode = calibOutput.textContent;
  if (!gcode) return;
  calibUpload.disabled = true;
  try {
    await apiPost('/upload', gcode, true);
    showToast('Calibration sent!', 'success');
  } catch (e) {
    showToast('Failed to send calibration', 'error');
  }
  calibUpload.disabled = false;
});

// Init
pollStatus();
setInterval(pollStatus, 3000);