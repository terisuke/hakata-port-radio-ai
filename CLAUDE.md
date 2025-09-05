# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is the Hakata Port Radio AI System MVP - a specialized voice AI agent for maritime traffic control that mimics actual Hakata Port Radio communications. The project uses VoltAgent + OpenAI Realtime API on Vercel Platform.

## Development Commands

### Essential Commands
```bash
# Development server
npm run dev

# Build and deployment
npm run build
npm start

# Code quality
npm run lint
npm run type-check
npm run format
npm run format:check

# Testing
npm test
npm run test:watch
npm run test:coverage

# Vercel specific
vercel dev          # Local development with Vercel functions
vercel build        # Build for Vercel
vercel              # Deploy to production

# Database setup
npm run db:push     # Setup database (pulls env vars and runs setup)

# Clean build artifacts
npm run clean
```

### Environment Setup
```bash
# Copy environment template and configure
cp .env.template .env.local
# Edit .env.local with required API keys (OpenAI, Vercel Postgres, etc.)
```

## Architecture & Technical Stack

### Core Technology Stack
- **Framework**: Next.js 15.x with App Router
- **AI/Voice**: VoltAgent + OpenAI Realtime API + Vercel AI SDK 5.x
- **Database**: Vercel Postgres
- **Deployment**: Vercel Platform
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS

### Key Dependencies
- `@voltagent/core`, `@voltagent/voice`, `@voltagent/memory` - Core AI agent framework
- `@ai-sdk/openai`, `@ai-sdk/react` - AI SDK integration
- `@vercel/postgres` - Database connection
- `zod` - Schema validation

### Architecture Patterns
This is a **maritime domain-specific voice AI system** with:

1. **Real-time Voice Communication**: WebRTC audio capture + WebSocket streaming
2. **Maritime Protocol Adherence**: Specialized for port radio communications using IMO SMCP (Standard Marine Communication Phrases)
3. **Channel Management**: Dynamic VHF channel allocation system
4. **Session-based Interactions**: 5-minute timeout with auto-cleanup

### API Structure
```
POST   /api/agent          # Agent initialization
WS     /api/voice          # Voice streaming (WebSocket)
GET    /api/channels       # Channel status retrieval
POST   /api/channels/:id   # Channel updates
```

### Critical Implementation Notes

#### Voice Processing
- Audio chunks streamed at 250ms intervals
- WebRTC MediaRecorder API for capture
- Bidirectional WebSocket communication for real-time processing

#### Maritime Domain Logic
- **Channel Assignment Tool**: Core function that assigns VHF channels based on vessel requests
- **System Prompt**: Specialized for maritime communication protocols
- **Response Patterns**: Must follow authentic port radio communication style

#### Vercel Serverless Considerations
- WebSocket connections have limitations in serverless environment
- Session management with 5-minute timeout implementation
- Optional fallback to Ably/Pusher for WebSocket alternatives (configured in .env.template)

### Component Architecture
Key frontend components to understand:
- `ChannelTable.tsx` - Real-time channel status display
- `PttButton.tsx` - Push-to-talk functionality (mobile-responsive)
- Main page integrates `useChat` hook from Vercel AI SDK

## Development Guidelines

### Code Standards
- **TypeScript**: Strict typing, prefer interfaces over types
- **React**: Function components, Server Components prioritized, minimal `use client`
- **Naming**: PascalCase components, camelCase functions, UPPER_SNAKE_CASE constants
- **Files**: kebab-case (except PascalCase components)

### Testing Requirements
- Jest for unit testing
- Coverage reporting available via `npm run test:coverage`
- Integration testing for voice flow, channel assignment, and error handling

### Performance Targets
- Response latency: <500ms for voice interactions
- Support for up to 50 concurrent connections
- Memory leak prevention in long-running sessions

## Environment Variables
All configuration in `.env.template` with detailed comments. Key variables:
- `OPENAI_API_KEY` - Required for voice AI
- `POSTGRES_URL` - Database connection
- `VOLTOPS_API_KEY` - Monitoring (recommended)
- Optional: Ably/Pusher keys for WebSocket fallback

## Development Phases
The project follows a 6-phase development plan (details in `docs/DEVELOPMENT_GUIDE.md`):
1. Environment setup (1 day)
2. Core agent construction (3 days) 
3. Frontend UI (3 days)
4. Backend logic & API integration (3 days)
5. Integration testing (2 days)
6. Vercel deployment (1 day)

## Critical Risk Areas
- **WebSocket + Serverless**: Potential connection management issues (see `docs/RISK_MITIGATION.md`)
- **Real-time Audio**: Latency and quality considerations
- **Domain Specificity**: Maritime communication protocol accuracy required

## Node.js Version
Uses Volta for version management: Node.js 20.15.1, npm 10.8.2