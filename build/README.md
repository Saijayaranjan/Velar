# Build Configuration

This directory contains build-related configuration files for the Velar application.

## Files

### entitlements.mac.plist

Defines the entitlements (permissions) required for the macOS application. This file is used during code signing to specify what system resources the app needs access to.

Key entitlements:
- **JIT compilation**: Required for V8 JavaScript engine
- **Unsigned executable memory**: Required for Electron
- **Library validation disabled**: Required for native modules (sharp, canvas, screenshot-desktop)
- **Network client**: Required for AI API calls
- **User selected files**: For file operations
- **Apple Events**: For global shortcuts and automation

### CODE_SIGNING.md

Comprehensive guide for setting up code signing and notarization for macOS builds. This includes:
- Prerequisites and requirements
- Step-by-step setup instructions
- Environment variable configuration
- Verification commands
- Troubleshooting tips
- CI/CD integration examples

## Build Process

The build process for ARM64 support includes:

1. **Multi-architecture compilation**: Builds for both ARM64 (Apple Silicon) and x64 (Intel)
2. **Native module handling**: Ensures sharp, canvas, and screenshot-desktop compile correctly
3. **Code signing**: Signs the application with Developer ID certificate
4. **Notarization**: Submits to Apple for notarization (macOS 10.15+)
5. **DMG creation**: Creates installer packages for distribution

## Quick Start

### Local Development Build

```bash
# Build for current architecture
npm run app:build:mac:arm64  # On Apple Silicon
npm run app:build:mac:x64    # On Intel Mac

# Build for both architectures (universal)
npm run app:build:mac
```

### Production Build with Code Signing

1. Set up environment variables (see CODE_SIGNING.md)
2. Run the build:
   ```bash
   npm run app:build:mac
   ```

### Verify Configuration

```bash
# Check build configuration
npm run verify:build-config

# Verify native modules
npm run verify:native

# Detect system architecture
npm run detect:arch
```

## Architecture Support

The application supports the following architectures:

- **ARM64** (arm64): Native Apple Silicon (M1/M2/M3) builds
- **x64** (x86_64): Intel Mac builds

Each architecture gets its own optimized build, resulting in better performance and smaller download sizes compared to universal binaries.

## File Exclusions

The build configuration excludes unnecessary files to reduce bundle size:
- Documentation files (README, CHANGELOG)
- Test files and directories
- TypeScript definition files (*.d.ts)
- Development configuration files
- Source maps (in production)

## Native Modules

The following native modules are unpacked from the asar archive for proper loading:

- **sharp**: Image processing library
- **canvas**: HTML5 Canvas implementation
- **screenshot-desktop**: Screenshot capture functionality

These modules contain native binaries that must be accessible at runtime.

## Security

The build process implements several security measures:

1. **Hardened Runtime**: Enabled for all macOS builds
2. **Code Signing**: Required for distribution
3. **Notarization**: Required for macOS 10.15+
4. **Entitlements**: Minimal required permissions
5. **Gatekeeper**: Configured to pass security checks

## Troubleshooting

### Build Fails

1. Check that all dependencies are installed: `npm install`
2. Verify native modules compile: `npm run verify:native`
3. Check build configuration: `npm run verify:build-config`

### Code Signing Issues

1. Ensure Developer ID certificate is installed
2. Check environment variables are set correctly
3. Verify certificate is not expired
4. See CODE_SIGNING.md for detailed troubleshooting

### Native Module Errors

1. Run postinstall script: `npm run postinstall`
2. Verify modules: `npm run verify:native`
3. Check architecture matches: `npm run detect:arch`

## CI/CD Integration

For automated builds in CI/CD pipelines:

1. Store certificates and credentials as secrets
2. Set environment variables in the pipeline
3. Run build commands
4. Upload artifacts to releases

See CODE_SIGNING.md for detailed CI/CD setup instructions.

## References

- [electron-builder Documentation](https://www.electron.build/)
- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Notarization Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
