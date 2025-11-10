# Developer Setup Guide

## Quick Start

### 1. Prerequisites
```bash
# Node.js 18+ and npm
node --version  # v18.0.0 or higher
npm --version   # 9.0.0 or higher

# Git
git --version

# (Optional) Ollama for local AI
ollama --version
```

### 2. Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd free-cluely

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your API keys
```

### 3. Development
```bash
# Start development server
npm start

# This runs:
# 1. Vite dev server (port 5180)
# 2. TypeScript compiler for Electron
# 3. Electron app with hot reload
```

## Project Structure

```
free-cluely/
├── electron/               # Electron main process
│   ├── main.ts            # App entry point
│   ├── preload.ts         # Secure bridge
│   ├── ipcHandlers.ts     # IPC message handlers
│   ├── LLMHelper.ts       # AI service
│   ├── ScreenshotHelper.ts # Screenshot logic
│   ├── ProcessingHelper.ts # Image processing
│   ├── WindowHelper.ts    # Window management
│   └── shortcuts.ts       # Keyboard shortcuts
│
├── src/                   # React renderer process
│   ├── _pages/           # Page components
│   ├── components/       # Reusable components
│   ├── constants/        # App constants & config
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   ├── lib/              # Third-party integrations
│   ├── hooks/            # Custom React hooks (to add)
│   └── services/         # Frontend services (to add)
│
├── assets/               # Static assets
├── dist/                 # Vite build output
├── dist-electron/        # Electron build output
└── release/              # Distribution packages
```

## Development Workflow

### Running the App
```bash
# Development mode (recommended)
npm start

# Build only (no run)
npm run build

# Production build
npm run dist
```

### TypeScript Compilation
```bash
# Watch mode (auto-recompile)
npm run watch

# One-time compile
npm run electron:build
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## Architecture Overview

### Clean Architecture Layers

1. **Presentation Layer** (src/)
   - React components
   - UI logic
   - User interactions

2. **Application Layer** (src/hooks, src/services)
   - Business logic
   - State management
   - IPC communication

3. **Service Layer** (electron/)
   - Core functionality
   - External integrations
   - System APIs

4. **Infrastructure** (electron/)
   - Electron APIs
   - File system
   - Network

### Key Patterns

#### Error Handling
```typescript
import { AppError, createError } from '@/utils/errors';

try {
  // Operation
} catch (error) {
  const appError = createError(error, 'Operation failed');
  logger.error('Error occurred', { error: appError.toJSON() });
  throw appError;
}
```

#### Logging
```typescript
import { logger } from '@/utils/logger';

logger.info('Screenshot captured', { path, size });
logger.error('Failed to process', { error }, err);
logger.debug('Debug info', { details });
```

#### Validation
```typescript
import { validateApiKey, sanitizeString } from '@/utils/validation';

const result = validateApiKey(apiKey);
if (!result.isValid) {
  throw new ValidationError('Invalid API key', result.errors);
}
```

#### Configuration
```typescript
import { config } from '@/constants/config';
import { SCREENSHOT_CONFIG } from '@/constants/app.constants';

const maxSize = SCREENSHOT_CONFIG.MAX_FILE_SIZE_MB;
const apiKey = config.api.gemini.apiKey;
```

## Common Tasks

### Adding a New Feature

1. **Create types** (src/types/)
```typescript
// src/types/myFeature.ts
export interface MyFeature {
  id: string;
  name: string;
  // ...
}
```

2. **Add constants** (src/constants/)
```typescript
// src/constants/app.constants.ts
export const MY_FEATURE_CONFIG = {
  MAX_ITEMS: 10,
  // ...
} as const;
```

3. **Create service** (electron/ or src/services/)
```typescript
// electron/MyFeatureHelper.ts
export class MyFeatureHelper {
  async doSomething(): Promise<Result> {
    try {
      // Implementation
    } catch (error) {
      throw createError(error, 'Feature failed');
    }
  }
}
```

4. **Add IPC handler** (electron/ipcHandlers.ts)
```typescript
ipcMain.handle('my-feature-action', async (event, ...args) => {
  try {
    const result = await myFeatureHelper.doSomething();
    return result;
  } catch (error) {
    logger.error('IPC error', { error });
    throw error;
  }
});
```

5. **Create component** (src/components/)
```typescript
// src/components/MyFeature.tsx
export function MyFeature() {
  const handleAction = async () => {
    try {
      const result = await window.electronAPI.invoke('my-feature-action');
      // Handle success
    } catch (error) {
      logger.error('Action failed', { error });
      // Handle error
    }
  };
  
  return <div>{/* UI */}</div>;
}
```

6. **Add tests**
```typescript
// src/components/__tests__/MyFeature.test.tsx
describe('MyFeature', () => {
  it('should render', () => {
    // Test
  });
});
```

### Adding a New Error Type

```typescript
// src/utils/errors.ts
export class MyFeatureError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'MY_FEATURE_ERROR', 500, true, context);
  }
}
```

### Adding Configuration

```typescript
// src/constants/app.constants.ts
export const MY_CONFIG = {
  TIMEOUT: 5000,
  MAX_RETRIES: 3,
} as const;
```

## Testing

### Unit Tests
```typescript
// utils/__tests__/validation.test.ts
import { validateApiKey } from '../validation';

describe('validateApiKey', () => {
  it('validates correct key', () => {
    const result = validateApiKey('valid_key_123');
    expect(result.isValid).toBe(true);
  });
});
```

### Integration Tests
```typescript
// services/__tests__/LLMHelper.test.ts
describe('LLMHelper', () => {
  it('processes screenshot', async () => {
    const helper = new LLMHelper();
    const result = await helper.analyzeScreenshot(mockImage);
    expect(result).toBeDefined();
  });
});
```

### E2E Tests
```typescript
// e2e/screenshot.spec.ts
describe('Screenshot Flow', () => {
  it('captures and analyzes screenshot', async () => {
    // Simulate Cmd+H
    // Wait for screenshot
    // Simulate Cmd+Enter
    // Verify result
  });
});
```

## Debugging

### Electron Main Process
```typescript
// In electron/main.ts
console.log('Main process debug:', data);

// Or use logger
logger.debug('Main process event', { data });
```

### React Renderer
```typescript
// In any component
console.log('Component debug:', state);

// Open DevTools: Cmd+Option+I (Mac) or F12
```

### IPC Communication
```typescript
// Log all IPC calls
ipcMain.on('*', (event, ...args) => {
  logger.debug('IPC call', { channel: event, args });
});
```

## Performance Optimization

### React Performance
```typescript
// Memoize expensive components
const MemoizedComponent = React.memo(MyComponent);

// Memoize values
const expensiveValue = useMemo(() => compute(), [deps]);

// Memoize callbacks
const handleClick = useCallback(() => {}, [deps]);
```

### Image Optimization
```typescript
// Use Sharp for processing
const thumbnail = await sharp(buffer)
  .resize(200, 150)
  .jpeg({ quality: 80 })
  .toBuffer();
```

### Debouncing
```typescript
import { debounce } from '@/utils/performance';

const handleSearch = debounce((query) => {
  // Search logic
}, 300);
```

## Build & Distribution

### Development Build
```bash
npm run build
```

### Production Build
```bash
npm run dist
```

### Platform-Specific
```bash
# macOS only
npm run dist -- --mac

# Windows only
npm run dist -- --win

# Linux only
npm run dist -- --linux
```

## Environment Variables

```env
# Required
VITE_GEMINI_API_KEY=your_key_here

# Optional
VITE_OLLAMA_ENDPOINT=http://localhost:11434
VITE_LOG_LEVEL=debug
VITE_ENABLE_DEVTOOLS=true
```

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 5180
lsof -i :5180
kill -9 <PID>
```

### TypeScript Errors
```bash
# Clean and rebuild
rm -rf dist dist-electron node_modules
npm install
npm run build
```

### Sharp Build Issues
```bash
# Use prebuilt binaries
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --ignore-scripts
npm rebuild sharp
```

## Best Practices

### Code Style
- Use TypeScript strict mode
- No `any` types
- Explicit return types
- PascalCase for components
- camelCase for functions
- UPPER_SNAKE_CASE for constants

### Error Handling
- Always use try-catch
- Log errors with context
- Throw typed errors
- Handle errors in UI

### Performance
- Lazy load heavy components
- Memoize expensive calculations
- Debounce user inputs
- Use virtual scrolling for lists

### Security
- Validate all inputs
- Sanitize user data
- No credentials in logs
- Use secure IPC channels

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Vite Guide](https://vitejs.dev/guide)

## Getting Help

1. Check `ARCHITECTURE.md` for design decisions
2. Check `PRODUCTION_IMPROVEMENTS.md` for implementation details
3. Search existing issues on GitHub
4. Ask in discussions

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### PR Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Keep changes focused
- Add meaningful commit messages
