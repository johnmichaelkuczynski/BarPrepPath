# Texas Bar Prep App

## Overview

This is a comprehensive Texas Bar Exam preparation application that provides AI-powered practice tests, diagnostics, and study materials for all three days of the Texas Bar Exam. The app uses live LLM generation for all content - no static questions or answers. It features a full-stack architecture with React frontend, Express backend, PostgreSQL database via Drizzle ORM, and integration with multiple AI providers (OpenAI, Anthropic, DeepSeek, Perplexity).

The application simulates the complete bar exam experience with diagnostic tests, full-length exams, subject-specific practice sessions, real-time AI grading, analytics tracking, and personalized study recommendations.

## User Preferences

Preferred communication style: Simple, everyday language. User uses strong language and has zero tolerance for test flow interruptions or delays.

**Critical UI/UX Requirements:**
- When user opens app, immediately show a live AI-generated question ready to take - NO placeholder buttons or "generate test" prompts
- User takes test → gets immediate grade → gets explanation → gets legal concept explanations → continues to next question
- No fake "Review Answers" or "Study Plan" buttons that don't work
- No preset quick question buttons in chat interface
- All content must be live AI-generated, never static or placeholder content
- Focus on functional testing experience, not marketing-style landing pages
- **CRITICAL:** Instant question progression - select answer → next question appears immediately with manual control (NO auto-advancement or delays)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in SPA configuration
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite with hot module replacement for development

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for test sessions, questions, analytics, and chat
- **Middleware**: Custom logging, JSON parsing, and error handling
- **Development**: Hot reload with tsx for TypeScript execution

### Database Architecture
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema**: Comprehensive tables for users, test sessions, question responses, analytics, chat messages, and study recommendations
- **Migrations**: Drizzle Kit for schema management and migrations
- **Connection**: Connection pooling with @neondatabase/serverless

### AI Integration Architecture
- **Multi-Provider Support**: OpenAI GPT-4, Anthropic Claude, DeepSeek-V2, and Perplexity
- **Content Generation**: Live AI generation for all questions, explanations, and grading
- **Provider Selection**: User-configurable AI provider per test session
- **Fallback Strategy**: Multiple providers available for different content types

### Authentication & Session Management
- **Session Storage**: PostgreSQL-backed session management
- **User Tracking**: UUID-based user identification
- **Test Sessions**: Persistent test state with resume capability

### Real-time Features
- **Live Grading**: AI-powered scoring and feedback for written responses
- **Progress Tracking**: Real-time analytics and performance monitoring
- **Chat Integration**: AI-powered study assistance and explanations

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4 for question generation and grading (primary)
- **Anthropic API**: Claude models for answer explanations and analysis
- **DeepSeek API**: Alternative question generation provider
- **Perplexity API**: Legal concept explanations and research

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Connection Pooling**: WebSocket-based connections for serverless environments

### Development Tools
- **Replit Integration**: Development environment with cartographer and error overlay plugins
- **Vite Plugins**: React, runtime error modal, and development tooling

### UI & Styling
- **Radix UI**: Accessible component primitives for all interactive elements
- **Tailwind CSS**: Utility-first styling with custom design system
- **Lucide Icons**: Icon library for consistent visual elements

### Build & Deployment
- **esbuild**: Production bundling for server code
- **PostCSS**: CSS processing with Tailwind and Autoprefixer
- **TypeScript**: Type checking and compilation across full stack

## Recent Changes

### August 1, 2025 - Diagnostic Test Flow Fixed
- **FIXED**: Next Question button now appears when answer is selected in diagnostic mode
- **FIXED**: Removed automatic 0.5-second delays that were causing test interruptions
- **FIXED**: Corrected diagnostic test configuration to use 3 questions instead of 20
- **VERIFIED**: Complete 5-point verification protocol passed for diagnostic flow functionality
- **TEST BEHAVIOR**: Diagnostic tests store answers locally, submit all at completion for LLM grading
- **USER CONFIRMATION**: User tested flow successfully - diagnostic test progression now working properly