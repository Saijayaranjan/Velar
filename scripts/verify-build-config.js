#!/usr/bin/env node

/**
 * Build Configuration Verification Script
 * 
 * Verifies that the build configuration is properly set up for ARM64 support.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }
}

function checkPackageJson() {
  log('\n=== Checking package.json Configuration ===', 'cyan');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const checks = [];
  
  // Check build configuration
  if (pkg.build) {
    log('✓ Build configuration exists', 'green');
    
    // Check asarUnpack
    if (pkg.build.asarUnpack && pkg.build.asarUnpack.length > 0) {
      log(`✓ asarUnpack configured (${pkg.build.asarUnpack.length} patterns)`, 'green');
      checks.push(true);
    } else {
      log('✗ asarUnpack not configured', 'red');
      checks.push(false);
    }
    
    // Check mac configuration
    if (pkg.build.mac) {
      log('✓ macOS build configuration exists', 'green');
      
      // Check architectures
      if (pkg.build.mac.target && pkg.build.mac.target[0].arch) {
        const archs = pkg.build.mac.target[0].arch;
        if (archs.includes('arm64') && archs.includes('x64')) {
          log(`✓ Multi-architecture support: ${archs.join(', ')}`, 'green');
          checks.push(true);
        } else {
          log(`⚠ Limited architecture support: ${archs.join(', ')}`, 'yellow');
          checks.push(false);
        }
      }
      
      // Check hardened runtime
      if (pkg.build.mac.hardenedRuntime) {
        log('✓ Hardened runtime enabled', 'green');
        checks.push(true);
      } else {
        log('⚠ Hardened runtime not enabled', 'yellow');
        checks.push(false);
      }
      
      // Check entitlements
      if (pkg.build.mac.entitlements) {
        log(`✓ Entitlements configured: ${pkg.build.mac.entitlements}`, 'green');
        checks.push(true);
      } else {
        log('⚠ Entitlements not configured', 'yellow');
        checks.push(false);
      }
    } else {
      log('✗ macOS build configuration missing', 'red');
      checks.push(false);
    }
    
    // Check afterSign hook
    if (pkg.build.afterSign) {
      log(`✓ Notarization hook configured: ${pkg.build.afterSign}`, 'green');
      checks.push(true);
    } else {
      log('⚠ Notarization hook not configured', 'yellow');
      checks.push(false);
    }
  } else {
    log('✗ Build configuration missing', 'red');
    checks.push(false);
  }
  
  // Check scripts
  log('\n=== Checking Build Scripts ===', 'cyan');
  
  const requiredScripts = [
    'app:build:mac',
    'app:build:mac:arm64',
    'app:build:mac:x64',
    'verify:native',
    'detect:arch'
  ];
  
  requiredScripts.forEach(script => {
    if (pkg.scripts && pkg.scripts[script]) {
      log(`✓ Script '${script}' exists`, 'green');
      checks.push(true);
    } else {
      log(`✗ Script '${script}' missing`, 'red');
      checks.push(false);
    }
  });
  
  return checks.every(c => c);
}

function verifyBuildConfig() {
  log('\n=== Build Configuration Verification ===', 'cyan');
  
  const results = [];
  
  // Check required files
  log('\n=== Checking Required Files ===', 'cyan');
  results.push(checkFile('build/entitlements.mac.plist', 'Entitlements file'));
  results.push(checkFile('scripts/notarize.js', 'Notarization script'));
  results.push(checkFile('scripts/verify-native-modules.js', 'Native module verification'));
  results.push(checkFile('scripts/detect-arch.js', 'Architecture detection'));
  results.push(checkFile('build/CODE_SIGNING.md', 'Code signing documentation'));
  
  // Check package.json configuration
  results.push(checkPackageJson());
  
  // Summary
  log('\n=== Verification Summary ===', 'cyan');
  
  if (results.every(r => r)) {
    log('\n✓ All build configuration checks passed!', 'green');
    log('\nYou can now build the application:', 'cyan');
    log('  npm run app:build:mac        # Build for both architectures', 'cyan');
    log('  npm run app:build:mac:arm64  # Build for ARM64 only', 'cyan');
    log('  npm run app:build:mac:x64    # Build for x64 only', 'cyan');
    process.exit(0);
  } else {
    log('\n✗ Some configuration checks failed', 'red');
    log('\nPlease review the errors above and fix the configuration.', 'yellow');
    process.exit(1);
  }
}

// Run verification
verifyBuildConfig();
