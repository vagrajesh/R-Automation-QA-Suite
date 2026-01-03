# Frontend Integration Guide: Swagger-API Tab

## Overview
This guide explains how to integrate the backend APIs with the frontend Swagger - API Testcase Generator tab in the R-Automation-QA-Suite application. The integration focuses exclusively on the Swagger - API Testcase Generator tab functionality for generating API tests from various sources.

## Backend API Endpoints

All endpoints are accessible at `http://localhost:3001/api` and return JSON responses.

### Test Generation Endpoints

#### 1. Generate Tests from RAG
**Endpoint**: `POST /api/tests/generate-rag`
**Purpose**: Generate tests using documents stored in the RAG knowledge base

**Request Body**:
```json
{
  "endpoint": "GET /users",
  "count": 2,
  "type": "both"
}
```

**Response**:
```json
{
  "success": true,
  "endpoint": "GET /users",
  "count": 2,
  "type": "both",
  "contextDocuments": 5,
  "result": { /* generated test cases */ }
}
```

#### 2. Generate Tests from Document Content
**Endpoint**: `POST /api/tests/generate-document`
**Purpose**: Generate tests from raw text content

**Request Body**:
```json
{
  "content": "API specification text...",
  "endpoint": "GET /users",
  "count": 2,
  "type": "both"
}
```

#### 3. Generate Tests from Custom Prompt
**Endpoint**: `POST /api/tests/generate-prompt`
**Purpose**: Generate tests using a custom natural language prompt

**Request Body**:
```json
{
  "prompt": "Generate API tests for user authentication",
  "endpoint": "GET /users",
  "count": 2,
  "type": "both"
}
```

#### 4. Generate Tests from File Upload
**Endpoint**: `POST /api/tests/generate-file`
**Purpose**: Generate tests from uploaded document files

**Request**: `multipart/form-data`
- `file`: File upload (supports .yaml, .yml, .json, .pdf, .xlsx, .xls, .csv, .docx, .doc, .txt, .md)
- `endpoint`: Optional endpoint specification
- `count`: Optional number of test cases (default: 2)
- `type`: Optional test case type (default: "both")

#### 5. Generate Tests from URL
**Endpoint**: `POST /api/tests/generate-url`
**Purpose**: Generate tests from web-based documents and APIs

**Request Body**:
```json
{
  "url": "https://petstore3.swagger.io/",
  "endpoint": "GET /users",
  "count": 2,
  "type": "both"
}
```

**Supported URL Types**:
- Swagger UI base URLs (auto-resolves to spec)
- Direct OpenAPI/Swagger spec URLs (.json/.yaml)
- Confluence pages
- Text files (.txt, .md, .json)

### Document Management Endpoints

#### 6. Ingest Document
**Endpoint**: `POST /api/documents/ingest`
**Purpose**: Add documents to the RAG knowledge base

**Request**: `multipart/form-data`
- `file`: File upload (same supported formats as generate-file)

#### 7. Search RAG
**Endpoint**: `POST /api/rag/search`
**Purpose**: Search the RAG knowledge base

**Request Body**:
```json
{
  "query": "user authentication",
  "mode": "hybrid",
  "limit": 5
}
```

**Modes**:
- `"hybrid"`: Combined semantic + keyword search (default)
- `"vector"`: Pure vector similarity search
- `"keyword"`: Text-based search

## Frontend Integration

### Component Structure
**Main Component**: `src/components/SwaggerAPI.tsx`

**State Variables**:
```typescript
const [ragEndpoint, setRagEndpoint] = useState('');
const [ragTestCount, setRagTestCount] = useState(2);
const [ragTestType, setRagTestType] = useState('both');
const [docEndpoint, setDocEndpoint] = useState('');
const [docTestCount, setDocTestCount] = useState(2);
const [docTestType, setDocTestType] = useState('both');
const [query, setQuery] = useState('');
const [searchMode, setSearchMode] = useState('hybrid');
const [searchLimit, setSearchLimit] = useState(5);
const [customLimit, setCustomLimit] = useState('');
const [documentContent, setDocumentContent] = useState('');
const [results, setResults] = useState<any>(null);
const [loadingRAG, setLoadingRAG] = useState(false);
const [loadingDocument, setLoadingDocument] = useState(false);
const [loadingFile, setLoadingFile] = useState(false);
const [loadingSearch, setLoadingSearch] = useState(false);
const [loadingIngest, setLoadingIngest] = useState(false);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [selectedTestFile, setSelectedTestFile] = useState<File | null>(null);
const [url, setUrl] = useState('');
const [loadingUrl, setLoadingUrl] = useState(false);
const [loadingPrompt, setLoadingPrompt] = useState(false);
```

### API Service Layer
**File**: `src/services/ragApiService.ts`

**Base Configuration**:
```typescript
const BASE_URL = 'http://localhost:3001/api';
```

**Available Methods**:
```typescript
// Test Generation
generateTests(endpoint, count, type)                    // RAG-based
generateTestsFromDocument(content, endpoint, count, type) // Raw content
generateTestsFromFile(file, endpoint, count, type)      // File upload
generateTestsFromUrl(url, endpoint, count, type)        // URL-based
generateTestsFromPrompt(prompt, endpoint, count, type)  // Custom prompt

// Document Management
ingestDocument(file)                                    // Add to RAG
searchRAG(query, mode, limit)                          // Search knowledge base
```

### UI Layout Structure

#### Section 1: Generate Tests from RAG
- **Input**: Endpoint text field (`ragEndpoint`)
- **Controls**: Test count (1-10), Test type dropdown (`ragTestType`)
- **Button**: "Generate from RAG" (disabled if no endpoint)
- **Loading State**: `loadingRAG`

#### Section 2: Generate Tests from Document
- **Input**: Endpoint text field (`docEndpoint`) - optional
- **Textarea**: Raw document content (`documentContent`)
- **File Input**: Supports multiple document types (`selectedTestFile`)
- **URL Input**: For web-based documents (`url`)
- **Controls**: Same count/type controls as RAG section
- **Buttons**:
  - "Generate from Content" (requires content)
  - "Generate from File" (requires file)
  - "Generate from URL" (requires URL)

#### Section 3: RAG Management
- **File Upload**: Add documents to knowledge base
- **Search**: Query the RAG database
- **Document List**: View ingested documents

### Event Handlers

#### RAG Generation
```typescript
const handleGenerateTests = async () => {
  if (!ragEndpoint) return;
  setLoadingRAG(true);
  try {
    const result = await ragApiService.generateTests(ragEndpoint, ragTestCount, ragTestType);
    setResults(result);
  } catch (error) {
    console.error('Error:', error);
    setResults({ error: 'Failed to generate tests' });
  }
  setLoadingRAG(false);
};
```

#### Document Generation
```typescript
const handleGenerateFromDocument = async () => {
  if (!documentContent) return;
  setLoadingDocument(true);
  try {
    const result = await ragApiService.generateTestsFromDocument(documentContent, docEndpoint, docTestCount, docTestType);
    setResults(result);
  } catch (error) {
    console.error('Error:', error);
    setResults({ error: 'Document test generation failed' });
  }
  setLoadingDocument(false);
};
```

#### File Generation
```typescript
const handleGenerateFromFile = async () => {
  if (!selectedTestFile) return;
  setLoadingFile(true);
  try {
    const result = await ragApiService.generateTestsFromFile(selectedTestFile, docEndpoint, docTestCount, docTestType);
    setResults(result);
  } catch (error) {
    console.error('Error:', error);
    setResults({ error: 'File test generation failed' });
  }
  setLoadingFile(false);
};
```

#### URL Generation
```typescript
const handleGenerateFromUrl = async () => {
  if (!url) return;
  setLoadingUrl(true);
  try {
    const result = await ragApiService.generateTestsFromUrl(url, docEndpoint, docTestCount, docTestType);
    setResults(result);
  } catch (error) {
    console.error('Error:', error);
    setResults({ error: 'URL test generation failed' });
  }
  setLoadingUrl(false);
};
```

#### Prompt Generation
```typescript
const handleGenerateFromPrompt = async () => {
  const prompt = window.prompt('Enter custom prompt for test generation:');
  if (!prompt) return;
  setLoadingPrompt(true);
  try {
    const result = await ragApiService.generateTestsFromPrompt(prompt, docEndpoint, docTestCount, docTestType);
    setResults(result);
  } catch (error) {
    console.error('Error:', error);
    setResults({ error: 'Prompt test generation failed' });
  }
  setLoadingPrompt(false);
};
```

### Results Display
All generation methods update the `results` state, which is displayed in a dedicated results section with:
- Clear button to reset results
- JSON-formatted output in a scrollable code block
- Error handling and user-friendly messages

## Configuration

### Backend Environment (.env)
```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://your-connection-string
MONGODB_DB_NAME=swagger_test_generator

# LLM Provider Configuration
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
MISTRAL_API_KEY=your_mistral_api_key

# RAG Configuration
RAG_TOP_K=5
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Server Configuration
PORT=3001
```

### Frontend Environment
```bash
# Usually no special env vars needed
# Backend URL is hardcoded as http://localhost:3001/api
```

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure your API keys and MongoDB URI
npm run build
npm start  # or npm run dev for development
```

### 2. Frontend Setup
```bash
cd frontend/R-Automation-QA-Suite
npm install
npm run dev  # Starts on http://localhost:5174
```

### 3. Database Setup
- Ensure MongoDB Atlas cluster is accessible
- Database name: `swagger_test_generator`
- Collections created automatically:
  - `rag_documents` (vector storage)
  - Indexes created for text search and vector search

## Testing the Integration

1. **Start Backend**: `npm run dev` in backend folder
2. **Start Frontend**: `npm run dev` in frontend folder
3. **Test Endpoints**:
   - Try "Generate from URL" with `https://petstore3.swagger.io/`
   - Upload a Swagger file and generate tests
   - Enter custom content and generate tests
   - Use custom prompt for generation

## Error Handling

### Backend Error Responses
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Frontend Error Handling
- Console logging for debugging
- User-friendly error messages in results display
- Loading states properly managed
- File cleanup handled automatically

## Dependencies

### Backend Dependencies (package.json)
```json
{
  "dependencies": {
    "@apidevtools/swagger-parser": "^12.1.0",
    "@langchain/core": "^0.3.22",
    "@langchain/groq": "^0.1.3",
    "@langchain/mongodb": "^0.1.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.1",
    "mongodb": "^6.10.0",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "xlsx": "^0.18.5",
    "mammoth": "^1.6.0",
    "swagger-parser": "^10.0.3"
  }
}
```

### Frontend Dependencies (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "lucide-react": "^0.344.0",
    "tailwindcss": "^3.4.0"
  }
}
```

## Data Flow

```
User Input → Frontend Component → API Service → Backend Route → Processing → Response → UI Update

1. User selects generation type (RAG/File/URL/Content/Prompt)
2. Frontend collects parameters (endpoint, count, type, file/URL/content/prompt)
3. ragApiService sends appropriate request to backend
4. Backend processes:
   - RAG: Queries vector DB + LLM generation
   - File: Parses uploaded file + LLM generation
   - URL: Fetches/parses URL + LLM generation
   - Content/Prompt: Direct LLM generation
5. Response contains generated test cases
6. Frontend displays results with metadata (context docs, source, etc.)
```

## Key Integration Points

- **CORS**: Enabled on backend for frontend communication
- **File Upload**: Uses `multer` with automatic cleanup
- **Error Recovery**: Graceful handling of failures
- **State Management**: Local React state with proper loading indicators
- **API Consistency**: All endpoints follow same request/response patterns

This guide provides complete integration details for setting up the Swagger-API tab functionality on a new machine.</content>
<parameter name="filePath">c:\Users\venik\OneDrive\Documents\GenAI\swagger-rag-test-generator\frontend-integration.md