#!/usr/bin/env node

/**
 * Architecture Detection Script
 * 
 * Detects the current system architecture and provides build recommendations.
 */

const os = require('os');

const arch = os.arch();
const platform = os.platform();

console.log(`Platform: ${platform}`);
console.log(`Architecture: ${arch}`);

// Provide build recommendations
if (platform === 'darwin') {
  if (arch === 'arm64') {
    console.log('\n✓ Running on Apple Silicon (ARM64)');
    console.log('Recommended build command: npm run app:build:mac:arm64');
    console.log('For universal build: npm run app:build:mac');
  } else if (arch === 'x64') {
    console.log('\n✓ Running on Intel Mac (x64)');
    console.log('Recommended build command: npm run app:build:mac:x64');
    console.log('For universal build: npm run app:build:mac');
  }
} else {
  console.log('\nNote: ARM64 build support is configured for macOS.');
}

// Export for use in other scripts
if (require.main !== module) {
  module.exports = { arch, platform };
}
