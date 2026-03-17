// frontend/src/components/evolution/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Store error details for debugging
    this.setState({ error, hasError: true });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: undefined
    });
  };

  handleReset = (): void => {
    const { onReset } = this.props;

    this.setState({
      hasError: false,
      error: undefined
    });

    if (onReset) {
      onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (!hasError) {
      return children;
    }

    const isDevelopment = import.meta.env.DEV;

    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-red-200">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
              可视化渲染出错
            </h2>

            <p className="text-center text-gray-500 mb-6">
              组件渲染过程中发生错误，请尝试刷新或返回默认视图
            </p>

            {isDevelopment && error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg overflow-auto">
                <p className="text-sm font-medium text-gray-700 mb-2">错误详情:</p>
                <pre className="text-xs text-red-600 whitespace-pre-wrap">
                  {error.stack || error.message}
                </pre>
              </div>
            )}

            {!isDevelopment && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600">
                  生产环境已启用错误保护。请联系管理员或稍后重试。
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                重试
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                返回默认视图
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
