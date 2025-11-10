/**
 * Validation Utilities
 * Provides type-safe validation and sanitization functions
 */

import {
  VALIDATION_RULES,
  SCREENSHOT_CONFIG,
  AUDIO_CONFIG,
} from '../constants/app.constants';
import { ValidationError } from './errors';

/** Validation result */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Create validation result
 */
function createValidationResult(
  isValid: boolean,
  errors: Record<string, string> = {}
): ValidationResult {
  return { isValid, errors };
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!apiKey || apiKey.trim().length === 0) {
    errors.apiKey = 'API key is required';
    return createValidationResult(false, errors);
  }

  if (apiKey.length < VALIDATION_RULES.API_KEY.MIN_LENGTH) {
    errors.apiKey = `API key must be at least ${VALIDATION_RULES.API_KEY.MIN_LENGTH} characters`;
  }

  if (apiKey.length > VALIDATION_RULES.API_KEY.MAX_LENGTH) {
    errors.apiKey = `API key must not exceed ${VALIDATION_RULES.API_KEY.MAX_LENGTH} characters`;
  }

  if (!VALIDATION_RULES.API_KEY.PATTERN.test(apiKey)) {
    errors.apiKey = 'API key contains invalid characters';
  }

  return createValidationResult(Object.keys(errors).length === 0, errors);
}

/**
 * Validate model name
 */
export function validateModelName(modelName: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!modelName || modelName.trim().length === 0) {
    errors.modelName = 'Model name is required';
    return createValidationResult(false, errors);
  }

  if (modelName.length < VALIDATION_RULES.MODEL_NAME.MIN_LENGTH) {
    errors.modelName = `Model name must be at least ${VALIDATION_RULES.MODEL_NAME.MIN_LENGTH} characters`;
  }

  if (modelName.length > VALIDATION_RULES.MODEL_NAME.MAX_LENGTH) {
    errors.modelName = `Model name must not exceed ${VALIDATION_RULES.MODEL_NAME.MAX_LENGTH} characters`;
  }

  if (!VALIDATION_RULES.MODEL_NAME.PATTERN.test(modelName)) {
    errors.modelName = 'Model name contains invalid characters';
  }

  return createValidationResult(Object.keys(errors).length === 0, errors);
}

/**
 * Validate file name
 */
export function validateFileName(fileName: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!fileName || fileName.trim().length === 0) {
    errors.fileName = 'File name is required';
    return createValidationResult(false, errors);
  }

  if (fileName.length > VALIDATION_RULES.FILE_NAME.MAX_LENGTH) {
    errors.fileName = `File name must not exceed ${VALIDATION_RULES.FILE_NAME.MAX_LENGTH} characters`;
  }

  if (VALIDATION_RULES.FILE_NAME.INVALID_CHARS.test(fileName)) {
    errors.fileName = 'File name contains invalid characters';
  }

  return createValidationResult(Object.keys(errors).length === 0, errors);
}

/**
 * Validate image file
 */
export function validateImageFile(file: {
  name: string;
  size: number;
  type: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Check file name
  const fileNameResult = validateFileName(file.name);
  if (!fileNameResult.isValid) {
    Object.assign(errors, fileNameResult.errors);
  }

  // Check file size
  const maxSizeBytes = SCREENSHOT_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.size = `File size must not exceed ${SCREENSHOT_CONFIG.MAX_FILE_SIZE_MB}MB`;
  }

  // Check file type
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SCREENSHOT_CONFIG.SUPPORTED_FORMATS.includes(extension as any)) {
    errors.type = `File type must be one of: ${SCREENSHOT_CONFIG.SUPPORTED_FORMATS.join(', ')}`;
  }

  return createValidationResult(Object.keys(errors).length === 0, errors);
}

/**
 * Validate audio file
 */
export function validateAudioFile(file: {
  name: string;
  size: number;
  type: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Check file name
  const fileNameResult = validateFileName(file.name);
  if (!fileNameResult.isValid) {
    Object.assign(errors, fileNameResult.errors);
  }

  // Check file type
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !AUDIO_CONFIG.SUPPORTED_FORMATS.includes(extension as any)) {
    errors.type = `Audio type must be one of: ${AUDIO_CONFIG.SUPPORTED_FORMATS.join(', ')}`;
  }

  return createValidationResult(Object.keys(errors).length === 0, errors);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!url || url.trim().length === 0) {
    errors.url = 'URL is required';
    return createValidationResult(false, errors);
  }

  try {
    const urlObject = new URL(url);
    if (!['http:', 'https:'].includes(urlObject.protocol)) {
      errors.url = 'URL must use HTTP or HTTPS protocol';
    }
  } catch {
    errors.url = 'Invalid URL format';
  }

  return createValidationResult(Object.keys(errors).length === 0, errors);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!email || email.trim().length === 0) {
    errors.email = 'Email is required';
    return createValidationResult(false, errors);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.email = 'Invalid email format';
  }

  return createValidationResult(Object.keys(errors).length === 0, errors);
}

/**
 * Type guards
 */

/**
 * Check if value is string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Sanitization functions
 */

/**
 * Sanitize string (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  if (!isString(input)) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!isString(fileName)) return '';
  
  return fileName
    .trim()
    .replace(VALIDATION_RULES.FILE_NAME.INVALID_CHARS, '_')
    .substring(0, VALIDATION_RULES.FILE_NAME.MAX_LENGTH);
}

/**
 * Sanitize path (prevent directory traversal)
 */
export function sanitizePath(path: string): string {
  if (!isString(path)) return '';
  
  return path
    .replace(/\.\./g, '') // Remove ..
    .replace(/[<>:"|?*]/g, '') // Remove invalid path characters
    .trim();
}

/**
 * Sanitize HTML (basic XSS prevention)
 */
export function sanitizeHtml(html: string): string {
  if (!isString(html)) return '';
  
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Parse and validate JSON safely
 */
export function safeJsonParse<T = unknown>(
  json: string,
  fallback: T
): T {
  try {
    const parsed = JSON.parse(json);
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Assert value is defined (throws if not)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is required'
): asserts value is T {
  if (isNullOrUndefined(value)) {
    throw new ValidationError(message);
  }
}

/**
 * Assert value matches type guard
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message: string = 'Invalid type'
): asserts value is T {
  if (!guard(value)) {
    throw new ValidationError(message);
  }
}

/**
 * Validate and throw if invalid
 */
export function validateOrThrow(
  result: ValidationResult,
  message: string = 'Validation failed'
): void {
  if (!result.isValid) {
    throw new ValidationError(message, result.errors);
  }
}
