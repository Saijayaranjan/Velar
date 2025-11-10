#!/usr/bin/env node

/**
 * Verify Native Modules Script
 * 
 * This script verifies that native modules (sharp, canvas, screenshot-desktop)
 * are properly compiled for the target architecture.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getSystemArchitecture() {
  const arch = os.arch();
  log(`\nSystem Architecture: ${arch}`, 'cyan');
  return arch;
}

function checkNodeModule(moduleName) {
  const modulePath = path.join(process.cwd(), 'node_modules', moduleName);
  
  if (!fs.existsSync(modulePath)) {
    log(`✗ ${moduleName}: Not installed`, 'red');
    return false;
  }
  
  try {
    // Try to require the module
    require(moduleName);
    log(`✓ ${moduleName}: Successfully loaded`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${moduleName}: Failed to load - ${error.message}`, 'red');
    return false;
  }
}

function checkNativeBinary(moduleName, binaryPath) {
  const fullPath = path.join(process.cwd(), 'node_modules', moduleName, binaryPath);
  
  if (!fs.existsSync(fullPath)) {
    log(`  Binary not found at: ${binaryPath}`, 'yellow');
    return false;
  }
  
  // On macOS, use 'file' command to check architecture
  if (process.platform === 'darwin') {
    try {
      const output = execSync(`file "${fullPath}"`, { encoding: 'utf8' });
      log(`  Binary info: ${output.trim()}`, 'blue');
      
      const arch = os.arch();
      if (arch === 'arm64' && output.includes('arm64')) {
        log(`  ✓ Binary compiled for ARM64`, 'green');
        return true;
      } else if (arch === 'x64' && output.includes('x86_64')) {
        log(`  ✓ Binary compiled for x64`, 'green');
        return true;
      } else {
        log(`  ⚠ Binary architecture mismatch`, 'yellow');
        return false;
      }
    } catch (error) {
      log(`  Could not verify binary: ${error.message}`, 'yellow');
      return false;
    }
  }
  
  return true;
}

function verifyNativeModules() {
  log('\n=== Native Module Verification ===', 'cyan');
  
  const arch = getSystemArchitecture();
  const results = [];
  
  // Check sharp
  log('\n[1/3] Checking sharp...', 'cyan');
  const sharpOk = checkNodeModule('sharp');
  if (sharpOk) {
    checkNativeBinary('sharp', 'build/Release/sharp-darwin-arm64.node');
  }
  results.push({ module: 'sharp', success: sharpOk });
  
  // Check canvas
  log('\n[2/3] Checking canvas...', 'cyan');
  const canvasOk = checkNodeModule('canvas');
  if (canvasOk) {
    checkNativeBinary('canvas', 'build/Release/canvas.node');
  }
  results.push({ module: 'canvas', success: canvasOk });
  
  // Check screenshot-desktop
  log('\n[3/3] Checking screenshot-desktop...', 'cyan');
  const screenshotOk = checkNodeModule('screenshot-desktop');
  results.push({ module: 'screenshot-desktop', success: screenshotOk });
  
  // Summary
  log('\n=== Verification Summary ===', 'cyan');
  const allSuccess = results.every(r => r.success);
  
  results.forEach(({ module, success }) => {
    const status = success ? '✓' : '✗';
    const color = success ? 'green' : 'red';
    log(`${status} ${module}`, color);
  });
  
  if (allSuccess) {
    log('\n✓ All native modules verified successfully!', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some native modules failed verification', 'red');
    log('\nTry running: npm run postinstall', 'yellow');
    process.exit(1);
  }
}

// Run verification
verifyNativeModules();
