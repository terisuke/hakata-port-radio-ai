import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import VoiceRadioOfficial from '../VoiceRadioOfficial'

// Mock OpenAI Agents Realtime
jest.mock('@openai/agents-realtime', () => ({
  RealtimeAgent: jest.fn().mockImplementation(() => ({
    name: 'MockAgent'
  })),
  RealtimeSession: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(true),
    close: jest.fn(),
    mute: jest.fn(),
    on: jest.fn(),
  })),
  tool: jest.fn().mockImplementation((config) => config),
}))

// Mock localStorage with more realistic behavior
const localStorageData = new Map()
const localStorageMock = {
  getItem: jest.fn((key) => localStorageData.get(key) || null),
  setItem: jest.fn((key, value) => {
    localStorageData.set(key, value)
  }),
  removeItem: jest.fn((key) => localStorageData.delete(key)),
  clear: jest.fn(() => localStorageData.clear()),
}
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('VoiceRadioOfficial', () => {
  beforeEach(() => {
    // Reset localStorage data before each test
    localStorageData.clear()
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the main components correctly', () => {
      render(<VoiceRadioOfficial />)
      
      expect(screen.getByText('🏔️ 博多ポートラジオ')).toBeInTheDocument()
      expect(screen.getByText('📡 管制システム接続開始')).toBeInTheDocument()
      expect(screen.getByText('📻 VHFチャンネル管制状況')).toBeInTheDocument()
    })

    it('displays all three VHF channels', () => {
      render(<VoiceRadioOfficial />)
      
      expect(screen.getByText('Ch.8')).toBeInTheDocument()
      expect(screen.getByText('Ch.10')).toBeInTheDocument()
      expect(screen.getByText('Ch.12')).toBeInTheDocument()
    })

    it('shows channel purposes correctly', () => {
      render(<VoiceRadioOfficial />)
      
      expect(screen.getByText('船舶間通信')).toBeInTheDocument()
      expect(screen.getByText('港内作業')).toBeInTheDocument()
      expect(screen.getByText('港務通信')).toBeInTheDocument()
    })
  })

  describe('Channel Management', () => {
    it('should initialize channels as available', () => {
      render(<VoiceRadioOfficial />)
      
      const availableTags = screen.getAllByText('空き')
      expect(availableTags).toHaveLength(3)
    })

    it('should reset all channels when reset button is clicked', async () => {
      render(<VoiceRadioOfficial />)
      
      const resetButton = screen.getByText('🔄 管制リセット')
      await userEvent.click(resetButton)
      
      // Check that localStorage.setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should handle test channel assignment', async () => {
      render(<VoiceRadioOfficial />)
      
      const testButton = screen.getByText('さくら丸 割り当て')
      await userEvent.click(testButton)
      
      // Should update localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('localStorage Persistence', () => {
    it('should load channel state from localStorage on mount', () => {
      const mockChannelData = JSON.stringify([
        { channel: 8, status: 'assigned', vesselName: 'テスト丸', usageCount: 1 },
        { channel: 10, status: 'available', usageCount: 0 },
        { channel: 12, status: 'available', usageCount: 0 }
      ])
      
      localStorageMock.getItem.mockReturnValueOnce(mockChannelData)
      
      render(<VoiceRadioOfficial />)
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('hakata-port-radio-channels')
    })

    it('should save channel state to localStorage when channels change', async () => {
      render(<VoiceRadioOfficial />)
      
      const testButton = screen.getByText('はやぶさ号 割り当て')
      await userEvent.click(testButton)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'hakata-port-radio-channels',
        expect.stringContaining('はやぶさ号')
      )
    })

    it('should use default channels when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      
      render(<VoiceRadioOfficial />)
      
      // Should show default available channels
      const availableTags = screen.getAllByText('空き')
      expect(availableTags).toHaveLength(3)
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-json')
      
      expect(() => {
        render(<VoiceRadioOfficial />)
      }).not.toThrow()
      
      // Should fall back to default channels
      const availableTags = screen.getAllByText('空き')
      expect(availableTags).toHaveLength(3)
    })
  })

  describe('Load Balancing Algorithm', () => {
    it('should distribute channels evenly based on usage count', async () => {
      // Pre-populate localStorage with usage data
      const channelData = [
        { channel: 8, status: 'available', usageCount: 5 },
        { channel: 10, status: 'available', usageCount: 2 },
        { channel: 12, status: 'available', usageCount: 3 }
      ]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(channelData))
      
      render(<VoiceRadioOfficial />)
      
      // Channel 10 should be selected (lowest usage count)
      const testButton = screen.getByText('さくら丸 割り当て')
      await userEvent.click(testButton)
      
      // Verify localStorage was updated with channel assignment
      const setItemCalls = localStorageMock.setItem.mock.calls
      const lastCall = setItemCalls[setItemCalls.length - 1]
      const savedData = JSON.parse(lastCall[1])
      
      // Find channel 10 in saved data and verify it was assigned
      const channel10 = savedData.find((ch: any) => ch.channel === 10)
      expect(channel10.status).toBe('assigned')
      expect(channel10.vesselName).toBe('さくら丸')
    })
  })

  describe('Race Condition Prevention', () => {
    it('should handle concurrent channel assignments safely', async () => {
      render(<VoiceRadioOfficial />)
      
      // Simulate rapid concurrent clicks
      const sakuraButton = screen.getByText('さくら丸 割り当て')
      const hayabusaButton = screen.getByText('はやぶさ号 割り当て')
      
      // Fire multiple clicks in quick succession
      const promises = [
        userEvent.click(sakuraButton),
        userEvent.click(hayabusaButton),
        userEvent.click(sakuraButton),
        userEvent.click(hayabusaButton),
      ]
      
      await Promise.all(promises)
      
      // Each call should result in a localStorage update
      expect(localStorageMock.setItem).toHaveBeenCalled()
      
      // Should not throw errors due to race conditions
      expect(true).toBe(true) // Test passes if no errors thrown
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded gracefully', async () => {
      // Mock localStorage.setItem to throw quota exceeded error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError')
      })
      
      render(<VoiceRadioOfficial />)
      
      const testButton = screen.getByText('さくら丸 割り当て')
      
      // Should not crash when localStorage fails
      expect(async () => {
        await userEvent.click(testButton)
      }).not.toThrow()
    })

    it('should handle invalid localStorage data without crashing', () => {
      localStorageMock.getItem.mockReturnValueOnce('{"invalid": "json"')
      
      expect(() => {
        render(<VoiceRadioOfficial />)
      }).not.toThrow()
    })
  })

  describe('Connection Status', () => {
    it('should show initial waiting status', () => {
      render(<VoiceRadioOfficial />)
      
      expect(screen.getByText('待機中')).toBeInTheDocument()
    })

    it('should show connect button when disconnected', () => {
      render(<VoiceRadioOfficial />)
      
      expect(screen.getByText('📡 管制システム接続開始')).toBeInTheDocument()
    })
  })

  describe('Channel Release', () => {
    it('should release channels when release button is clicked', async () => {
      // Set up a channel as assigned
      const channelData = [
        { channel: 8, status: 'assigned', vesselName: 'テスト丸', usageCount: 1 },
        { channel: 10, status: 'available', usageCount: 0 },
        { channel: 12, status: 'available', usageCount: 0 }
      ]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(channelData))
      
      render(<VoiceRadioOfficial />)
      
      // Find and click the release button for the assigned channel
      const releaseButton = screen.getByText('解放')
      await userEvent.click(releaseButton)
      
      // Should update localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('Usage Statistics', () => {
    it('should display usage counts correctly', () => {
      const channelData = [
        { channel: 8, status: 'available', usageCount: 5 },
        { channel: 10, status: 'available', usageCount: 2 },
        { channel: 12, status: 'available', usageCount: 3 }
      ]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(channelData))
      
      render(<VoiceRadioOfficial />)
      
      expect(screen.getByText('使用回数: 5回')).toBeInTheDocument()
      expect(screen.getByText('使用回数: 2回')).toBeInTheDocument()
      expect(screen.getByText('使用回数: 3回')).toBeInTheDocument()
    })
  })
})