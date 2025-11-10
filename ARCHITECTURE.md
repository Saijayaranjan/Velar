# Velar - Application Architecture

## Overview
Velar is a production-grade Electron application that provides AI-powered screenshot analysis and debugging assistance. This document outlines the architectural decisions, patterns, and best practices used throughout the application.

## Technology Stack

### Core Technologies
- **Electron**: Desktop application framework (v33.2.0)
- **React**: UI library (v18.3.1)
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework

### Key Libraries
- **@google/generative-ai**: AI/LLM integration
- **screenshot-desktop**: Native screenshot capture
- **sharp**: High-performance image processing
- **react-markdown**: Markdown rendering with remark-gfm
- **lucide-react**: Modern icon system

## Architecture Patterns

### 1. Clean Architecture Principles

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  (React Components, UI, Pages)          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│          Application Layer              │
│  (Hooks, State Management, IPC)         │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Service Layer                 │
│  (Business Logic, Helpers)              │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│          Infrastructure Layer           │
│  (Electron APIs, File System, Network)  │
└─────────────────────────────────────────┘
```

### 2. Project Structure

```
free-cluely/
├── electron/                 # Electron main process
│   ├── main.ts              # Application entry point
│   ├── preload.ts           # Bridge between main/renderer
│   ├── ipcHandlers.ts       # IPC communication handlers
│   ├── services/            # Business logic services
│   │   ├── LLMHelper.ts     # AI/LLM service
│   │   ├── ScreenshotHelper.ts
│   │   └── ProcessingHelper.ts
│   ├── utils/               # Utility functions
│   │   ├── WindowHelper.ts  # Window management
│   │   └── shortcuts.ts     # Keyboard shortcuts
│   └── tsconfig.json
│
├── src/                     # React renderer process
│   ├── _pages/              # Page components
│   │   ├── Queue.tsx        # Screenshot queue page
│   │   ├── Solutions.tsx    # Solutions/results page
│   │   └── Debug.tsx        # Debug page
│   ├── components/          # Reusable components
│   │   ├── Queue/
│   │   ├── Solutions/
│   │   └── ui/              # UI primitives
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Frontend services
│   ├── types/               # TypeScript definitions
│   ├── lib/                 # Utilities
│   ├── constants/           # App constants
│   └── utils/               # Helper functions
│
├── assets/                  # Static assets
├── dist/                    # Vite build output
├── dist-electron/           # Electron build output
└── release/                 # App distribution packages
```

### 3. Communication Architecture

#### IPC (Inter-Process Communication)
```
Renderer Process          Main Process
     │                         │
     ├──invoke('method')──────►│
     │                         │
     │                    [Process]
     │                         │
     │◄──────response──────────┤
     │                         │
```

**Security Principles:**
- Context isolation enabled
- Node integration disabled in renderer
- Preload script as secure bridge
- Whitelist allowed IPC channels

### 4. State Management

**Local Component State:**
- `useState` for simple UI state
- `useReducer` for complex state logic

**Global State:**
- React Context for theme/settings
- IPC for cross-process communication

**Async State:**
- Custom hooks for data fetching
- Error boundaries for error handling

### 5. Error Handling Strategy

```typescript
┌─────────────────────────────────────────┐
│         User Action                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    Try-Catch in Component              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    Error Boundary (React)              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    Logging & User Notification         │
└─────────────────────────────────────────┘
```

## Design Patterns

### 1. Service Pattern
Business logic encapsulated in service classes:
- `LLMService`: AI operations
- `ScreenshotService`: Capture & processing
- `StorageService`: Data persistence
- `AudioService`: Audio analysis

### 2. Repository Pattern
Data access abstraction for future scalability:
- Settings repository
- Screenshot repository
- Solution repository

### 3. Observer Pattern
Event-driven architecture for:
- Screenshot queue updates
- IPC message handling
- Window state changes

### 4. Factory Pattern
For creating complex objects:
- Window factory
- Screenshot factory
- Response factory

## Performance Optimizations

### Frontend
1. **Code Splitting**: Lazy load pages and heavy components
2. **Memoization**: `React.memo`, `useMemo`, `useCallback`
3. **Virtual Scrolling**: For large lists
4. **Debouncing**: User input handling
5. **Image Optimization**: Sharp for processing, lazy loading

### Backend (Electron)
1. **Worker Threads**: CPU-intensive tasks
2. **Streaming**: Large file operations
3. **Caching**: LLM responses, processed images
4. **Batch Processing**: Queue management
5. **Memory Management**: Proper cleanup, weak references

### Build Optimization
1. **Tree Shaking**: Remove unused code
2. **Minification**: Code compression
3. **Asset Optimization**: Image compression
4. **Bundle Analysis**: Identify bottlenecks
5. **Code Splitting**: Smaller initial bundles

## Security Measures

### 1. Input Validation
- Sanitize all user inputs
- Type validation with TypeScript
- Schema validation for complex data
- Path traversal prevention

### 2. API Security
- API key encryption
- Rate limiting
- Request validation
- Error message sanitization

### 3. Electron Security
- Context isolation enabled
- Node integration disabled
- Preload script sandboxing
- CSP (Content Security Policy)
- Secure IPC channels

### 4. Data Protection
- Sensitive data encryption
- Secure storage
- Memory cleanup
- No credential logging

## Scalability Considerations

### Current Scale
- Single user desktop application
- Local processing
- Screenshot queue < 100 items

### Future Scale Support
1. **Multi-user support**: User profiles
2. **Cloud sync**: Settings & history
3. **Plugin system**: Extensibility
4. **Batch processing**: Bulk operations
5. **Export/Import**: Data portability

## Testing Strategy

### Unit Tests
- Utility functions
- Service methods
- Type guards
- Validators

### Integration Tests
- IPC communication
- Service interactions
- Component integration

### E2E Tests
- User workflows
- Screenshot capture
- AI analysis flow

### Performance Tests
- Memory usage
- CPU usage
- Response times
- Bundle size

## Monitoring & Logging

### Logging Levels
- **ERROR**: Critical failures
- **WARN**: Recoverable issues
- **INFO**: Important events
- **DEBUG**: Detailed information

### Metrics
- Performance metrics
- Error rates
- User actions
- System resources

## Best Practices

### Code Style
1. **Naming Conventions**:
   - PascalCase for components, classes
   - camelCase for functions, variables
   - UPPER_SNAKE_CASE for constants
   - kebab-case for files

2. **File Organization**:
   - One component per file
   - Colocate related files
   - Index files for exports

3. **TypeScript**:
   - Strict mode enabled
   - Explicit return types
   - No `any` types
   - Interface over type when possible

4. **React**:
   - Functional components
   - Custom hooks for logic reuse
   - Prop types defined
   - Error boundaries

5. **Comments**:
   - JSDoc for all exports
   - Inline for complex logic
   - TODO with ticket numbers
   - Document why, not what

### Git Workflow
1. Feature branches
2. Conventional commits
3. PR reviews required
4. CI/CD checks

## Dependencies Management

### Update Strategy
- Regular security updates
- Test before major version bumps
- Lock file committed
- Audit dependencies monthly

### Bundle Size
- Monitor with `webpack-bundle-analyzer`
- Remove unused dependencies
- Use tree-shakeable imports
- Consider bundle alternatives

## Deployment

### Build Process
```bash
npm run clean          # Clean previous builds
npm run build          # Build renderer
tsc -p electron        # Build main process
electron-builder      # Package app
```

### Distribution
- macOS: DMG (x64, arm64)
- Windows: NSIS installer, Portable
- Linux: AppImage, DEB

### Auto-Updates
- GitHub releases
- Signature verification
- Staged rollout support

## Documentation Standards

### Code Documentation
- All exports have JSDoc
- Complex algorithms explained
- Edge cases documented
- Examples provided

### API Documentation
- IPC channels documented
- Request/response schemas
- Error codes defined
- Usage examples

### User Documentation
- README.md for setup
- CHANGELOG.md for versions
- FAQ for common issues
- Keyboard shortcuts reference

## Maintenance

### Regular Tasks
- [ ] Update dependencies
- [ ] Review error logs
- [ ] Analyze performance metrics
- [ ] Update documentation
- [ ] Review security advisories

### Code Reviews Focus
- Performance implications
- Security vulnerabilities
- Type safety
- Error handling
- Documentation

## Contributing Guidelines

1. Follow architecture patterns
2. Add tests for new features
3. Update documentation
4. Follow code style guide
5. Keep PRs focused and small

## Version History

- **v1.0.0**: Initial production release
  - Core screenshot & AI features
  - Production-grade architecture
  - Comprehensive error handling
  - Performance optimizations

---

**Last Updated**: 2025-11-10
**Maintainer**: Velar Team
**Status**: Production
