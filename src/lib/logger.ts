// 共通ログ機能

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorDetails = error ? ` | Error: ${error.message} | Stack: ${error.stack}` : '';
    console.error(this.formatMessage('error', message + errorDetails, context));
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  // API エラーログ用
  apiError(endpoint: string, error: Error, requestData?: unknown): void {
    this.error(`API Error at ${endpoint}`, error, {
      endpoint,
      requestData: this.isDevelopment ? requestData : undefined,
    });
  }

  // バリデーションエラーログ用
  validationError(component: string, errors: unknown[]): void {
    this.warn(`Validation errors in ${component}`, {
      component,
      errors: errors.map(e => {
        const error = e as { field?: string; message?: string };
        return { field: error.field, message: error.message };
      }),
    });
  }

  // パフォーマンスログ用
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...context,
    });
  }
}

export const logger = new Logger();
