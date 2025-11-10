# Building Velar

Quick reference guide for building Velar with ARM64 support.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- macOS (for macOS builds)
- Xcode Command Line Tools (for macOS builds)

## Quick Start

### Install Dependencies

```bash
npm install
```

This will automatically rebuild native modules for your architecture.

### Development Build

```bash
# Build for your current architecture
npm run app:build:mac:arm64  # On Apple Silicon
npm run app:build:mac:x64    # On Intel Mac

# Or let the system detect and recommend
npm run detect:arch
```

### Production Build

```bash
# Build for both ARM64 and x64 (recommended for distribution)
npm run app:build:mac
```

The built application will be in the `release/` directory.

## Verification

### Verify Build Configuration

```bash
npm run verify:build-config
```

This checks that all build configuration is properly set up.

### Verify Native Modules

```bash
npm run verify:native
```

This verifies that sharp, canvas, and screenshot-desktop are properly compiled for your architecture.

### Detect Architecture

```bash
npm run detect:arch
```

This shows your system architecture and recommends the appropriate build command.

## Build Outputs

After building, you'll find:

- **DMG Installers**: `release/Velar-{version}-arm64.dmg` and `release/Velar-{version}.dmg`
- **App Bundle**: `release/mac/Velar.app` or `release/mac-arm64/Velar.app`
- **Build Metadata**: `release/latest-mac.yml`

## Code Signing (Optional)

For distribution, you'll want to code sign and notarize your builds.

### Setup

1. Get an Apple Developer ID certificate
2. Create an app-specific password at appleid.apple.com
3. Set environment variables:

```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_certificate_password
export APPLE_ID=your@apple.id
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=your_team_id
```

### Build with Signing

```bash
npm run app:build:mac
```

The build will automatically sign and notarize if credentials are provided.

For detailed instructions, see `build/CODE_SIGNING.md`.

## Troubleshooting

### Native Module Errors

If you get errors about native modules:

```bash
npm run postinstall
npm run verify:native
```

### Build Configuration Issues

```bash
npm run verify:build-config
```

### Architecture Mismatch

Make sure you're building for the correct architecture:

```bash
npm run detect:arch
```

## Available Build Scripts

| Script | Description |
|--------|-------------|
| `npm run app:build:mac` | Build for both ARM64 and x64 |
| `npm run app:build:mac:arm64` | Build for ARM64 only |
| `npm run app:build:mac:x64` | Build for x64 only |
| `npm run verify:build-config` | Verify build configuration |
| `npm run verify:native` | Verify native modules |
| `npm run detect:arch` | Detect system architecture |

## More Information

- Build configuration: `build/README.md`
- Code signing guide: `build/CODE_SIGNING.md`
- Implementation details: `build/IMPLEMENTATION_SUMMARY.md`

## Support

If you encounter issues:

1. Run verification scripts to diagnose the problem
2. Check the documentation in the `build/` directory
3. Ensure all dependencies are installed: `npm install`
4. Make sure you're on a supported platform (macOS for Mac builds)
