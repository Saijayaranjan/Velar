# Code Signing and Notarization Guide

This guide explains how to set up code signing and notarization for Velar on macOS.

## Prerequisites

1. **Apple Developer Account**: You need an active Apple Developer account ($99/year)
2. **Developer ID Certificate**: Download from Apple Developer portal
3. **App-Specific Password**: For notarization

## Step 1: Install Developer ID Certificate

1. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Create a new "Developer ID Application" certificate
3. Download and install it in your Keychain
4. Verify installation:
   ```bash
   security find-identity -v -p codesigning
   ```

## Step 2: Set Environment Variables

Add these to your `.env` file or CI/CD secrets:

```bash
# Code Signing
CSC_LINK=/path/to/certificate.p12  # Or use CSC_NAME with certificate name
CSC_KEY_PASSWORD=your_certificate_password

# Notarization (required for macOS 10.15+)
APPLE_ID=your@apple.id
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=your_team_id
```

### Getting App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to Security → App-Specific Passwords
4. Generate a new password for "Velar Notarization"
5. Save this password securely

### Finding Your Team ID

```bash
# List all teams
xcrun altool --list-providers -u "your@apple.id" -p "app-specific-password"
```

## Step 3: Configure electron-builder

The configuration is already set up in `package.json`:

```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "afterSign": "scripts/notarize.js"
  }
}
```

## Step 4: Build with Code Signing

```bash
# Build for current architecture
npm run app:build:mac

# Build for specific architecture
npm run app:build:mac:arm64
npm run app:build:mac:x64
```

## Step 5: Verify Code Signing

After building, verify the signature:

```bash
# Check code signature
codesign -dv --verbose=4 release/mac/Velar.app

# Verify signature
codesign --verify --deep --strict --verbose=2 release/mac/Velar.app

# Check entitlements
codesign -d --entitlements - release/mac/Velar.app
```

## Step 6: Verify Notarization

After notarization completes:

```bash
# Check notarization status
spctl -a -vvv -t install release/mac/Velar.app

# Should output: "accepted" and "source=Notarized Developer ID"
```

## Troubleshooting

### "No identity found" Error

- Ensure your Developer ID certificate is installed in Keychain
- Check that CSC_LINK or CSC_NAME is set correctly
- Verify certificate is not expired

### Notarization Fails

- Check Apple ID and password are correct
- Ensure app-specific password is used (not regular password)
- Verify Team ID is correct
- Check notarization logs:
  ```bash
  xcrun altool --notarization-history 0 -u "your@apple.id" -p "app-specific-password"
  ```

### Entitlements Issues

- Ensure entitlements.mac.plist is valid XML
- Check that required entitlements match app capabilities
- Some entitlements require specific provisioning profiles

## CI/CD Integration

For GitHub Actions, add secrets:

1. Go to repository Settings → Secrets
2. Add the following secrets:
   - `CSC_LINK`: Base64-encoded certificate
   - `CSC_KEY_PASSWORD`: Certificate password
   - `APPLE_ID`: Your Apple ID
   - `APPLE_ID_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Your team ID

Example workflow:

```yaml
- name: Build and Sign
  env:
    CSC_LINK: ${{ secrets.CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: npm run app:build:mac
```

## Security Best Practices

1. **Never commit certificates or passwords** to version control
2. Use environment variables or secure secret management
3. Rotate app-specific passwords periodically
4. Keep certificates backed up securely
5. Use different certificates for development and distribution

## References

- [Electron Code Signing](https://www.electron.build/code-signing)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-builder Documentation](https://www.electron.build/)
