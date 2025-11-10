import { dialog, BrowserWindow } from 'electron';
import { logger } from './Logger';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  USER = 'user',
  SYSTEM = 'system',
  APPLICATION = 'application',
  EXTERNAL = 'external'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Error context interface
 */
export interface ErrorContext {
  component: string;
  action: string;
  severity: ErrorSeverity;
  category?: ErrorCategory;
  metadata?: Record<string, any>;
}

/**
 * Error action interface for user interactions
 */
export interface ErrorAction {
  label: string;
  handler: () => void;
}

/**
 * Error display options
 */
export interface ErrorOptions {
  title?: string;
  actions?: ErrorAction[];
  dismissible?: boolean;
  showDialog?: boolean;
}

/**
 * User-friendly error message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  TIMEOUT_ERROR: 'The request took too long. Please try again.',
  
  // API errors
  API_KEY_ERROR: 'Invalid API key. Please check your credentials in Settings.',
  LLM_ERROR: 'AI service is unavailable. Please try again later.',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
  
  // Permission errors
  PERMISSION_ERROR: 'Permission denied. Please enable the required permissions in System Preferences.',
  SCREENSHOT_ERROR: 'Unable to capture screenshot. Please check screen recording permissions.',
  
  // File system errors
  FILESYSTEM_ERROR: 'Unable to access file. Please check file permissions.',
  NOT_FOUND_ERROR: 'The requested resource was not found.',
  
  // Configuration errors
  VALIDATION_ERROR: 'Invalid configuration. Please check your settings.',
  
  // Generic errors
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  APP_ERROR: 'An unexpected error occurred. Please restart the application.'
};

/**
 * ErrorHandler Service
 * Centralized error handling with user-friendly messages and reporting
 */
export class ErrorHandler {
  private static instance: ErrorHandler | null = null;
  private mainWindow: BrowserWindow | null = null;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Set the main window reference for displaying error dialogs
   */
  public setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Classify error into category
   */
  private classifyError(error: Error): ErrorCategory {
    const errorName = error.name;
    const errorMessage = error.message.toLowerCase();

    // User errors - invalid input, missing permissions
    if (
      errorName === 'ValidationError' ||
      errorName === 'PermissionError' ||
      errorMessage.includes('permission') ||
      errorMessage.includes('denied')
    ) {
      return ErrorCategory.USER;
    }

    // System errors - file system, OS-level
    if (
      errorName === 'FileSystemError' ||
      errorName === 'ScreenshotError' ||
      errorMessage.includes('enoent') ||
      errorMessage.includes('eacces') ||
      errorMessage.includes('file') ||
      errorMessage.includes('directory')
    ) {
      return ErrorCategory.SYSTEM;
    }

    // External errors - API, network
    if (
      errorName === 'NetworkError' ||
      errorName === 'LLMError' ||
      errorName === 'ApiKeyError' ||
      errorName === 'RateLimitError' ||
      errorName === 'TimeoutError' ||
      errorMessage.includes('network') ||
      errorMessage.includes('api') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout')
    ) {
      return ErrorCategory.EXTERNAL;
    }

    // Application errors - logic bugs, state issues
    return ErrorCategory.APPLICATION;
  }

  /**
   * Get user-friendly error message
   */
  private getUserMessage(error: Error, context?: ErrorContext): string {
    // Check if error has a code property
    const errorCode = (error as any).code;
    
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      return ERROR_MESSAGES[errorCode];
    }

    // Check error name
    if (ERROR_MESSAGES[error.name]) {
      return ERROR_MESSAGES[error.name];
    }

    // For operational errors, use the error message directly
    const isOperational = (error as any).isOperational;
    if (isOperational && error.message) {
      return error.message;
    }

    // Default message based on category
    const category = context?.category || this.classifyError(error);
    
    switch (category) {
      case ErrorCategory.USER:
        return 'Invalid input or missing permissions. Please check your settings.';
      case ErrorCategory.SYSTEM:
        return 'A system error occurred. Please try again or restart the application.';
      case ErrorCategory.EXTERNAL:
        return 'Unable to connect to external service. Please check your connection and try again.';
      case ErrorCategory.APPLICATION:
        return 'An unexpected error occurred. Please restart the application.';
      default:
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  /**
   * Handle error with logging and user notification
   */
  public handleError(error: Error, context: ErrorContext, options?: ErrorOptions): void {
    // Classify error if not provided
    const category = context.category || this.classifyError(error);
    const fullContext = { ...context, category };

    // Log the error
    logger.error(`Error in ${context.component}`, {
      action: context.action,
      severity: context.severity,
      category,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      metadata: context.metadata
    });

    // Get user-friendly message
    const userMessage = this.getUserMessage(error, fullContext);

    // Show error to user if needed
    if (options?.showDialog !== false) {
      this.showUserError(userMessage, options);
    }

    // Report critical errors
    if (context.severity === ErrorSeverity.CRITICAL) {
      this.reportError(error, fullContext);
    }

    // Send error to renderer process
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('error-occurred', {
        message: userMessage,
        severity: context.severity,
        category,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Show user-friendly error dialog
   */
  public async showUserError(message: string, options?: ErrorOptions): Promise<void> {
    const title = options?.title || 'Error';
    const dismissible = options?.dismissible !== false;

    // Show native dialog
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        await dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title,
          message,
          buttons: dismissible ? ['OK'] : [],
          defaultId: 0
        });
      } catch (err) {
        logger.error('Failed to show error dialog', { error: err });
      }
    } else {
      // Fallback to console if no window
      logger.error(`User Error: ${title} - ${message}`);
    }
  }

  /**
   * Report critical error for tracking
   */
  public async reportError(error: Error, context?: ErrorContext): Promise<void> {
    try {
      // Log critical error with full details
      logger.error('CRITICAL ERROR REPORTED', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context,
        timestamp: new Date().toISOString(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      });

      // In production, you would send this to an error tracking service
      // Example: Sentry, LogRocket, Bugsnag, etc.
      // await sendToErrorTrackingService(error, context);
      
    } catch (reportError) {
      logger.error('Failed to report error', { error: reportError });
    }
  }

  /**
   * Handle uncaught exception
   */
  public handleUncaughtException(error: Error): void {
    this.handleError(error, {
      component: 'main',
      action: 'uncaughtException',
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.APPLICATION
    }, {
      title: 'Critical Error',
      dismissible: false
    });
  }

  /**
   * Handle unhandled rejection
   */
  public handleUnhandledRejection(reason: any): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    this.handleError(error, {
      component: 'main',
      action: 'unhandledRejection',
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.APPLICATION
    });
  }

  /**
   * Create error from unknown type
   */
  public createError(error: unknown, defaultMessage: string = 'An error occurred'): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    return new Error(defaultMessage);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
