import { useState } from 'react';
import { Upload, Search, FileText, Globe, MessageSquare, Database, Loader2, X } from 'lucide-react';
import { ragApiService } from '../services/ragApiService';

export function SwaggerAPI() {
  // State for RAG generation
  const [ragEndpoint, setRagEndpoint] = useState('');
  const [ragTestCount, setRagTestCount] = useState(2);
  const [ragTestType, setRagTestType] = useState('both');

  // State for document generation
  const [docEndpoint, setDocEndpoint] = useState('');
  const [docTestCount, setDocTestCount] = useState(2);
  const [docTestType, setDocTestType] = useState('both');
  const [documentContent, setDocumentContent] = useState('');
  const [selectedTestFile, setSelectedTestFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');

  // State for RAG management
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('hybrid');
  const [searchLimit, setSearchLimit] = useState(5);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Loading states
  const [loadingRAG, setLoadingRAG] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingIngest, setLoadingIngest] = useState(false);

  // Results
  const [results, setResults] = useState<any>(null);

  // Event Handlers
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

  const handleSearchRAG = async () => {
    if (!query) return;
    setLoadingSearch(true);
    try {
      const result = await ragApiService.searchRAG(query, searchMode, searchLimit);
      setResults(result);
    } catch (error) {
      console.error('Error:', error);
      setResults({ error: 'Search failed' });
    }
    setLoadingSearch(false);
  };

  const handleIngestDocument = async () => {
    if (!selectedFile) return;
    setLoadingIngest(true);
    try {
      const result = await ragApiService.ingestDocument(selectedFile);
      setResults(result);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error:', error);
      setResults({ error: 'Document ingestion failed' });
    }
    setLoadingIngest(false);
  };

  return (
    <div className="space-y-8">
      {/* Generate Tests from RAG */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Generate Tests from RAG</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Endpoint</label>
            <input
              type="text"
              value={ragEndpoint}
              onChange={(e) => setRagEndpoint(e.target.value)}
              placeholder="GET /users"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Test Count</label>
            <select
              value={ragTestCount}
              onChange={(e) => setRagTestCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Test Type</label>
            <select
              value={ragTestType}
              onChange={(e) => setRagTestType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="both">Both</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleGenerateTests}
          disabled={!ragEndpoint || loadingRAG}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loadingRAG ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Generate from RAG
        </button>
      </div>

      {/* Generate Tests from Document */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-semibold text-slate-900">Generate Tests from Document</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Endpoint (Optional)</label>
            <input
              type="text"
              value={docEndpoint}
              onChange={(e) => setDocEndpoint(e.target.value)}
              placeholder="GET /users"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Test Count</label>
            <select
              value={docTestCount}
              onChange={(e) => setDocTestCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Test Type</label>
            <select
              value={docTestType}
              onChange={(e) => setDocTestType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="both">Both</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>

        {/* Content Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Document Content</label>
          <textarea
            value={documentContent}
            onChange={(e) => setDocumentContent(e.target.value)}
            placeholder="Paste your API specification or documentation here..."
            rows={6}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* File Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Or Upload File</label>
          <input
            type="file"
            onChange={(e) => setSelectedTestFile(e.target.files?.[0] || null)}
            accept=".yaml,.yml,.json,.pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.md"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Or Enter URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://petstore3.swagger.io/"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerateFromDocument}
            disabled={!documentContent || loadingDocument}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingDocument ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate from Content
          </button>
          
          <button
            onClick={handleGenerateFromFile}
            disabled={!selectedTestFile || loadingFile}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Generate from File
          </button>
          
          <button
            onClick={handleGenerateFromUrl}
            disabled={!url || loadingUrl}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Generate from URL
          </button>
          
          <button
            onClick={handleGenerateFromPrompt}
            disabled={loadingPrompt}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Generate from Prompt
          </button>
        </div>
      </div>

      {/* RAG Management */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-slate-900">RAG Management</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document Ingestion */}
          <div>
            <h4 className="text-lg font-medium text-slate-800 mb-3">Add Document to Knowledge Base</h4>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".yaml,.yml,.json,.pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.md"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
            />
            <button
              onClick={handleIngestDocument}
              disabled={!selectedFile || loadingIngest}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingIngest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Ingest Document
            </button>
          </div>

          {/* Search RAG */}
          <div>
            <h4 className="text-lg font-medium text-slate-800 mb-3">Search Knowledge Base</h4>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search query..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
            />
            <div className="flex gap-2 mb-3">
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hybrid">Hybrid</option>
                <option value="vector">Vector</option>
                <option value="keyword">Keyword</option>
              </select>
              <select
                value={searchLimit}
                onChange={(e) => setSearchLimit(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[1,2,3,4,5,10,15,20].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSearchRAG}
              disabled={!query || loadingSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-900">Results</h3>
            <button
              onClick={() => setResults(null)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-auto">
            <pre className="text-sm text-slate-800 whitespace-pre-wrap">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}