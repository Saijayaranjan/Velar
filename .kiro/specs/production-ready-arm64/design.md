# Design Document: Production-Ready ARM64 Support

## Overview

This design document outlines the architecture and implementation strategy for making the Velar application production-ready with proper ARM64 support for macOS. The application is an Electron-based AI-powered desktop assistant that requires security hardening, performance optimization, proper error handling, and verified multi-architecture build support.

The design focuses on eight key areas:
1. Security and credential management
2. Production logging and error handling
3. ARM64 architecture support
4. Build configuration and optimization
5. Environment configuration management
6. Code quality and production readiness
7. Testing and verification
8. Distribution and updates

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Velar Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Main Process    │◄───────►│ Renderer Process │          │
│  │  (Electron)      │   IPC   │  (React + Vite)  │          │
│  └────────┬─────────┘         └──────────────────┘          │
│           │                                                   │
│           ├─► WindowHelper                                   │
│           ├─► ScreenshotHelper                               │
│           ├─► ProcessingHelper                               │
│           ├─► ShortcutsHelper                                │
│           └─► ConfigManager (NEW)                            │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                   Security Layer (NEW)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Encrypted Credential Storage                       │   │
│  │  • Environment Validation                             │   │
│  │  • Secure Configuration Management                    │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   Logging Layer (NEW)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Structured Logger (Winston/Pino)                   │   │
│  │  • Log Rotation & Management                          │   │
│  │  • Error Tracking & Reporting                         │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   Build System                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • electron-builder (multi-arch)                      │   │
│  │  • Native Module Compilation (sharp, canvas)          │   │
│  │  • Code Signing & Notarization                        │   │
│  │  • Asset Optimization                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Action → Main Process → Security Check → Logger → Business Logic → Response
                    ↓
              ConfigManager → Encrypted Storage
                    ↓
              Error Handler → User-Friendly Message
```

## Components and Interfaces

### 1. Security and Credential Management

#### ConfigManager (New Component)

**Purpose**: Centralized configuration management with secure credential storage.

**Design Decision**: Use Electron's `safeStorage` API for credential encryption instead of plain .env files.

**Rationale**: 
- Electron's `safeStorage` uses OS-level encryption (Keychain on macOS, Credential Vault on Windows)
- Prevents credentials from being exposed in packaged applications
- Provides a consistent API across platforms

**Interface**:
```typescript
interface ConfigManager {
  // Credential management
  setApiKey(provider: 'gemini' | 'ollama', key: string): Promise<void>
  getApiKey(provider: 'gemini' | 'ollama'): Promise<string | null>
  deleteApiKey(provider: 'gemini' | 'ollama'): Promise<void>
  
  // Configuration
  getConfig(): Promise<AppConfig>
  updateConfig(config: Partial<AppConfig>): Promise<void>
  validateConfig(): Promise<ValidationResult>
  
  // Setup state
  isFirstRun(): boolean
  markSetupComplete(): void
}

interface AppConfig {
  aiProvider: 'gemini' | 'ollama'
  ollamaEndpoint?: string
  theme: 'light' | 'dark' | 'system'
  autoUpdate: boolean
  telemetry: boolean
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

**Implementation Details**:
- Store non-sensitive config in `~/.velar/config.json`
- Store sensitive credentials using `safeStorage.encryptString()`
- Validate configuration on app startup
- Provide migration path from .env files (one-time import)

#### Setup Wizard (New Component)

**Purpose**: Guide users through initial configuration without requiring .env file editing.

**Design Decision**: Create a dedicated setup flow that appears on first launch.

**Rationale**:
- Improves user experience for non-technical users
- Ensures proper configuration before app usage
- Validates credentials before saving

**Interface**:
```typescript
interface SetupWizard {
  show(): void
  validateCredentials(provider: string, credentials: any): Promise<boolean>
  saveConfiguration(config: AppConfig): Promise<void>
  skip(): void // Allow skipping for later configuration
}
```

**UI Flow**:
1. Welcome screen
2. AI Provider selection (Gemini / Ollama)
3. Credential input with validation
4. Optional settings (auto-update, telemetry)
5. Confirmation and app launch

### 2. Production Logging and Error Handling

#### Logger Service (New Component)

**Purpose**: Structured logging with appropriate levels and secure file storage.

**Design Decision**: Use Winston for logging with custom transports.

**Rationale**:
- Winston provides flexible log levels and transports
- Supports log rotation to prevent disk space issues
- Can filter sensitive data before logging
- Production-ready with good performance

**Interface**:
```typescript
interface Logger {
  error(message: string, meta?: LogMeta): void
  warn(message: string, meta?: LogMeta): void
  info(message: string, meta?: LogMeta): void
  debug(message: string, meta?: LogMeta): void
  
  // Special methods
  logError(error: Error, context?: string): void
  setLogLevel(level: LogLevel): void
}

interface LogMeta {
  component?: string
  userId?: string
  action?: string
  [key: string]: any
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug'
```

**Implementation Details**:
- Log files stored in `~/.velar/logs/`
- Rotate logs daily, keep last 7 days
- Separate files for errors (`error.log`) and combined logs (`combined.log`)
- Filter out API keys, tokens, and PII before logging
- In production: only ERROR and WARN levels
- In development: all levels including DEBUG

#### Error Handler (New Component)

**Purpose**: Centralized error handling with user-friendly messages.

**Design Decision**: Create error boundary components and global error handlers.

**Rationale**:
- Prevents app crashes from unhandled errors
- Provides consistent error UX
- Logs errors for debugging while showing safe messages to users

**Interface**:
```typescript
interface ErrorHandler {
  handleError(error: Error, context: ErrorContext): void
  showUserError(message: string, options?: ErrorOptions): void
  reportError(error: Error, metadata?: any): Promise<void>
}

interface ErrorContext {
  component: string
  action: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface ErrorOptions {
  title?: string
  actions?: ErrorAction[]
  dismissible?: boolean
}

interface ErrorAction {
  label: string
  handler: () => void
}
```

**Error Categories**:
- **Network Errors**: "Unable to connect. Please check your internet connection."
- **API Errors**: "AI service unavailable. Please try again later."
- **Permission Errors**: "Screenshot permission required. Please enable in System Preferences."
- **Configuration Errors**: "Invalid configuration. Please check your settings."

### 3. ARM64 Architecture Support

#### Build Configuration

**Design Decision**: Configure electron-builder to produce separate ARM64 and x64 builds.

**Rationale**:
- Native ARM64 builds run significantly faster on Apple Silicon
- Separate builds allow for architecture-specific optimizations
- Users get smaller download sizes (no universal binary overhead)

**Current Configuration** (from package.json):
```json
"mac": {
  "target": [
    {
      "target": "dmg",
      "arch": ["x64", "arm64"]
    }
  ]
}
```

**Enhanced Configuration**:
```json
"mac": {
  "category": "public.app-category.productivity",
  "icon": "assets/icons/velar_icon.icns",
  "target": [
    {
      "target": "dmg",
      "arch": ["x64", "arm64"]
    }
  ],
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist"
}
```

#### Native Module Handling

**Challenge**: Native modules (sharp, canvas, screenshot-desktop) must compile for both architectures.

**Design Decision**: Use postinstall script with architecture detection.

**Implementation**:
```json
"scripts": {
  "postinstall": "electron-builder install-app-deps"
}
```

**Rationale**:
- `electron-builder install-app-deps` rebuilds native modules for Electron's version
- Automatically handles architecture-specific compilation
- Works in CI/CD environments

### 4. Build Configuration and Optimization

#### Asset Optimization

**Design Decision**: Implement multi-stage build process with optimization.

**Build Pipeline**:
```
1. Clean (rimraf dist dist-electron)
2. TypeScript Compilation (electron code)
3. Vite Build (renderer code with minification)
4. Asset Optimization (image compression, tree-shaking)
5. electron-builder Package
6. Code Signing
7. DMG Creation
```

**Optimization Strategies**:
- **JavaScript**: Vite's built-in minification and tree-shaking
- **CSS**: PostCSS with cssnano
- **Images**: Sharp for icon optimization
- **Dependencies**: Exclude devDependencies from package

**Configuration Updates**:
```json
"build": {
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "package.json",
    "!node_modules/**/{CHANGELOG.md,README.md,README,readme.md,readme}",
    "!node_modules/**/{test,__tests__,tests,powered-test,example,examples}",
    "!node_modules/**/*.d.ts",
    "!node_modules/.bin",
    "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
    "!.editorconfig",
    "!**/._*",
    "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
    "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
    "!**/{appveyor.yml,.travis.yml,circle.yml}",
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
  ],
  "asarUnpack": [
    "node_modules/sharp/**/*",
    "node_modules/canvas/**/*"
  ]
}
```

#### Code Signing

**Design Decision**: Implement proper code signing for macOS to prevent Gatekeeper warnings.

**Requirements**:
- Apple Developer ID certificate
- Entitlements file for hardened runtime
- Notarization for macOS 10.15+

**Entitlements** (`build/entitlements.mac.plist`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

### 5. Environment Configuration Management

#### Configuration Storage Strategy

**Design Decision**: Three-tier configuration system.

**Tiers**:
1. **Default Config**: Hardcoded defaults in application
2. **User Config**: Stored in `~/.velar/config.json`
3. **Runtime Config**: In-memory overrides

**Configuration Schema**:
```typescript
interface VelarConfig {
  version: string
  aiProvider: 'gemini' | 'ollama'
  ollama: {
    endpoint: string
    model: string
  }
  gemini: {
    model: string
  }
  ui: {
    theme: 'light' | 'dark' | 'system'
    startMinimized: boolean
    showInDock: boolean
  }
  shortcuts: {
    toggleWindow: string
    takeScreenshot: string
  }
  updates: {
    autoCheck: boolean
    autoDownload: boolean
  }
  telemetry: {
    enabled: boolean
    anonymousId: string
  }
}
```

#### Configuration UI

**Design Decision**: Add Settings page in renderer process.

**Features**:
- AI Provider switching with credential management
- Shortcut customization
- Theme selection
- Update preferences
- Privacy settings

**Implementation**:
- New route: `/settings`
- IPC handlers for config CRUD operations
- Real-time validation
- Apply changes without restart (where possible)

### 6. Code Quality and Production Readiness

#### Console Logging Removal

**Design Decision**: Replace all console.* calls with Logger service.

**Strategy**:
1. Create Logger wrapper that checks NODE_ENV
2. Replace console.log → logger.debug
3. Replace console.error → logger.error
4. Replace console.warn → logger.warn
5. In production, debug logs are no-ops

**Implementation**:
```typescript
// logger.ts
class Logger {
  private isProduction = process.env.NODE_ENV === 'production'
  
  debug(message: string, meta?: any) {
    if (!this.isProduction) {
      // Log to file and console in development
    }
    // No-op in production
  }
  
  error(message: string, meta?: any) {
    // Always log errors, but sanitize sensitive data
  }
}
```

#### TypeScript Strict Mode

**Design Decision**: Enable strict TypeScript checking.

**Changes to tsconfig.json**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**Rationale**:
- Catch type errors at compile time
- Improve code maintainability
- Reduce runtime errors

#### Resource Cleanup

**Design Decision**: Implement proper cleanup lifecycle.

**Areas Requiring Cleanup**:
1. **IPC Handlers**: Remove listeners on window close
2. **Global Shortcuts**: Unregister on app quit
3. **File Watchers**: Close watchers
4. **Temporary Files**: Delete screenshots on exit
5. **Timers**: Clear all intervals/timeouts

**Implementation**:
```typescript
// In main.ts
app.on('before-quit', async () => {
  await appState.cleanup()
})

// In AppState
async cleanup() {
  this.shortcutsHelper.unregisterAll()
  this.screenshotHelper.cleanupTempFiles()
  this.destroyTray()
  // ... other cleanup
}
```

### 7. Testing and Verification

#### Build Verification Script

**Design Decision**: Create automated verification script for builds.

**Script**: `scripts/verify-build.js`

**Checks**:
1. Architecture verification (lipo -info on macOS)
2. Code signing verification (codesign -dv)
3. Bundle size check
4. Required files present
5. Native modules loaded correctly
6. IPC channels functional

**Usage**:
```bash
npm run verify:build -- --arch arm64
npm run verify:build -- --arch x64
```

#### Health Check System

**Design Decision**: Implement runtime health checks.

**Health Checks**:
- Screenshot capture capability
- AI API connectivity
- IPC communication
- File system permissions
- Native module loading

**Interface**:
```typescript
interface HealthCheck {
  name: string
  check(): Promise<HealthCheckResult>
}

interface HealthCheckResult {
  healthy: boolean
  message?: string
  details?: any
}
```

**Implementation**:
- Run health checks on app startup
- Expose health check endpoint for debugging
- Log health check failures

### 8. Distribution and Updates

#### Auto-Update Configuration

**Design Decision**: Use electron-updater with GitHub releases.

**Current Configuration**:
```json
"publish": [
  {
    "provider": "github",
    "owner": "Saijayaranjan",
    "repo": "Velar"
  }
]
```

**Enhanced Update Flow**:
```
1. App starts → Check for updates (background)
2. Update available → Show notification
3. User clicks "Download" → Download in background
4. Download complete → Prompt to restart
5. User restarts → Apply update
```

**Implementation**:
```typescript
// In main.ts
import { autoUpdater } from 'electron-updater'

autoUpdater.checkForUpdatesAndNotify()

autoUpdater.on('update-available', (info) => {
  // Send to renderer
  mainWindow.webContents.send('update-available', info)
})

autoUpdater.on('update-downloaded', (info) => {
  // Prompt user to restart
  mainWindow.webContents.send('update-ready', info)
})
```

#### Release Process

**Design Decision**: Automated release workflow with GitHub Actions.

**Workflow**:
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-mac:
    runs-on: macos-latest
    strategy:
      matrix:
        arch: [x64, arm64]
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Build for ${{ matrix.arch }}
      - Sign and notarize
      - Upload artifacts
      - Create GitHub release
```

**Release Artifacts**:
- `Velar-{version}-arm64.dmg` (Apple Silicon)
- `Velar-{version}.dmg` (Intel)
- `latest-mac.yml` (update manifest)
- `CHANGELOG.md`

## Data Models

### Configuration Data Model

```typescript
// Stored in ~/.velar/config.json
interface StoredConfig {
  version: string
  created: string
  updated: string
  config: VelarConfig
}

// Encrypted credentials stored separately
interface EncryptedCredentials {
  geminiApiKey?: string
  ollamaApiKey?: string
}
```

### Log Entry Data Model

```typescript
interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  component?: string
  userId?: string
  sessionId: string
  meta?: Record<string, any>
  stack?: string
}
```

### Health Check Data Model

```typescript
interface SystemHealth {
  timestamp: string
  overall: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    [key: string]: HealthCheckResult
  }
  version: string
  platform: string
  arch: string
}
```

## Error Handling

### Error Classification

**Categories**:
1. **User Errors**: Invalid input, missing permissions
2. **System Errors**: File system, network, OS-level
3. **Application Errors**: Logic bugs, state issues
4. **External Errors**: API failures, service unavailable

### Error Handling Strategy

```typescript
class ErrorHandler {
  handle(error: Error, context: ErrorContext) {
    // 1. Log the error
    logger.error(error.message, {
      stack: error.stack,
      context
    })
    
    // 2. Determine user message
    const userMessage = this.getUserMessage(error, context)
    
    // 3. Show to user
    this.showDialog(userMessage)
    
    // 4. Report if critical
    if (context.severity === 'critical') {
      this.reportToCrashReporter(error)
    }
  }
  
  private getUserMessage(error: Error, context: ErrorContext): string {
    // Map technical errors to user-friendly messages
    if (error instanceof NetworkError) {
      return "Unable to connect. Please check your internet connection."
    }
    // ... other mappings
    return "Something went wrong. Please try again."
  }
}
```

### Unhandled Error Catching

```typescript
// Main process
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error })
  errorHandler.handle(error, {
    component: 'main',
    action: 'uncaught',
    severity: 'critical'
  })
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason })
})

// Renderer process
window.addEventListener('error', (event) => {
  logger.error('Window error', { error: event.error })
})

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', { reason: event.reason })
})
```

## Testing Strategy

### Unit Testing

**Scope**: Individual components and utilities

**Tools**: Jest, @testing-library/react

**Coverage Targets**:
- ConfigManager: 90%
- Logger: 85%
- ErrorHandler: 85%
- Utilities: 80%

**Example Tests**:
```typescript
describe('ConfigManager', () => {
  it('should encrypt API keys', async () => {
    await configManager.setApiKey('gemini', 'test-key')
    const stored = await configManager.getApiKey('gemini')
    expect(stored).toBe('test-key')
  })
  
  it('should validate configuration', async () => {
    const result = await configManager.validateConfig()
    expect(result.valid).toBe(true)
  })
})
```

### Integration Testing

**Scope**: Component interactions, IPC communication

**Tools**: Spectron (Electron testing)

**Test Scenarios**:
- Setup wizard flow
- Screenshot capture and processing
- Configuration updates
- Error handling flows

### Build Verification Testing

**Scope**: Packaged application functionality

**Automated Checks**:
- App launches successfully
- All windows render
- IPC handlers respond
- Native modules load
- Screenshots can be captured
- AI processing works

**Manual Testing Checklist**:
- [ ] Install on clean macOS (Intel)
- [ ] Install on clean macOS (Apple Silicon)
- [ ] Complete setup wizard
- [ ] Take screenshots
- [ ] Process with AI
- [ ] Update configuration
- [ ] Check for updates
- [ ] Verify tray icon
- [ ] Test global shortcuts

### Performance Testing

**Metrics**:
- App launch time: < 3 seconds
- Screenshot capture: < 500ms
- Window toggle: < 100ms
- Memory usage: < 200MB idle
- Bundle size: < 150MB

## Security Considerations

### Credential Security

**Measures**:
1. Use OS-level encryption (safeStorage)
2. Never log credentials
3. Clear credentials from memory after use
4. Validate credentials before storage
5. Provide credential deletion option

### Code Signing

**Requirements**:
- Valid Apple Developer ID
- Hardened runtime enabled
- Notarization for macOS 10.15+
- Entitlements properly configured

### Network Security

**Measures**:
1. Use HTTPS for all API calls
2. Validate SSL certificates
3. Implement request timeouts
4. Rate limiting for API calls
5. No sensitive data in URLs

### File System Security

**Measures**:
1. Store files in user directory only
2. Validate file paths (prevent traversal)
3. Set proper file permissions
4. Clean up temporary files
5. Encrypt sensitive local data

## Performance Optimization

### Startup Optimization

**Strategies**:
1. Lazy load non-critical modules
2. Defer non-essential initialization
3. Use code splitting in renderer
4. Optimize asset loading
5. Cache configuration

### Runtime Optimization

**Strategies**:
1. Debounce frequent operations
2. Use worker threads for heavy processing
3. Implement virtual scrolling for lists
4. Optimize image processing pipeline
5. Memory leak prevention

### Build Size Optimization

**Strategies**:
1. Tree-shaking unused code
2. Exclude unnecessary node_modules
3. Compress assets
4. Use asar archive
5. Split vendor bundles

## Deployment Strategy

### Release Channels

**Channels**:
1. **Stable**: Production releases (v1.0.0)
2. **Beta**: Pre-release testing (v1.0.0-beta.1)
3. **Alpha**: Early access (v1.0.0-alpha.1)

### Version Numbering

**Scheme**: Semantic Versioning (MAJOR.MINOR.PATCH)

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Build for all architectures
- [ ] Verify builds on target platforms
- [ ] Sign and notarize
- [ ] Create GitHub release
- [ ] Upload artifacts
- [ ] Update documentation
- [ ] Announce release

## Migration Strategy

### From Development to Production

**Phase 1: Security Hardening**
1. Implement ConfigManager
2. Add Setup Wizard
3. Remove .env dependency
4. Implement credential encryption

**Phase 2: Logging and Error Handling**
1. Add Logger service
2. Replace console.* calls
3. Implement ErrorHandler
4. Add error boundaries

**Phase 3: Build Optimization**
1. Configure multi-arch builds
2. Implement code signing
3. Optimize bundle size
4. Add build verification

**Phase 4: Testing and Verification**
1. Add unit tests
2. Add integration tests
3. Implement health checks
4. Create verification scripts

**Phase 5: Distribution**
1. Configure auto-updates
2. Set up GitHub releases
3. Create CI/CD pipeline
4. Document release process

### Backward Compatibility

**Considerations**:
- Migrate existing .env configurations
- Preserve user data and settings
- Maintain API compatibility
- Provide upgrade path

**Migration Script**:
```typescript
async function migrateFromEnv() {
  if (fs.existsSync('.env')) {
    const env = dotenv.parse(fs.readFileSync('.env'))
    
    // Migrate credentials
    if (env.GEMINI_API_KEY) {
      await configManager.setApiKey('gemini', env.GEMINI_API_KEY)
    }
    
    // Migrate settings
    await configManager.updateConfig({
      aiProvider: env.AI_PROVIDER || 'gemini'
    })
    
    // Backup and remove .env
    fs.renameSync('.env', '.env.backup')
  }
}
```

## Monitoring and Observability

### Metrics to Track

**Application Metrics**:
- Launch time
- Memory usage
- CPU usage
- Crash rate
- Error rate

**Feature Metrics**:
- Screenshots taken
- AI requests
- Success/failure rates
- Response times

**User Metrics**:
- Active users
- Session duration
- Feature usage
- Update adoption

### Logging Strategy

**Log Levels**:
- ERROR: Critical issues requiring attention
- WARN: Potential issues, degraded functionality
- INFO: Important events (startup, config changes)
- DEBUG: Detailed diagnostic information

**Log Retention**:
- Keep last 7 days of logs
- Rotate daily
- Compress old logs
- Max 100MB total log size

## Conclusion

This design provides a comprehensive approach to making Velar production-ready with proper ARM64 support. The key design decisions prioritize:

1. **Security**: OS-level credential encryption, no hardcoded secrets
2. **User Experience**: Setup wizard, user-friendly errors, auto-updates
3. **Performance**: Native ARM64 builds, optimized bundles, fast startup
4. **Maintainability**: Structured logging, TypeScript strict mode, proper cleanup
5. **Reliability**: Error handling, health checks, build verification

The phased implementation approach allows for incremental progress while maintaining a working application throughout the development process.
