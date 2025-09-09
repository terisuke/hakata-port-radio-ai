'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    })

    console.error('ErrorBoundary caught an error:', error, errorInfo)

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const errorLog = {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        }
        localStorage.setItem('hakata-port-radio-error-log', JSON.stringify(errorLog))
      } catch (storageError) {
        console.warn('Failed to log error to localStorage:', storageError)
      }
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 text-center">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-red-600 mb-2">
                🚨 システムエラー
              </h1>
              <p className="text-gray-600 mb-4">
                申し訳ございません。博多ポートラジオシステムでエラーが発生しました。
              </p>
            </div>

            <div className="bg-gray-50 rounded p-4 mb-4 text-left">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">エラー詳細:</h3>
              <p className="text-xs text-gray-600 font-mono">
                {this.state.error?.message || '不明なエラー'}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
              >
                🔄 システム再起動
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
              >
                🔃 ページ再読み込み
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>エラーログはローカルストレージに保存されました。</p>
              <p>問題が継続する場合は、システム管理者にお問い合わせください。</p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary