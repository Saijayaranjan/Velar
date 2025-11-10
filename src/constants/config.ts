/**
 * Environment Configuration
 * Manages environment variables and runtime configuration
 */

/** Environment types */
export type Environment = 'development' | 'production' | 'test';

/** Configuration interface */
interface AppConfig {
  env: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  api: {
    gemini: {
      apiKey: string;
      enabled: boolean;
    };
    ollama: {
      endpoint: string;
      enabled: boolean;
    };
  };
  logging: {
    level: string;
    enabled: boolean;
    fileLogging: boolean;
  };
  performance: {
    enableDevTools: boolean;
    enableProfiler: boolean;
  };
}

/**
 * Get the current environment
 */
export function getEnvironment(): Environment {
  const env = import.meta.env.MODE as Environment;
  if (env === 'development' || env === 'production' || env === 'test') {
    return env;
  }
  return 'development';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string = ''): string {
  return import.meta.env[key] || fallback;
}

/**
 * Get boolean environment variable
 */
function getEnvBool(key: string, fallback: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return fallback;
  return value === 'true' || value === '1' || value === true;
}

/**
 * Application configuration
 */
export const config: AppConfig = {
  env: getEnvironment(),
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
  isTest: isTest(),

  api: {
    gemini: {
      apiKey: getEnvVar('VITE_GEMINI_API_KEY', ''),
      enabled: getEnvBool('VITE_GEMINI_ENABLED', true),
    },
    ollama: {
      endpoint: getEnvVar('VITE_OLLAMA_ENDPOINT', 'http://localhost:11434'),
      enabled: getEnvBool('VITE_OLLAMA_ENABLED', true),
    },
  },

  logging: {
    level: getEnvVar('VITE_LOG_LEVEL', isDevelopment() ? 'debug' : 'info'),
    enabled: getEnvBool('VITE_LOGGING_ENABLED', true),
    fileLogging: getEnvBool('VITE_FILE_LOGGING', isProduction()),
  },

  performance: {
    enableDevTools: getEnvBool('VITE_ENABLE_DEVTOOLS', isDevelopment()),
    enableProfiler: getEnvBool('VITE_ENABLE_PROFILER', false),
  },
};

/**
 * Validate configuration
 * Throws error if required configuration is missing
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate API keys if providers are enabled
  if (config.api.gemini.enabled && !config.api.gemini.apiKey) {
    errors.push('Gemini API key is required when Gemini is enabled');
  }

  if (config.api.ollama.enabled && !config.api.ollama.endpoint) {
    errors.push('Ollama endpoint is required when Ollama is enabled');
  }

  if (errors.length > 0) {
    const errorMessage = `Configuration validation failed:\n${errors.join('\n')}`;
    console.error(errorMessage);
    // In production, we might want to throw, but in development, just warn
    if (isProduction()) {
      throw new Error(errorMessage);
    }
  }
}

/**
 * Get sanitized config for logging (removes sensitive data)
 */
export function getSanitizedConfig(): Partial<AppConfig> {
  return {
    env: config.env,
    isDevelopment: config.isDevelopment,
    isProduction: config.isProduction,
    isTest: config.isTest,
    api: {
      gemini: {
        apiKey: config.api.gemini.apiKey ? '[REDACTED]' : '',
        enabled: config.api.gemini.enabled,
      },
      ollama: {
        endpoint: config.api.ollama.endpoint,
        enabled: config.api.ollama.enabled,
      },
    },
    logging: config.logging,
    performance: config.performance,
  };
}

/**
 * Export for convenience
 */
export default config;
