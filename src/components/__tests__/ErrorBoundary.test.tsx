import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ErrorBoundary from '../ErrorBoundary'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

const ConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = ConsoleError
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    localStorageMock.setItem.mockClear()
    ;(console.error as jest.Mock).mockClear()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('🚨 システムエラー')).toBeInTheDocument()
    expect(screen.getByText(/申し訳ございません/)).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByText('🔄 システム再起動')).toBeInTheDocument()
    expect(screen.getByText('🔃 ページ再読み込み')).toBeInTheDocument()
  })

  it('logs error to localStorage when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'hakata-port-radio-error-log',
      expect.stringContaining('Test error')
    )
  })

  it('handles localStorage error gracefully', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded')
    })
    
    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
    }).not.toThrow()
    
    expect(screen.getByText('🚨 システムエラー')).toBeInTheDocument()
  })

  it('resets error state when reset button is clicked', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('🚨 システムエラー')).toBeInTheDocument()
    
    const resetButton = screen.getByText('🔄 システム再起動')
    fireEvent.click(resetButton)
    
    // Clean up the error boundary
    unmount()
    
    // Render a fresh ErrorBoundary with a working child
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    // Should now render the working component
    expect(screen.getByText('No error')).toBeInTheDocument()
    expect(screen.queryByText('🚨 システムエラー')).not.toBeInTheDocument()
  })

  it('renders custom fallback UI when provided', () => {
    const customFallback = <div>Custom Error UI</div>
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
    expect(screen.queryByText('🚨 システムエラー')).not.toBeInTheDocument()
  })

  it('handles errors in server-side rendering gracefully', () => {
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      writable: true,
    })
    
    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
    }).not.toThrow()
    
    expect(screen.getByText('🚨 システムエラー')).toBeInTheDocument()
    
    // Restore localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  it('logs error details to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(console.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })
})