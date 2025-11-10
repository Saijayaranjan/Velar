/**
 * Application Constants
 * Centralized configuration values used throughout the application
 */

/** Application metadata */
export const APP_INFO = {
  NAME: 'Velar',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-Powered Screenshot Analysis & Debugging Assistant',
  AUTHOR: 'Velar Team',
} as const;

/** Screenshot configuration */
export const SCREENSHOT_CONFIG = {
  MAX_QUEUE_SIZE: 5,
  MAX_FILE_SIZE_MB: 10,
  SUPPORTED_FORMATS: ['png', 'jpg', 'jpeg', 'webp'] as const,
  QUALITY: {
    HIGH: 100,
    MEDIUM: 80,
    LOW: 60,
  },
  THUMBNAIL: {
    WIDTH: 200,
    HEIGHT: 150,
    FIT: 'cover' as const,
  },
} as const;

/** AI/LLM configuration */
export const LLM_CONFIG = {
  PROVIDERS: {
    GEMINI: 'gemini',
    OLLAMA: 'ollama',
  } as const,
  GEMINI: {
    MODEL: 'gemini-1.5-flash',
    MAX_TOKENS: 8000,
    TEMPERATURE: 0.7,
    API_ENDPOINT: 'https://generativelanguage.googleapis.com',
  },
  OLLAMA: {
    DEFAULT_MODEL: 'llama2',
    API_ENDPOINT: 'http://localhost:11434',
    TIMEOUT: 30000,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  },
} as const;

/** Audio configuration */
export const AUDIO_CONFIG = {
  MAX_DURATION_SECONDS: 300, // 5 minutes
  SUPPORTED_FORMATS: ['webm', 'mp3', 'wav', 'ogg'] as const,
  SAMPLE_RATE: 48000,
  CHANNELS: 1, // Mono
} as const;

/** Window configuration */
export const WINDOW_CONFIG = {
  DEFAULT: {
    WIDTH: 1000,
    HEIGHT: 700,
    MIN_WIDTH: 800,
    MIN_HEIGHT: 600,
  },
  QUEUE: {
    WIDTH: 400,
    HEIGHT: 600,
  },
  SOLUTIONS: {
    WIDTH: 1200,
    HEIGHT: 800,
  },
} as const;

/** Keyboard shortcuts */
export const KEYBOARD_SHORTCUTS = {
  TAKE_SCREENSHOT: 'CommandOrControl+H',
  TOGGLE_WINDOW: 'CommandOrControl+B',
  ANALYZE: 'CommandOrControl+Enter',
  PRIVACY_MODE: 'CommandOrControl+I',
  NAVIGATE: {
    QUEUE: 'CommandOrControl+1',
    DEBUG: 'CommandOrControl+2',
    SOLUTIONS: 'CommandOrControl+3',
  },
  REFRESH: 'CommandOrControl+R',
} as const;

/** UI configuration */
export const UI_CONFIG = {
  ANIMATION: {
    DURATION_MS: 200,
    EASING: 'ease-out',
  },
  TOAST: {
    DURATION_MS: 3000,
    POSITION: 'bottom-right' as const,
  },
  DEBOUNCE: {
    SEARCH_MS: 300,
    RESIZE_MS: 150,
    INPUT_MS: 500,
  },
  THEME: {
    PRIMARY: '#14b8a6', // Teal
    SECONDARY: '#06b6d4', // Cyan
    DARK_BG: '#18181b',
    GLASS_BLUR: '24px',
  },
} as const;

/** Performance configuration */
export const PERFORMANCE_CONFIG = {
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks for file processing
  MAX_CONCURRENT_REQUESTS: 3,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  LAZY_LOAD_THRESHOLD: 100, // pixels
} as const;

/** Storage configuration */
export const STORAGE_CONFIG = {
  PATHS: {
    SCREENSHOTS: 'screenshots',
    LOGS: 'logs',
    CACHE: 'cache',
    SETTINGS: 'settings.json',
  },
  MAX_CACHE_SIZE_MB: 100,
  AUTO_CLEANUP_DAYS: 30,
} as const;

/** Error messages */
export const ERROR_MESSAGES = {
  NETWORK: {
    NO_CONNECTION: 'No internet connection detected',
    TIMEOUT: 'Request timed out. Please try again',
    SERVER_ERROR: 'Server error occurred. Please try again later',
  },
  SCREENSHOT: {
    CAPTURE_FAILED: 'Failed to capture screenshot',
    QUEUE_FULL: 'Screenshot queue is full. Maximum 5 screenshots allowed',
    INVALID_FORMAT: 'Invalid image format',
    TOO_LARGE: 'Screenshot file size exceeds limit',
  },
  LLM: {
    API_KEY_MISSING: 'API key not configured',
    ANALYSIS_FAILED: 'Failed to analyze screenshot',
    RATE_LIMIT: 'Too many requests. Please wait a moment',
    INVALID_RESPONSE: 'Invalid response from AI service',
  },
  AUDIO: {
    RECORDING_FAILED: 'Failed to start audio recording',
    MICROPHONE_ACCESS: 'Microphone access denied',
    ANALYSIS_FAILED: 'Failed to analyze audio',
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_FORMAT: 'Invalid format',
    MIN_LENGTH: 'Minimum length not met',
    MAX_LENGTH: 'Maximum length exceeded',
  },
  GENERAL: {
    UNKNOWN: 'An unexpected error occurred',
    PERMISSION_DENIED: 'Permission denied',
    NOT_FOUND: 'Resource not found',
  },
} as const;

/** Success messages */
export const SUCCESS_MESSAGES = {
  SCREENSHOT: {
    CAPTURED: 'Screenshot captured successfully',
    DELETED: 'Screenshot removed',
    CLEARED: 'Queue cleared',
  },
  ANALYSIS: {
    COMPLETE: 'Analysis complete',
    COPIED: 'Solution copied to clipboard',
  },
  SETTINGS: {
    SAVED: 'Settings saved successfully',
    RESET: 'Settings reset to defaults',
  },
} as const;

/** Validation rules */
export const VALIDATION_RULES = {
  API_KEY: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 200,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  MODEL_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_.-]+$/,
  },
  FILE_NAME: {
    MAX_LENGTH: 255,
    INVALID_CHARS: /[<>:"/\\|?*]/g,
  },
} as const;

/** Feature flags */
export const FEATURE_FLAGS = {
  ENABLE_AUDIO_ANALYSIS: true,
  ENABLE_PRIVACY_MODE: true,
  ENABLE_CLOUD_SYNC: false,
  ENABLE_TELEMETRY: false,
  ENABLE_AUTO_UPDATE: true,
} as const;

/** Rate limiting */
export const RATE_LIMITS = {
  API_CALLS: {
    MAX_PER_MINUTE: 20,
    MAX_PER_HOUR: 100,
  },
  SCREENSHOTS: {
    MAX_PER_MINUTE: 10,
  },
  AUDIO_RECORDINGS: {
    MAX_PER_MINUTE: 5,
  },
} as const;

/** Log levels */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

/** Export type definitions */
export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];
export type LLMProvider = typeof LLM_CONFIG.PROVIDERS[keyof typeof LLM_CONFIG.PROVIDERS];
export type SupportedImageFormat = typeof SCREENSHOT_CONFIG.SUPPORTED_FORMATS[number];
export type SupportedAudioFormat = typeof AUDIO_CONFIG.SUPPORTED_FORMATS[number];
