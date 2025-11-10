/**
 * Custom Error Classes
 * Provides type-safe error handling across the application
 */

/** Base application error */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

/** Network related errors */
export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 503, true, context);
  }
}

/** Validation errors */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(
    message: string,
    fields?: Record<string, string>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    this.fields = fields;
  }
}

/** Screenshot related errors */
export class ScreenshotError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SCREENSHOT_ERROR', 500, true, context);
  }
}

/** LLM/AI related errors */
export class LLMError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'LLM_ERROR', 500, true, context);
  }
}

/** Audio related errors */
export class AudioError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUDIO_ERROR', 500, true, context);
  }
}

/** File system errors */
export class FileSystemError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'FILESYSTEM_ERROR', 500, true, context);
  }
}

/** Permission errors */
export class PermissionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PERMISSION_ERROR', 403, true, context);
  }
}

/** Rate limiting errors */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, context);
    this.retryAfter = retryAfter;
  }
}

/** API key errors */
export class ApiKeyError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'API_KEY_ERROR', 401, true, context);
  }
}

/** Timeout errors */
export class TimeoutError extends AppError {
  constructor(message: string, timeoutMs: number, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', 408, true, {
      ...context,
      timeoutMs,
    });
  }
}

/** Not found errors */
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404, true, context);
  }
}

/**
 * Type guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Error factory for creating errors from unknown types
 */
export function createError(error: unknown, defaultMessage: string = 'An error occurred'): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message || defaultMessage,
      'UNKNOWN_ERROR',
      500,
      false,
      { originalError: error.name }
    );
  }

  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR', 500, false);
  }

  return new AppError(
    defaultMessage,
    'UNKNOWN_ERROR',
    500,
    false,
    { error: String(error) }
  );
}

/**
 * Extract user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Extract error code
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Check if error should be retried
 */
export function shouldRetry(error: unknown, attempt: number, maxAttempts: number): boolean {
  if (attempt >= maxAttempts) {
    return false;
  }

  // Don't retry validation errors or permission errors
  if (error instanceof ValidationError || error instanceof PermissionError) {
    return false;
  }

  // Retry network errors, timeouts, and rate limits
  if (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    error instanceof RateLimitError
  ) {
    return true;
  }

  return false;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelay);
}
