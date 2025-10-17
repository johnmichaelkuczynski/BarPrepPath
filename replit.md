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

### October 17, 2025 - Continue Button Page Reload Bug Fixed
- **FIXED**: Continue button after practice exercises was reloading entire page and sending user back to main menu
- **ROOT CAUSE**: QuestionDisplay component had a "Continue" button that called window.location.reload() when explanation was shown
- **SOLUTION**: Removed the problematic Continue button from QuestionDisplay - parent component (Home.tsx) now fully controls post-explanation flow
- **IMPACT**: Practice mode users now see "Generate Another Practice Question" button after completing a question, no more accidental page reloads
- **VERIFIED**: Architect review confirmed fix resolves reload issue without breaking other flows

### October 17, 2025 - Essay Submission Error Fixed
- **FIXED**: Essay answer submission failures due to payload size limits and hanging requests
- **ROOT CAUSE**: Express had 100kb default body limit (long essays exceeded this) and AI grading had no timeout protection
- **SOLUTION 1**: Increased Express body size limit to 10MB for JSON and URL-encoded data
- **SOLUTION 2**: Added 60-second timeout wrapper for all AI grading API calls (OpenAI, Anthropic, DeepSeek, Perplexity)
- **SOLUTION 3**: Enhanced error messages to show actual backend error details instead of generic "Failed to submit answer"
- **IMPACT**: Long essay answers now submit successfully, hanging requests timeout gracefully with clear error messages
- **VERIFIED**: Architect review confirmed fixes resolve submission failures without security issues

### October 17, 2025 - Question State Persistence Bug Fixed
- **FIXED**: Continue button now properly clears previous answer when advancing to next question
- **ROOT CAUSE**: QuestionDisplay components had no key prop, causing React to reuse component instances and retain internal answer state
- **SOLUTION**: Added unique key prop (`${currentSession.id}-${currentQuestionNumber}`) to all 5 QuestionDisplay components (diagnostic/practice, full exam, day 1, day 2, day 3)
- **IMPACT**: Forces React to unmount old component and mount fresh one when question changes, resetting all internal state including selected answers
- **VERIFIED**: Architect review confirmed fix with no regressions or side effects

### October 17, 2025 - All Day Exam and Practice Options Fixed
- **FIXED**: All exam generation buttons (Day 1, Day 2, Day 3) now properly display exams after generation (added complete tab switching with both activeTestTab AND activeTab)
- **FIXED**: All Day 1 Practice Options buttons now functional (Individual MPT Task, Writing Drills, Short Answer Practice, Texas Procedure Drills)
- **FIXED**: All Day 2 Practice Options buttons now functional (Mixed Topic Practice, Constitutional Law, Contracts, Torts, Criminal Law, Evidence, Real Property, Civil Procedure)  
- **FIXED**: All Day 3 Individual Essay Practice buttons now functional (Business Associations, Family Law, Secured Transactions, Trusts & Estates, Real Property, Mixed Practice)
- **FIXED**: Generate New Question button now uses current question type instead of defaulting to multiple-choice
- **CRITICAL FIX**: Added setActiveTab(type) to generateFullExam - was only setting activeTestTab, causing exams to generate but not display visually
- **IMPROVEMENT**: Added automatic tab switching when practice buttons are clicked to ensure questions are visible
- **VERIFIED**: All exam flows tested and confirmed working by architect review

### August 1, 2025 - Diagnostic Test Flow Fixed
- **FIXED**: Next Question button now appears when answer is selected in diagnostic mode
- **FIXED**: Removed automatic 0.5-second delays that were causing test interruptions
- **FIXED**: Corrected diagnostic test configuration to use 3 questions instead of 20
- **VERIFIED**: Complete 5-point verification protocol passed for diagnostic flow functionality
- **TEST BEHAVIOR**: Diagnostic tests store answers locally, submit all at completion for LLM grading
- **USER CONFIRMATION**: User tested flow successfully - diagnostic test progression now working properly