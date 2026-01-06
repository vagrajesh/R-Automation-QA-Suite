# QA Automation Suite - Production Ready Setup Guide

## ✅ Status: PRODUCTION READY

Your frontend and backend are fully configured and ready for deployment.

---

## 📁 Project Structure

```
R-Automation-QA-Suite/
├── frontend/                          # React + Vite application
│   ├── src/
│   │   ├── App.tsx                   # Main app component
│   │   ├── main.tsx                  # React entry point
│   │   ├── components/               # React components (7 files)
│   │   ├── services/                 # API clients & state management
│   │   ├── config/                   # LLM provider configurations
│   │   └── index.css                 # Tailwind CSS
│   ├── dist/                         # Built production files
│   ├── index.html                    # HTML entry point
│   ├── vite.config.ts               # Vite build config
│   ├── tsconfig.json                # TypeScript config
│   ├── package.json                 # Frontend dependencies
│   └── .env                         # Environment variables
│
├── backend/                           # Express.js server
│   ├── src/
│   │   ├── server.ts                # Main server with API routes
│   │   ├── config/                  # Configuration files
│   │   ├── routes/                  # API route handlers
│   │   ├── services/                # Business logic
│   │   └── lib/                     # Utilities
│   ├── dist/                        # Compiled JavaScript
│   ├── tsconfig.json                # TypeScript config (ESNext modules)
│   ├── package.json                 # Backend dependencies
│   └── .env                         # Environment variables
│
└── Documentation files
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ installed
- npm or yarn package manager

### 1. Backend Setup & Start

```bash
cd backend

# Install dependencies (already done)
npm install

# Build TypeScript to JavaScript
npm run build

# Start the server
npm run dev
# OR for production
npm start

# Server will run on: http://localhost:3000
```

**Environment Variables (.env):**
```
PORT=3000
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
SESSION_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

### 2. Frontend Setup & Start

```bash
cd frontend

# Install dependencies (already done)
npm install

# Build for production
npm run build

# Start dev server
npm run dev

# Frontend will run on: http://localhost:5173
```

**Environment Variables (.env):**
```
VITE_API_BASE_URL=http://localhost:3000
VITE_BACKEND_PORT=3000
VITE_FRONTEND_PORT=5173
```

---

## 🔗 API Endpoints

### Health Check
- **GET** `/api/health` - Server health status

### Jira Integration
- **POST** `/api/jira/connect` - Connect to Jira
  - Body: `{ baseUrl, email, apiToken }`
- **GET** `/api/jira/stories` - Fetch stories from Jira

### ServiceNow Integration
- **POST** `/api/servicenow/connect` - Connect to ServiceNow
  - Body: `{ instanceUrl, username, password }`
- **GET** `/api/servicenow/stories` - Fetch stories from ServiceNow

---

## ✨ Key Features

### Frontend
- ✅ React 18.3.1 with TypeScript
- ✅ Vite 5.4.2 for fast development & optimized builds
- ✅ Tailwind CSS for styling
- ✅ 7 React components (LLMSettings, RequirementAnalysis, Settings, etc.)
- ✅ Multiple LLM provider support (OpenAI, Groq, Azure, Claude, TestLeaf)
- ✅ Jira & ServiceNow integration
- ✅ RAG API integration for test generation

### Backend
- ✅ Express.js 5.2.1 server
- ✅ TypeScript with strict mode
- ✅ ESM modules (ES2020)
- ✅ CORS & session management configured
- ✅ Axios for API calls
- ✅ Jira API integration
- ✅ ServiceNow API integration
- ✅ Error handling & logging

---

## 🔒 Security Notes

1. **SESSION_SECRET**: Change the default value in production
2. **API Keys**: Store in environment variables, never commit to git
3. **CORS_ORIGIN**: Update with your actual domain in production
4. **.env files**: Add to .gitignore (already recommended)
5. **HTTPS**: Use HTTPS in production

---

## 📦 Build & Deploy

### Frontend Production Build
```bash
cd frontend
npm run build
# Output: dist/ folder ready for deployment
```

### Backend Production Build
```bash
cd backend
npm run build
npm start
# Runs compiled dist/server.js
```

### Docker Deployment (Optional)
Create Dockerfile for containerization if needed.

---

## ✅ Verification Checklist

- ✅ No TypeScript compilation errors
- ✅ All imports resolved correctly
- ✅ ESM/CommonJS module conflict resolved
- ✅ Environment variables configured
- ✅ Backend builds successfully
- ✅ Frontend builds successfully
- ✅ API routes defined
- ✅ CORS configured
- ✅ Session management enabled
- ✅ Error handling in place

---

## 🆘 Troubleshooting

### Backend won't start
```
Error: Missing required environment variables
→ Solution: Check backend/.env has CORS_ORIGIN and SESSION_SECRET
```

### Frontend build fails
```
Error: terser not found
→ Solution: npm install --save-dev terser
```

### Module not found errors
```
Error: Cannot find module 'X'
→ Solution: npm install in the respective folder
```

### Port already in use
```
Error: EADDRINUSE: address already in use :::3000
→ Solution: Change PORT in .env or kill the process using the port
```

---

## 📞 Support

For issues or questions, refer to:
- Frontend: Check component files in `frontend/src/components/`
- Backend: Check routes in `backend/src/server.ts`
- Config: Check environment files `.env`

---

**Last Updated:** January 5, 2026  
**Status:** Production Ready ✅
