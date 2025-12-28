# License Validation System

## Overview

Device-side license validation using asymmetric cryptography. License keys are cryptographically signed with device ID, validated by firmware on every request.

## Architecture

**Key Generation**: Your machine holds private key
**License Generation**: Sign device ID with private key → license key
**Validation**: Firmware validates signature using embedded public key

## Advantages

- ✅ Hardware-bound (license tied to device ID)
- ✅ Harder to bypass (requires firmware reflash)
- ✅ No app-side security needed
- ✅ Works with any client (curl, Postman, etc.)
- ✅ Single point of validation

## Implementation Plan

### 1. Key Generation (One-time setup)

```javascript
// scripts/generate-keypair.js
const crypto = require('crypto');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'secp256k1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Save private key securely (NEVER commit to git)
// Save public key to embed in firmware
```

### 2. License Generation (Per customer)

```javascript
// scripts/generate-license.js
const crypto = require('crypto');
const fs = require('fs');

const PRIVATE_KEY = fs.readFileSync('./private-key.pem', 'utf8');

function generateLicense(deviceId) {
  const sign = crypto.createSign('SHA256');
  sign.update(deviceId);
  const signature = sign.sign(PRIVATE_KEY, 'base64');
  return signature;
}

// Usage:
const deviceId = process.argv[2]; // e.g., "scribit_abc123"
const licenseKey = generateLicense(deviceId);
console.log(`License for ${deviceId}:\n${licenseKey}`);
```

### 3. Firmware Validation (ESP32)

Add to `ScribitESP/ScribitESP.ino`:

```cpp
#include <mbedtls/pk.h>
#include <mbedtls/md.h>
#include <mbedtls/base64.h>

const char* PUBLIC_KEY_PEM =
"-----BEGIN PUBLIC KEY-----\n"
"YOUR_GENERATED_PUBLIC_KEY_HERE\n"
"-----END PUBLIC KEY-----\n";

bool validateLicense(const String& deviceId, const String& licenseKey) {
  mbedtls_pk_context pk;
  mbedtls_pk_init(&pk);

  // Parse public key
  int ret = mbedtls_pk_parse_public_key(&pk,
    (const unsigned char*)PUBLIC_KEY_PEM,
    strlen(PUBLIC_KEY_PEM) + 1);

  if (ret != 0) {
    mbedtls_pk_free(&pk);
    return false;
  }

  // Decode base64 license signature
  unsigned char signature[256];
  size_t sig_len;
  ret = mbedtls_base64_decode(signature, sizeof(signature), &sig_len,
    (const unsigned char*)licenseKey.c_str(), licenseKey.length());

  if (ret != 0) {
    mbedtls_pk_free(&pk);
    return false;
  }

  // Compute SHA256 hash of device ID
  unsigned char hash[32];
  mbedtls_md_context_t md_ctx;
  mbedtls_md_init(&md_ctx);
  const mbedtls_md_info_t* md_info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  mbedtls_md_setup(&md_ctx, md_info, 0);
  mbedtls_md_starts(&md_ctx);
  mbedtls_md_update(&md_ctx, (const unsigned char*)deviceId.c_str(), deviceId.length());
  mbedtls_md_finish(&md_ctx, hash);
  mbedtls_md_free(&md_ctx);

  // Verify signature
  ret = mbedtls_pk_verify(&pk, MBEDTLS_MD_SHA256,
    hash, sizeof(hash), signature, sig_len);

  mbedtls_pk_free(&pk);
  return (ret == 0);
}

// Update /upload endpoint:
server.on("/upload", HTTP_POST, []() {
  String licenseKey = "";

  // Check for license in header
  if (server.hasHeader("X-License-Key")) {
    licenseKey = server.header("X-License-Key");
  }

  String deviceId = getDeviceId(); // Your existing device ID function

  if (!validateLicense(deviceId, licenseKey)) {
    server.send(403, "application/json", "{\"error\":\"Invalid or missing license\"}");
    return;
  }

  // Process gcode...
  String gcode = server.arg("plain");
  // ... existing upload logic
});

// Also protect other endpoints: /pause, /resume, /stop
```

### 4. GUI App Integration

**Store license locally:**

```javascript
// gui-app/src/renderer/src/utils/license.js
const LICENSE_KEY = 'scribit_license_key'

export function saveLicenseKey(key) {
  localStorage.setItem(LICENSE_KEY, key)
}

export function getLicenseKey() {
  return localStorage.getItem(LICENSE_KEY) || ''
}

export function clearLicenseKey() {
  localStorage.removeItem(LICENSE_KEY)
}
```

**Update IPC handlers to include license:**

```javascript
// gui-app/src/main/ipc-handlers.js

// Import at top:
const Store = require('electron-store');
const store = new Store();

function getLicenseKey() {
  return store.get('licenseKey', '');
}

// Update all device communication endpoints:
ipcMain.handle('send-gcode', async (event, gcode) => {
  const licenseKey = getLicenseKey();

  try {
    const response = await axios.post('http://192.168.240.1:8888/upload', gcode, {
      headers: {
        'Content-Type': 'text/plain',
        'X-License-Key': licenseKey
      },
      timeout: 30000
    });
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 403) {
      return { success: false, error: 'Invalid or missing license key', needsLicense: true };
    }
    return { success: false, error: error.message };
  }
});

// Add license management handlers:
ipcMain.handle('save-license-key', async (event, key) => {
  store.set('licenseKey', key);
  return { success: true };
});

ipcMain.handle('get-license-key', async () => {
  return { success: true, key: getLicenseKey() };
});

ipcMain.handle('clear-license-key', async () => {
  store.delete('licenseKey');
  return { success: true };
});
```

**Create license entry UI:**

```vue
<!-- gui-app/src/renderer/src/views/License.vue -->
<template>
  <div class="license-view">
    <div class="card">
      <h1>License Activation</h1>
      <div v-if="!hasLicense">
        <p>Enter your license key to activate this device</p>
        <p class="device-id">Device ID: <strong>{{ deviceId }}</strong></p>

        <textarea
          v-model="licenseKey"
          placeholder="Paste your license key here"
          rows="4"
          class="license-input"
        />

        <button @click="activateLicense" class="btn btn-primary">Activate License</button>

        <div v-if="error" class="error-message">{{ error }}</div>
      </div>

      <div v-else>
        <p class="success-message">✓ License active for device {{ deviceId }}</p>
        <button @click="clearLicense" class="btn btn-secondary">Clear License</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const licenseKey = ref('');
const deviceId = ref('');
const hasLicense = ref(false);
const error = ref('');

onMounted(async () => {
  // Get device ID from device
  const statusResult = await window.electronAPI.getDeviceStatus();
  if (statusResult.success && statusResult.data?.id) {
    deviceId.value = statusResult.data.id;
  }

  // Check if license already exists
  const licenseResult = await window.electronAPI.getLicenseKey();
  if (licenseResult.success && licenseResult.key) {
    hasLicense.value = true;
  }
});

async function activateLicense() {
  error.value = '';

  if (!licenseKey.value.trim()) {
    error.value = 'Please enter a license key';
    return;
  }

  // Save license
  await window.electronAPI.saveLicenseKey(licenseKey.value.trim());

  // Test license by making a simple request
  const testResult = await window.electronAPI.getDeviceStatus();

  if (testResult.success) {
    hasLicense.value = true;
    setTimeout(() => router.push('/'), 1000);
  } else if (testResult.needsLicense) {
    error.value = 'Invalid license key for this device';
    await window.electronAPI.clearLicenseKey();
  }
}

async function clearLicense() {
  await window.electronAPI.clearLicenseKey();
  hasLicense.value = false;
  licenseKey.value = '';
}
</script>

<style scoped>
.license-view { max-width: 600px; margin: 2rem auto; }
.device-id { background: #f5f5f5; padding: 1rem; border-radius: 4px; }
.license-input {
  width: 100%;
  padding: 0.75rem;
  margin: 1rem 0;
  font-family: monospace;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.error-message {
  color: #e74c3c;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef5f5;
  border-radius: 4px;
}
.success-message {
  color: #27ae60;
  padding: 1rem;
  background: #f0f9f4;
  border-radius: 4px;
}
</style>
```

**Expose license APIs in preload:**

```javascript
// gui-app/src/preload/index.js
// Add to contextBridge.exposeInMainWorld:

getLicenseKey: () => ipcRenderer.invoke('get-license-key'),
saveLicenseKey: (key) => ipcRenderer.invoke('save-license-key', key),
clearLicenseKey: () => ipcRenderer.invoke('clear-license-key'),
```

## Payment & License Distribution

### Gumroad Integration (Recommended)

**Why Gumroad:**
- ✅ No buyer account required (guest checkout)
- ✅ Custom fields to capture device ID
- ✅ URL pre-fill from app
- ✅ Handles global payments, VAT, taxes
- ✅ 10% fee, no monthly cost (or $10/mo for lower fees)

**Setup Steps:**

1. **Create Gumroad Product:**
   - Go to gumroad.com → Products → New Product
   - Set name: "ScribIt License"
   - Set price: e.g., $49
   - Add custom field:
     - Name: `device_id`
     - Label: "Device ID"
     - Required: Yes
     - Can make read-only if pre-filled

2. **Add Purchase Button to App:**

```vue
<!-- In License.vue -->
<template>
  <div class="license-view">
    <div class="card">
      <h1>License Activation</h1>

      <div v-if="!hasLicense">
        <p class="device-id">Your Device ID: <strong>{{ deviceId }}</strong></p>

        <!-- Purchase button opens Gumroad with device ID pre-filled -->
        <button @click="purchaseLicense" class="btn btn-primary">
          Purchase License ($49)
        </button>

        <p class="separator">- OR -</p>

        <p>Already purchased? Enter your license key:</p>
        <textarea
          v-model="licenseKey"
          placeholder="Paste your license key here"
          rows="4"
          class="license-input"
        />
        <button @click="activateLicense" class="btn btn-secondary">
          Activate License
        </button>

        <div v-if="error" class="error-message">{{ error }}</div>
      </div>

      <div v-else>
        <p class="success-message">✓ License active for device {{ deviceId }}</p>
        <button @click="clearLicense" class="btn btn-secondary">Clear License</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const deviceId = ref('');
const licenseKey = ref('');
const hasLicense = ref(false);
const error = ref('');

onMounted(async () => {
  // Fetch device ID from firmware
  const statusResult = await window.electronAPI.getDeviceStatus();
  if (statusResult.success && statusResult.data?.id) {
    deviceId.value = statusResult.data.id;
  }

  // Check for existing license
  const licenseResult = await window.electronAPI.getLicenseKey();
  if (licenseResult.success && licenseResult.key) {
    hasLicense.value = true;
  }
});

function purchaseLicense() {
  // Open Gumroad with device ID pre-filled
  const gumroadUrl = `https://yourproduct.gumroad.com/l/scribit-license?wanted[device_id]=${encodeURIComponent(deviceId.value)}`;
  window.electronAPI.openExternal(gumroadUrl);
}

async function activateLicense() {
  error.value = '';

  if (!licenseKey.value.trim()) {
    error.value = 'Please enter a license key';
    return;
  }

  // Save and test license
  await window.electronAPI.saveLicenseKey(licenseKey.value.trim());

  // Test by making a request
  const testResult = await window.electronAPI.getDeviceStatus();

  if (testResult.success) {
    hasLicense.value = true;
  } else if (testResult.needsLicense) {
    error.value = 'Invalid license key for this device';
    await window.electronAPI.clearLicenseKey();
  }
}

async function clearLicense() {
  await window.electronAPI.clearLicenseKey();
  hasLicense.value = false;
  licenseKey.value = '';
}
</script>

<style scoped>
.license-view { max-width: 600px; margin: 2rem auto; }
.device-id {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}
.separator {
  text-align: center;
  color: #999;
  margin: 1.5rem 0;
}
.license-input {
  width: 100%;
  padding: 0.75rem;
  margin: 1rem 0;
  font-family: monospace;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.error-message {
  color: #e74c3c;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef5f5;
  border-radius: 4px;
}
.success-message {
  color: #27ae60;
  padding: 1rem;
  background: #f0f9f4;
  border-radius: 4px;
}
</style>
```

3. **Expose shell.openExternal in preload:**

```javascript
// gui-app/src/preload/index.js
import { contextBridge, ipcRenderer, shell } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing APIs
  openExternal: (url) => shell.openExternal(url),
  getLicenseKey: () => ipcRenderer.invoke('get-license-key'),
  saveLicenseKey: (key) => ipcRenderer.invoke('save-license-key', key),
  clearLicenseKey: () => ipcRenderer.invoke('clear-license-key'),
})
```

4. **Receive Order & Generate License:**

When customer completes purchase:
- Gumroad emails you: customer email + device ID
- Run script to generate license:
  ```bash
  node scripts/generate-license.js "scribit_abc123"
  ```
- Email license key to customer:
  ```
  Subject: Your ScribIt License Key

  Hi [Name],

  Thank you for your purchase!

  Your license key for device scribit_abc123:

  [GENERATED_LICENSE_KEY_HERE]

  To activate:
  1. Open ScribIt app
  2. Go to License tab
  3. Paste the key above
  4. Click "Activate License"

  Questions? Reply to this email.

  Thanks,
  [Your Name]
  ```

### Purchase Flow

1. **User opens app** → App fetches device ID from firmware status endpoint
2. **User clicks "Purchase License"** → Opens browser to Gumroad with URL:
   ```
   https://yourproduct.gumroad.com/l/scribit-license?wanted[device_id]=scribit_abc123
   ```
3. **Gumroad checkout** → Device ID pre-filled (read-only or editable)
4. **Customer pays** → No account needed, guest checkout
5. **You receive notification** → Email with payment details + device ID
6. **Generate license** → Run `node scripts/generate-license.js <device_id>`
7. **Email license** → Send license key to customer
8. **Customer activates** → Pastes key in app, app validates with firmware

### Alternative: Stripe Payment Links

If you prefer lower fees (2.9% + 30¢ vs Gumroad's 10%):

**Setup:**
1. Create Stripe Payment Link
2. Add custom field for device ID
3. App opens: `https://buy.stripe.com/xxxxx?prefilled_promo_code=device_abc123`
4. Use webhook for automation (requires Cloudflare Worker or similar)

**Tradeoff:** Lower fees but more setup complexity.

### Manual Fallback

For beta/early customers:
1. Customer emails you with device ID
2. You generate license
3. Email back license key
4. Customer enters in app

## Complete Workflow

1. **Customer receives device** → Device has unique ID burned in firmware
2. **Customer opens GUI app** → App fetches device ID from status endpoint
3. **Customer clicks "Purchase License"** → App opens Gumroad with pre-filled device ID
4. **Customer completes payment** → Gumroad processes payment (no account needed)
5. **You receive notification** → Email with device ID + payment details
6. **You generate license** → Run `node scripts/generate-license.js <device_id>`
7. **You email license** → Send generated key to customer
8. **Customer enters license** → Pastes in app, app stores locally
9. **App includes license** → All requests to firmware include license in header
10. **Firmware validates** → Every request checks license signature matches device ID

## Optional Enhancements

### Grace Period
Allow 10 free drawings for testing before requiring license:

```cpp
int freeDrawingsRemaining = 10; // Store in EEPROM

if (licenseKey.isEmpty()) {
  if (freeDrawingsRemaining > 0) {
    freeDrawingsRemaining--;
    // Process request
  } else {
    server.send(403, "text/plain", "Trial expired. License required.");
    return;
  }
}
```

### License Tiers
Encode feature flags in signed data:

```javascript
// Generate license with metadata
const licenseData = {
  deviceId: "scribit_abc123",
  tier: "commercial", // or "personal"
  expires: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
};

const dataStr = JSON.stringify(licenseData);
const sign = crypto.createSign('SHA256');
sign.update(dataStr);
const signature = sign.sign(PRIVATE_KEY, 'base64');

// License is base64(data) + "." + signature
const license = Buffer.from(dataStr).toString('base64') + '.' + signature;
```

### Time-Limited Licenses
Include expiration timestamp in signed payload.

## Security Notes

- **Private key**: Never commit to git, store securely offline
- **Public key**: Embedded in firmware, visible but can't forge signatures
- **Firmware reflashing**: Users could remove validation by reflashing custom firmware
- **Performance**: ECDSA verification ~1-2ms on ESP32, negligible overhead
- **Target**: Stops casual piracy, not determined hackers

## File Structure

```
open-firmware/
├── scripts/
│   ├── generate-keypair.js      # One-time: generate public/private keys
│   ├── generate-license.js      # Per customer: generate license key
│   └── private-key.pem          # NEVER COMMIT - add to .gitignore
├── ScribitESP/
│   └── ScribitESP.ino           # Updated with license validation
└── gui-app/
    └── src/
        ├── renderer/src/
        │   ├── views/License.vue
        │   └── utils/license.js
        ├── preload/index.js     # Expose license APIs
        └── main/ipc-handlers.js # Include license in requests
```

## Dependencies

**Firmware**: mbedTLS (built into ESP32 Arduino core)
**GUI App**: electron-store (for persistent storage)

```bash
cd gui-app
npm install electron-store
```

## Testing

1. Generate test keypair
2. Generate test license for development device ID
3. Update firmware with public key
4. Flash firmware to device
5. Enter license in GUI
6. Verify drawing requests work
7. Test with invalid license (should fail)
8. Test with no license (should fail or use grace period)
