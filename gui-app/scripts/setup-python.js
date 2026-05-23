#!/usr/bin/env node
/**
 * Setup script to copy portable Python runtimes to resources directory
 * Runs automatically after npm install
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const resourcesDir = path.join(projectRoot, 'resources', 'python');
const runtimeDir = path.join(resourcesDir, 'runtime');

// Skip setup in production install
if (process.env.NODE_ENV === 'production') {
  console.log('Production install detected. Skipping Python runtime setup.');
  process.exit(0);
}

console.log('Setting up portable Python runtime...');

// Find the portable-python package
const portablePythonPath = path.join(projectRoot, 'node_modules', '@bjia56', 'portable-python-3.11');

if (!fs.existsSync(portablePythonPath)) {
  console.error('ERROR: Portable Python not found. GUI will not function correctly.');
  console.error('Run: npm install --include=dev');
  process.exit(1);
}

// Find the Python distribution directory
const files = fs.readdirSync(portablePythonPath);
const pythonDir = files.find(f => f.startsWith('python-headless-'));

if (!pythonDir) {
  console.error('ERROR: Python distribution not found in portable-python package.');
  process.exit(1);
}

const sourcePath = path.join(portablePythonPath, pythonDir);

// Create runtime directory
if (fs.existsSync(runtimeDir)) {
  console.log('Removing existing runtime directory...');
  fs.rmSync(runtimeDir, { recursive: true, force: true });
}

console.log('Creating runtime directory...');
fs.mkdirSync(runtimeDir, { recursive: true });

// Copy Python runtime (dereference symlinks)
console.log(`Copying Python from ${sourcePath} to ${runtimeDir}...`);
try {
  fs.cpSync(sourcePath, runtimeDir, { recursive: true, dereference: true });
} catch (err) {
  console.error('ERROR: Failed to copy Python runtime:', err.message);
  process.exit(1);
}

console.log('Python runtime setup complete!');