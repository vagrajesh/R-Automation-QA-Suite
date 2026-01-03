# Swagger RAG Backend API

REST API server for the Swagger RAG Test Generator framework.

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and API keys
```

### 3. Start Server
```bash
npm run server
```

Server runs on: `http://localhost:3001`

## Available Endpoints

### 🔍 **RAG Search**
- `POST /api/rag/search` - Search with vector/keyword/hybrid modes
- `GET /api/rag/stats` - Database statistics

### 🧪 **Test Generation**
- `POST /api/tests/generate-rag` - Generate tests from RAG context
- `POST /api/tests/generate-document` - Generate tests from document content

### 📄 **Document Management**
- `POST /api/documents/ingest` - Ingest files/URLs/content
- `GET /api/documents/list` - List ingested documents

### 🔧 **System**
- `GET /api/health` - Server status

## Development

```bash
npm run dev    # Development mode with hot reload
npm run build  # Build TypeScript
npm start      # Start production server
```

## Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string
- `GROQ_API_KEY` - Groq API key for LLM

Optional:
- `PORT` - Server port (default: 3001)
- `LLM_PROVIDER` - groq/openai/anthropic (default: groq)
- `RAG_TOP_K` - Number of search results (default: 5)

## API Documentation

See `../API_ENDPOINTS.md` for complete API documentation with examples.