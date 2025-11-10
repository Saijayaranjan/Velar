# Implementation Plan

- [x] 1. Set up logging infrastructure
  - Create Logger service using Winston with file transports and log rotation
  - Configure log levels (ERROR, WARN, INFO, DEBUG) with environment-based filtering
  - Implement log file storage in `~/.velar/logs/` with daily rotation
  - Add sensitive data filtering to prevent logging API keys and credentials
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Replace console logging with structured logging
  - Replace all console.log calls with logger.debug in main process files
  - Replace all console.error calls with logger.error in main process files
  - Replace all console.warn calls with logger.warn in main process files
  - Update renderer process to use logger service via IPC
  - _Requirements: 2.1, 2.2_

- [x] 3. Implement secure credential management
  - [x] 3.1 Create ConfigManager service with safeStorage integration
    - Implement setApiKey, getApiKey, deleteApiKey methods using Electron's safeStorage
    - Create configuration file structure in `~/.velar/config.json`
    - Implement configuration validation logic
    - Add first-run detection and setup state management
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.3_
  
  - [x] 3.2 Build Setup Wizard UI component
    - Create setup wizard React component with multi-step flow
    - Implement AI provider selection (Gemini/Ollama)
    - Add credential input forms with validation
    - Create IPC handlers for credential validation and storage
    - _Requirements: 1.4, 5.1, 5.2_
  
  - [x] 3.3 Integrate ConfigManager into application startup
    - Update main.ts to initialize ConfigManager on app start
    - Show setup wizard on first run or missing credentials
    - Migrate existing .env configurations to secure storage
    - Remove .env file dependency from codebase
    - _Requirements: 1.1, 1.3, 5.3_

- [x] 4. Implement error handling system
  - [x] 4.1 Create ErrorHandler service
    - Implement error classification (user, system, application, external)
    - Create user-friendly error message mapping
    - Add error dialog display functionality
    - Implement error reporting for critical issues
    - _Requirements: 2.5, 6.3_
  
  - [x] 4.2 Add global error handlers
    - Add uncaughtException handler in main process
    - Add unhandledRejection handler in main process
    - Add window error event listener in renderer
    - Add unhandledrejection event listener in renderer
    - _Requirements: 2.5, 6.3_
  
  - [x] 4.3 Create React error boundaries
    - Implement ErrorBoundary component for renderer process
    - Add error boundaries around major UI sections
    - Display user-friendly error UI when errors occur
    - Log errors to Logger service from error boundaries
    - _Requirements: 2.5_

- [x] 5. Configure ARM64 build support
  - [x] 5.1 Update electron-builder configuration
    - Configure separate ARM64 and x64 build targets for macOS
    - Add file exclusion patterns to reduce bundle size
    - Configure asar unpacking for native modules (sharp, canvas)
    - Update build scripts for multi-architecture support
    - _Requirements: 3.1, 3.2, 3.5, 4.2_
  
  - [x] 5.2 Set up native module compilation
    - Update postinstall script to use electron-builder install-app-deps
    - Verify sharp, canvas, and screenshot-desktop compile for ARM64
    - Add architecture detection for build process
    - Test native module loading on both architectures
    - _Requirements: 3.3, 3.4_
  
  - [x] 5.3 Implement code signing and notarization
    - Create entitlements.mac.plist with required permissions
    - Configure hardenedRuntime in electron-builder
    - Add code signing configuration for Apple Developer ID
    - Set up notarization workflow for macOS builds
    - _Requirements: 4.3_

- [x] 6. Optimize production build
  - [x] 6.1 Configure build optimization
    - Enable minification and tree-shaking in build configuration
    - Implement asset compression for images and icons
    - Configure code splitting for renderer process
    - Add bundle size analysis to build process
    - _Requirements: 4.1, 4.2, 4.4, 4.5_
  
  - [x] 6.2 Implement resource cleanup
    - Add cleanup method to AppState for resource disposal
    - Implement IPC handler cleanup on window close
    - Add global shortcut unregistration on app quit
    - Implement temporary file cleanup for screenshots
    - Clear all timers and intervals on shutdown
    - _Requirements: 6.4, 6.5_

- [ ] 7. Create Settings UI
  - [x] 7.1 Build Settings page component
    - Create Settings route and navigation
    - Implement AI provider selection UI
    - Add credential management interface
    - Create theme selection component
    - Add shortcut customization UI
    - _Requirements: 5.1, 5.4_
  
  - [x] 7.2 Implement configuration IPC handlers
    - Create IPC handlers for getConfig, updateConfig
    - Add IPC handlers for credential management
    - Implement configuration validation on updates
    - Add real-time configuration updates without restart
    - _Requirements: 5.4, 5.5_

- [x] 8. Implement auto-update system
  - [x] 8.1 Configure electron-updater
    - Add electron-updater dependency
    - Configure GitHub releases as update provider
    - Implement update check on app startup
    - Add update event handlers (available, downloaded)
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 8.2 Create update notification UI
    - Build update notification component
    - Add download progress indicator
    - Create restart prompt for applying updates
    - Implement user preferences for auto-updates
    - _Requirements: 8.2, 8.3_

- [ ] 9. Add health check system
  - [ ] 9.1 Implement health check framework
    - Create HealthCheck interface and base implementation
    - Implement screenshot capture health check
    - Add AI API connectivity health check
    - Create IPC communication health check
    - Add file system permissions health check
    - _Requirements: 7.5_
  
  - [ ] 9.2 Integrate health checks into startup
    - Run health checks on application startup
    - Log health check results
    - Display warnings for failed health checks
    - Create health check status endpoint for debugging
    - _Requirements: 7.5_

- [ ] 10. Create build verification system
  - [ ] 10.1 Write build verification script
    - Create scripts/verify-build.js for automated checks
    - Implement architecture verification (lipo -info)
    - Add code signing verification (codesign -dv)
    - Check bundle size and required files
    - Verify native modules load correctly
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 10.2 Add build reporting
    - Generate build report with size and dependency info
    - Create build artifact manifest
    - Add build verification to CI/CD pipeline
    - Document verification process
    - _Requirements: 7.4_

- [ ] 11. Improve TypeScript code quality
  - Enable strict mode in tsconfig.json
  - Fix type errors from strict mode enablement
  - Remove 'any' types from critical code paths
  - Add proper type definitions for IPC handlers
  - _Requirements: 6.2_

- [ ] 12. Set up CI/CD pipeline
  - [ ] 12.1 Create GitHub Actions workflow
    - Create build workflow for macOS (x64 and arm64)
    - Add automated testing to workflow
    - Implement code signing in CI
    - Configure artifact upload
    - _Requirements: 8.4_
  
  - [ ] 12.2 Configure release automation
    - Set up automatic GitHub releases on version tags
    - Generate release notes from changelog
    - Upload DMG files for both architectures
    - Create update manifest (latest-mac.yml)
    - _Requirements: 8.4, 8.5_

- [ ]* 13. Add comprehensive testing
  - [ ]* 13.1 Write unit tests for core services
    - Write tests for ConfigManager (encryption, validation)
    - Write tests for Logger (levels, filtering, rotation)
    - Write tests for ErrorHandler (classification, messages)
    - Add tests for utility functions
    - _Requirements: 6.2_
  
  - [ ]* 13.2 Create integration tests
    - Write tests for IPC communication
    - Add tests for setup wizard flow
    - Test configuration updates
    - Test error handling flows
    - _Requirements: 7.3_
  
  - [ ]* 13.3 Implement build verification tests
    - Create automated app launch test
    - Test screenshot capture functionality
    - Verify AI processing works
    - Test native module loading
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 14. Documentation and cleanup
  - Update README with setup instructions
  - Document configuration options
  - Create release checklist
  - Remove TODO comments from code
  - Update package.json metadata
  - _Requirements: 6.1_

- [x] 15. UI consistency improvements
  - [x] 15.1 Fix Setup wizard UI
    - Add draggable header bar with window controls (close button)
    - Remove opaque background to match transparent glass design
    - Ensure all steps have consistent header and controls
    - Test drag functionality across all setup steps
    - Consistent UI across the App match the UI of EVERYTHING
    - _Requirements: 5.1, 5.2_
  
  - [x] 15.2 Fix Settings page UI
    - Add draggable header bar with window controls
    - Remove opaque background gradient
    - Match main app's liquid-glass aesthetic
    - Ensure proper window dragging and closing
    - Consistent UI across the App match the UI of EVERYTHING
    - _Requirements: 5.1_
  
  - [x] 15.3 Verify window transparency
    - Remove debug background colors from WindowHelper
    - Ensure transparent window with glass effects
    - Test on both arm64 and x64 architectures
    - Verify no black blobs or artifacts
    - _Requirements: 7.1, 7.2_
