# Visual Testing Platform - Complete Architecture & Implementation Guide
Applitools-like POC with AI-Powered Visual Diff

## 📚 Table of Contents
- Project Overview
- Architecture Principles
- Complete Folder Structure
- Core Domain Models
- System Architecture Diagram
- Implementation Phases
- API Design
- Configuration Management
- Error Handling Strategy
- Testing Strategy
- Deployment Considerations
- POC vs Production Roadmap

## 🚀 Project Overview
### Vision
Build a proof-of-concept visual testing platform with AI-powered diff analysis that detects visual regressions with intelligent explanations and minimal false positives.

### Core Value Proposition
- **AI-Powered Accuracy** - OpenAI-based visual diff with semantic understanding
- **Hybrid Approach** - Combine fast pixel diff with accurate AI analysis
- **Intelligent Explanations** - RAG-powered failure analysis with contextual suggestions
- **Developer Experience** - Simple API, clear results, actionable insights
- **Scalable Foundation** - Architecture ready for production expansion

### POC Scope Boundaries
**Included:** AI diff, priority queue, baseline management, RAG explanations

**Excluded:** Authentication, distributed workers, persistent queues, object storage

**Storage:** MongoDB only (no S3/MinIO)

**Queue:** In-memory only (no Redis/RabbitMQ)

**Auth:** None for POC

## 🏛️ Architecture Principles
1. **Clean Architecture Layers**
   - Domain Layer - Pure business logic, no dependencies
   - Application Layer - Use cases, orchestration
   - Infrastructure Layer - External integrations (DB, AI, Playwright)
   - API Layer - Controllers, DTOs, validation

2. **Dependency Inversion**
   - Repository interfaces in Domain layer
   - Implementations in Infrastructure layer
   - Dependency injection for testability

3. **Fail-Fast Validation**
   - Request validation at API boundary
   - Config validation at startup
   - Business rule validation in Application layer

4. **Observability First**
   - Structured logging (Winston)
   - Request tracing
   - Performance metrics collection
   - Error classification and handling

## 📁 Complete Folder Structure
/visualTestBackend
├── core/                           # Application bootstrap & shared setup
│   ├── app.ts                      # Express app setup
│   ├── server.ts                   # Server bootstrap / entry point
│   ├── config.ts                   # Central configuration loader
│   ├── env.ts                      # Environment variable parsing
│   ├── types.ts                    # Global TypeScript types/interfaces
│   ├── errors/                     # Custom error classes
│   │   ├── AppError.ts
│   │   ├── ValidationError.ts
│   │   ├── NotFoundError.ts
│   │   ├── ExternalServiceError.ts
│   │   └── UnauthorizedError.ts
│   └── middlewares/                # Global middlewares
│       ├── errorHandler.ts
│       ├── requestLogger.ts
│       ├── validateRequest.ts
│       └── auth.ts
├── api/                            # API Layer: Controllers, routes, DTOs, validators
│   ├── controllers/
│   │   ├── ProjectController.ts
│   │   ├── TestController.ts
│   │   └── BaselineController.ts
│   ├── routes/
│   │   ├── project.routes.ts
│   │   ├── test.routes.ts
│   │   └── baseline.routes.ts
│   ├── dtos/                       # Data Transfer Objects
│   │   ├── CreateProject.dto.ts
│   │   ├── RunTest.dto.ts
│   │   ├── UpdateBaseline.dto.ts
│   │   └── TestResult.dto.ts
│   └── validators/                 # Request validation schemas
│       ├── project.validator.ts
│       ├── test.validator.ts
│       └── baseline.validator.ts
├── application/                    # Application Layer: Use cases & business logic
│   ├── feature/                    # Feature-specific services
│   │   ├── VisualTesting.service.ts
│   │   ├── BaselineManagement.service.ts
│   │   └── ProjectManagement.service.ts
│   ├── mapping/                    # Entity/DTO mappers
│   │   ├── ProjectMapper.ts
│   │   ├── TestResultMapper.ts
│   │   └── BaselineMapper.ts
│   ├── execution/                  # Test execution orchestration
│   │   ├── TestExecutor.service.ts
│   │   ├── RetryManager.service.ts
│   │   └── ExecutionOrchestrator.service.ts
│   └── llm/                        # AI orchestration layer
│       ├── VisualDiffOrchestrator.service.ts
│       └── ExplanationGenerator.service.ts
├── domain/                         # Domain Layer: Core business models & interfaces
│   ├── models/                     # Domain entities
│   │   ├── Project.model.ts
│   │   ├── Baseline.model.ts
│   │   ├── TestResult.model.ts
│   │   ├── TestRun.model.ts
│   │   └── DiffResult.model.ts
│   └── repositories/               # Repository interfaces
│       ├── IProjectRepository.ts
│       ├── IBaselineRepository.ts
│       ├── ITestResultRepository.ts
│       └── ITestRunRepository.ts
├── infrastructure/                 # Infrastructure Layer: External integrations
│   ├── mcp/                        # In-memory queue / ConcurrentExecutionManager
│   │   ├── ConcurrentExecutionManager.ts
│   │   ├── JobQueue.service.ts
│   │   └── PriorityQueue.ts
│   ├── playwright/                 # Browser automation layer
│   │   ├── PlaywrightService.service.ts
│   │   └── tools/
│   │       ├── ScreenshotCapture.tool.ts
│   │       ├── DOMSnapshot.tool.ts
│   │       └── BrowserManager.tool.ts
│   ├── llm/                        # AI Diff Engine & RAG Layer
│   │   ├── services/
│   │   │   ├── OpenAIVisualDiff.service.ts
│   │   │   ├── HybridDiffEngine.service.ts
│   │   │   ├── RAGService.service.ts
│   │   │   └── SimpleExplanation.service.ts
│   │   ├── clients/
│   │   │   ├── OpenAIClient.ts
│   │   │   └── MongoDBClient.ts
│   │   └── prompts/                # AI prompt templates
│   │       ├── visual-diff.prompt.txt
│   │       ├── explanation.prompt.txt
│   │       └── rag-query.prompt.txt
│   ├── persistence/                # MongoDB interactions
│   │   └── mongodb/
│   │       ├── ProjectRepository.impl.ts
│   │       ├── BaselineRepository.impl.ts
│   │       ├── TestResultRepository.impl.ts
│   │       ├── TestRunRepository.impl.ts
│   │       └── MongoConnection.ts
│   ├── logging/                    # Winston structured logging
│   │   ├── WinstonLogger.ts
│   │   └── logger.ts
│   └── http/                       # External HTTP clients
│       └── HttpClient.ts
├── utils/                          # Shared utilities / helper functions
│   ├── imageUtils.ts
│   ├── domUtils.ts
│   ├── queueUtils.ts
│   └── validationUtils.ts
├── tests/                          # Unit and integration tests
│   ├── unit/
│   │   ├── core/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   └── integration/
│       ├── api/
│       ├── playwright/
│       └── llm/
├── config/                         # Configuration files
│   ├── default.ts
│   ├── development.ts
│   ├── production.ts
│   └── test.ts
├── scripts/                        # Database setup and seeding
│   ├── setup-db.ts
│   └── seed-data.ts
└── config files/                   # Environment and tooling configs
    ├── .env
    ├── .env.development
    ├── .env.test
    ├── .env.production
    ├── package.json
    ├── tsconfig.json
    ├── jest.config.ts
    └── eslint.config.js

## 📊 Core Domain Models
### 1. Project
- `id`: UUID v4
- `name`: Project name
- `baseUrl`: Base URL for tests
- `config`: Project-specific settings (diff thresholds, AI enabled, etc.)
- `createdAt`/`updatedAt`: Timestamps
- `isActive`: Soft delete flag

### 2. Baseline
- `id`: UUID v4
- `projectId`: Reference to Project
- `name`: Baseline name (e.g., "homepage")
- `image`: Base64 screenshot
- `domSnapshot`: JSON DOM structure
- `metadata`: Capture context (viewport, URL, timestamp)
- `version`: Incremental version number
- `isActive`: Active baseline version
- `tags`: For categorization

### 3. TestRun
- `id`: UUID v4
- `projectId`: Reference to Project
- `status`: QUEUED/RUNNING/COMPLETED/FAILED
- `priority`: HIGH/NORMAL/LOW
- `config`: Test configuration (URL, viewport, wait conditions)
- `retryCount`: Current retry attempt
- `maxRetries`: Maximum retries allowed
- `timestamps`: Created/started/completed

### 4. TestResult
- `id`: UUID v4
- `testRunId`: Reference to TestRun
- `baselineId`: Reference to Baseline
- `status`: PASSED/FAILED/UNRESOLVED
- `similarityScore`: 0-100%
- `diffRegions`: Array of changed areas with coordinates
- `screenshots`: Current and diff overlay images
- `explanations`: AI-generated change descriptions
- `metadata`: Execution details (time, AI model, tokens)

### 5. DiffResult
- `similarityScore`: 0-100%
- `isDifferent`: Boolean based on threshold
- `diffRegions`: Bounding boxes of changes
- `changeType`: Classification (layout, color, content, etc.)
- `confidence`: AI confidence score
- `rawAIResponse`: Original AI response for debugging

## 🗂️ System Architecture Diagram

┌─────────────────────────────────────────────────────────────────────────┐
│                          Client (Postman/Web UI)                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTP/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Server (Express/TS)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐  │
│  │ Controllers │  │   Routes    │  │      Validation Middleware      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Application Services
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 ConcurrentExecutionManager (In-Memory Queue)            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Priority Levels: HIGH │ NORMAL │ LOW                              │  │
│  │ Status: QUEUED → RUNNING → COMPLETED/FAILED                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Dequeue based on priority
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Playwright Worker Process                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Browser Launch & Navigation                                   │  │
│  │ 2. Screenshot Capture (full page/element)                        │  │
│  │ 3. DOM Snapshot Extraction                                       │  │
│  │ 4. Metadata Collection                                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Screenshot + DOM + Metadata
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Hybrid Diff Engine                            │
│  ┌─────────────────┐         ┌──────────────────────────────────┐     │
│  │   Pixel Diff    │────────▶│       AI Visual Diff             │     │
│  │  (Fast Check)   │         │  (OpenAI Semantic Analysis)      │     │
│  └─────────────────┘         └──────────────────────────────────┘     │
│       │ Threshold check            │ Generate explanations             │
│       ▼                            ▼                                   │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │          Combined Diff Result with Confidence Scores         │     │
│  └──────────────────────────────────────────────────────────────┘     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ If differences found
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          RAG Explanation Layer                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Query Vector DB for similar past failures                     │  │
│  │ 2. Retrieve context and solutions                               │  │
│  │ 3. Generate actionable explanations                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Complete Test Result
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        MongoDB Persistence Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │    Projects     │  │   Baselines     │  │    Test Results      │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Response to Client
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    JSON Response with Diff Visualization               │
│  - Test status (pass/fail)                                             │
│  - Similarity score                                                    │
│  - Diff regions (coordinates)                                          │
│  - AI explanations                                                     │
│  - Screenshot URLs/diff overlay                                        │
└─────────────────────────────────────────────────────────────────────────┘
🚀 Implementation Phases

## Environment Variables
.env file
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://localhost:27017/visualTesting
MONGODB_DATABASE=visualTesting

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-vision-preview
OPENAI_MAX_TOKENS=1000

# Playwright
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000

# Application Settings
DEFAULT_DIFF_THRESHOLD=95
MAX_RETRIES=3
QUEUE_CONCURRENCY=5

## 🗓️ Implementation Phases
### Phase 1: Foundation Setup (Week 1)
**Objective:** Establish core infrastructure and basic data models

**Tasks:**
- Project Setup
  - Initialize TypeScript project with Express
  - Configure ESLint, Jest, ts-node-dev
  - Set up Winston structured logging
- Create .env file
- Core Architecture
  - Create folder structure
  - Implement config management with Zod validation
  - Set up error handling middleware
  - Create custom error classes
- Database Layer
  - MongoDB Atlas connection setup
  - Create Project and Baseline domain models
  - Implement repository interfaces and MongoDB implementations
- Basic API
  - Project creation endpoint (POST /api/projects)
  - Baseline upload endpoint (POST /api/baselines)
  - Health check endpoint (GET /api/health)

**Deliverables:**
- Running Express server
- MongoDB connection
- Project and Baseline CRUD operations via API
- Structured logging

### Phase 2: Test Execution Engine (Week 2)
**Objective:** Build test execution pipeline with priority queue

**Tasks:**
- Queue Implementation
  - Create ConcurrentExecutionManager class
  - Implement priority-based job queue (HIGH/NORMAL/LOW)
  - Add job status tracking (QUEUED/RUNNING/COMPLETED/FAILED)
- Playwright Integration
  - Set up Playwright service for browser automation
  - Implement screenshot capture with viewport support
  - Add DOM snapshot extraction
  - Create browser management with resource cleanup
- Test Execution API
  - Test trigger endpoint (POST /api/tests/run)
  - Test status check endpoint (GET /api/tests/:id)
  - Implement synchronous response with job ID
- Retry Logic
  - Add retry count tracking to TestRun
  - Implement automatic retry on failure
  - Browser reset between retries

**Deliverables:**
- In-memory job queue with priority support
- Playwright screenshot capture
- Test execution API endpoints
- Basic retry mechanism

### Phase 3: AI Diff Engine (Week 3-4)
**Objective:** Implement AI-powered visual diff with hybrid approach

**Tasks:**
- Pixel Diff Foundation
  - Implement basic pixel comparison using pixelmatch
  - Calculate mismatch percentage
  - Generate diff overlay images
- OpenAI Integration
  - Set up OpenAI client with configuration
  - Create visual diff prompt for GPT-4V
  - Implement image preprocessing (resize, format conversion)
  - Parse structured JSON responses from AI
- Hybrid Diff Strategy
  - Create HybridDiffEngine service
  - Implement threshold-based routing (pixel → AI)
  - Combine results with confidence scoring
  - Add caching for identical comparisons
- Diff Configuration
  - Project-level diff threshold configuration
  - Per-test override capability
  - Tolerance zones configuration (ignore regions)
- Result Storage
  - Store TestResult with diff metadata
  - Save screenshots and diff overlays
  - Track AI usage metrics (tokens, latency)

**Deliverables:**
- Working pixel diff implementation
- OpenAI visual diff integration
- Hybrid diff engine with smart routing
- Configurable diff thresholds
- Complete test result storage

### Phase 4: RAG & Intelligence Layer (Week 5)
**Objective:** Add intelligent explanations and failure analysis

**Tasks:**
- RAG Foundation
  - Set up MongoDB vector database
  - Create embedding service for failure descriptions
  - Implement similarity search for past failures
- Explanation Generation
  - Create SimpleExplanationService for basic AI explanations
  - Develop RAG-enhanced explanation service
  - Implement context-aware suggestion generation
- Failure Analysis
  - Classify failure types (layout, color, content, missing)
  - Suggest potential causes based on patterns
  - Provide debugging recommendations
- Knowledge Base Population
  - Automatically index new failures
  - Add manual curation capability
  - Implement knowledge base cleanup/maintenance

**Deliverables:**
- Vector database setup with failure embeddings
- AI-generated explanations for visual diffs
- RAG-powered contextual suggestions
- Failure classification and analysis

### Phase 5: Baseline Management & Workflow (Week 6)
**Objective:** Complete baseline lifecycle management

**Tasks:**
- Baseline Versioning
  - Implement baseline version tracking
  - Add baseline comparison view
  - Create rollback capability
- Approval Workflow
  - Manual approval endpoint for new baselines
  - Auto-approval based on confidence scores
  - Approval history tracking
- Test Management
  - Batch test execution
  - Test suite organization
  - Test history and trend analysis
- Reporting Dashboard
  - JSON API for test results
  - Basic HTML dashboard
  - Diff visualization overlay

**Deliverables:**
- Complete baseline versioning system
- Approval workflow for baseline updates
- Test management interface
- Basic reporting dashboard

### Phase 6: Polish & Optimization (Week 7)
**Objective:** Improve performance, reliability, and developer experience

**Tasks:**
- Performance Optimization
  - Implement request/response caching
  - Optimize AI call batching
  - Improve image processing performance
- Error Handling Enhancement
  - Add comprehensive error recovery
  - Implement circuit breaker for external services
  - Add graceful degradation
- Developer Experience
  - Create Postman collection
  - Add comprehensive API documentation
  - Implement example scripts and tutorials
- Testing & Quality
  - Increase test coverage
  - Add integration tests for AI services
  - Performance benchmarking

**Deliverables:**
- Optimized performance metrics
- Robust error handling
- Complete documentation
- Comprehensive test suite

## 📡 API Design
**Base URL:** `/api/v1`

### 1. Project Management
POST /projects - Create new project
GET /projects - List all projects
GET /projects/:id - Get project details
PUT /projects/:id - Update project
DELETE /projects/:id - Delete project (soft)


### 2. Baseline Management
POST /projects/:projectId/baselines - Create/upload baseline
GET /projects/:projectId/baselines - List baselines
GET /baselines/:id - Get baseline details
PUT /baselines/:id - Update baseline
POST /baselines/:id/approve - Approve baseline update
GET /baselines/:id/history - Get version history


### 3. Test Execution
POST /tests/run - Execute visual test
GET /tests/:id - Get test result
GET /tests/project/:projectId - List project tests
POST /tests/batch - Execute batch of tests


### 4. Results & Reporting
GET /results/:id - Get detailed result
GET /results/project/:projectId - Project results summary
GET /results/dashboard - System dashboard
GET /results/trends/:projectId - Test trends over time


### 5. System Management
GET /health - System health check
GET /metrics - Performance metrics
GET /config - Current configuration
