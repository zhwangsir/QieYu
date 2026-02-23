/**
 * 全局错误处理服务
 * 统一处理API错误、网络错误和业务错误
 */

import { syncService } from './syncService';

// 错误类型
export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'BUSINESS_ERROR'
  | 'TIMEOUT_ERROR';

// 错误信息接口
interface ErrorInfo {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: number;
}

// 错误处理器
class ErrorHandler {
  private errorListeners: Array<(error: ErrorInfo) => void> = [];
  private errorHistory: ErrorInfo[] = [];
  private readonly MAX_HISTORY = 50;

  // 处理错误
  handle(error: any, context?: string): ErrorInfo {
    const errorInfo = this.parseError(error, context);
    
    // 记录错误
    this.logError(errorInfo);
    
    // 通知监听器
    this.notifyListeners(errorInfo);
    
    // 根据错误类型执行不同处理
    this.handleByType(errorInfo);
    
    return errorInfo;
  }

  // 解析错误
  private parseError(error: any, context?: string): ErrorInfo {
    const timestamp = Date.now();
    
    // 网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        details: { originalError: error.message, context },
        timestamp
      };
    }
    
    // 超时错误
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        type: 'TIMEOUT_ERROR',
        message: '请求超时，请稍后重试',
        details: { originalError: error.message, context },
        timestamp
      };
    }
    
    // API错误
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      
      // 认证错误
      if (status === 401) {
        return {
          type: 'AUTH_ERROR',
          message: '登录已过期，请重新登录',
          code: 'TOKEN_EXPIRED',
          details: { status, context },
          timestamp
        };
      }
      
      // 权限错误
      if (status === 403) {
        return {
          type: 'AUTH_ERROR',
          message: '没有权限执行此操作',
          code: 'FORBIDDEN',
          details: { status, context },
          timestamp
        };
      }
      
      // 验证错误
      if (status === 400 || status === 422) {
        return {
          type: 'VALIDATION_ERROR',
          message: error.message || '请求参数错误',
          code: error.code,
          details: { status, errors: error.errors, context },
          timestamp
        };
      }
      
      // 服务器错误
      if (status >= 500) {
        return {
          type: 'SERVER_ERROR',
          message: '服务器内部错误，请稍后重试',
          code: error.code,
          details: { status, context },
          timestamp
        };
      }
    }
    
    // 业务错误
    return {
      type: 'BUSINESS_ERROR',
      message: error.message || '操作失败',
      code: error.code,
      details: { originalError: error, context },
      timestamp
    };
  }

  // 根据类型处理错误
  private handleByType(errorInfo: ErrorInfo): void {
    switch (errorInfo.type) {
      case 'AUTH_ERROR':
        if (errorInfo.code === 'TOKEN_EXPIRED') {
          // 清除token并跳转登录
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          
          // 延迟跳转，让用户看到提示
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
        break;
        
      case 'NETWORK_ERROR':
        // 尝试使用离线数据
        console.log('[ErrorHandler] Network error, using offline data if available');
        break;
        
      case 'SERVER_ERROR':
        // 记录到同步服务，稍后重试
        syncService.sendChange('error_logged', errorInfo);
        break;
    }
  }

  // 记录错误
  private logError(errorInfo: ErrorInfo): void {
    this.errorHistory.unshift(errorInfo);
    
    // 限制历史记录数量
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_HISTORY);
    }
    
    // 控制台输出
    console.error('[ErrorHandler]', errorInfo);
  }

  // 通知监听器
  private notifyListeners(errorInfo: ErrorInfo): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  // 添加错误监听器
  onError(listener: (error: ErrorInfo) => void): () => void {
    this.errorListeners.push(listener);
    
    // 返回取消订阅函数
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // 获取错误历史
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  // 清除错误历史
  clearHistory(): void {
    this.errorHistory = [];
  }

  // 获取用户友好的错误消息
  getUserMessage(errorInfo: ErrorInfo): string {
    const messages: Record<ErrorType, string> = {
      'NETWORK_ERROR': '网络连接异常，请检查网络设置',
      'AUTH_ERROR': errorInfo.message || '认证失败',
      'VALIDATION_ERROR': errorInfo.message || '输入数据有误',
      'SERVER_ERROR': '服务器繁忙，请稍后重试',
      'BUSINESS_ERROR': errorInfo.message || '操作失败',
      'TIMEOUT_ERROR': '请求超时，请稍后重试'
    };
    
    return messages[errorInfo.type] || '未知错误';
  }
}

// 导出单例
export const errorHandler = new ErrorHandler();

// 包装异步函数，自动处理错误
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): (...args: Parameters<T>) => Promise<ReturnType<T> | null> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.handle(error, context);
      return null;
    }
  };
}

// 创建带超时的fetch
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId));
}

// 重试机制
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        console.log(`[ErrorHandler] Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // 指数退避
      }
    }
  }
  
  throw lastError;
}
