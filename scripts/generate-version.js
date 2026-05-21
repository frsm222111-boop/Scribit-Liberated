#!/usr/bin/env node

/**
 * Generate version header for firmware from package.json
 * Ensures version consistency across GUI app and firmware
 */

const fs = require('fs')
const path = require('path')

// Read version from package.json
const packagePath = path.join(__dirname, '../gui-app/package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
const version = packageJson.version

// Generate C++ header file
const headerContent = `// Auto-generated from package.json version
// DO NOT EDIT MANUALLY - run: node scripts/generate-version.js

#ifndef FIRMWARE_VERSION_H
#define FIRMWARE_VERSION_H

#define FIRMWARE_VERSION "${version}"

#endif // FIRMWARE_VERSION_H
`

// Write to firmware directory
const headerPath = path.join(__dirname, '../Firmware/ScribitESP/FirmwareVersion.h')
fs.writeFileSync(headerPath, headerContent, 'utf8')

console.log(`✓ Generated FirmwareVersion.h with version ${version}`)
