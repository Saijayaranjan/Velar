#!/usr/bin/env node

/**
 * Notarization Script for macOS
 * 
 * This script handles the notarization process for macOS builds.
 * It runs automatically after signing via electron-builder's afterSign hook.
 * 
 * Required environment variables:
 * - APPLE_ID: Your Apple ID email
 * - APPLE_ID_PASSWORD: App-specific password
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context;
  
  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: Not a macOS build');
    return;
  }
  
  // Check if notarization credentials are available
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const appleTeamId = process.env.APPLE_TEAM_ID;
  
  if (!appleId || !appleIdPassword || !appleTeamId) {
    console.warn('⚠️  Skipping notarization: Missing credentials');
    console.warn('   Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID to enable notarization');
    return;
  }
  
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  
  console.log(`\n🔐 Notarizing ${appName}...`);
  console.log(`   App path: ${appPath}`);
  console.log(`   Apple ID: ${appleId}`);
  console.log(`   Team ID: ${appleTeamId}`);
  
  try {
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId: appleTeamId,
      tool: 'notarytool' // Use notarytool (faster than legacy altool)
    });
    
    console.log('✅ Notarization successful!');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    
    // Don't fail the build if notarization fails
    // This allows local builds without notarization
    console.warn('⚠️  Build will continue without notarization');
    console.warn('   The app may show security warnings when distributed');
  }
}

module.exports = notarizeApp;

// Allow running directly for testing
if (require.main === module) {
  console.log('Notarization script loaded successfully');
  console.log('This script runs automatically during electron-builder build process');
}
