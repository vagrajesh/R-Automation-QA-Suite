import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { TestGenerator } from '../lib/test/generator.js';
import { ChatGroq } from '@langchain/groq';
import { MODEL_CONFIGS } from '../config/models.js';
import retriever from '../lib/rag/retriever.js';
import { DocumentIngestionService } from '../lib/rag/documentIngestionService.js';
import { ParserFactory } from '../lib/parsers/ParserFactory.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Generate tests from RAG
router.post('/generate-rag', async (req, res) => {
  try {
    const { endpoint, count = 2, type = 'both' } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    // Initialize LLM
    const config = MODEL_CONFIGS.groq;
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      ...config
    });

    const testGenerator = new TestGenerator(llm as any);
    
    // Retrieve context from RAG
    const context = await retriever.retrieve(endpoint);
    const contextStr = retriever.formatContext(context);

    // Generate tests
    const result = await testGenerator.generateTestsFromContext(
      endpoint,
      contextStr,
      parseInt(count),
      type
    );

    res.json({
      success: true,
      endpoint,
      count: parseInt(count),
      type,
      contextDocuments: context.length,
      result
    });

  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Test generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate tests from document content
router.post('/generate-document', async (req, res) => {
  try {
    const { content, endpoint, count = 2, type = 'both' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    // Initialize LLM
    const config = MODEL_CONFIGS.groq;
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      ...config
    });

    const testGenerator = new TestGenerator(llm as any);
    
    // Generate tests from content
    const result = await testGenerator.generateTestsFromContext(
      endpoint || 'API endpoints',
      content,
      parseInt(count),
      type,
      'User Provided Document Content'
    );

    res.json({
      success: true,
      endpoint: endpoint || 'API endpoints',
      count: parseInt(count),
      type,
      contextDocuments: 1,
      result
    });

  } catch (error) {
    console.error('Document test generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Document test generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate tests from custom prompt
router.post('/generate-prompt', async (req, res) => {
  try {
    const { prompt, endpoint, count = 2, type = 'both' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Initialize LLM
    const config = MODEL_CONFIGS.groq;
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      ...config
    });

    const testGenerator = new TestGenerator(llm as any);
    
    // Generate tests from custom prompt
    const result = await testGenerator.generateTestsFromContext(
      endpoint || 'API endpoints',
      prompt,
      parseInt(count),
      type,
      'Custom Prompt'
    );

    res.json({
      success: true,
      prompt,
      endpoint: endpoint || 'API endpoints',
      count: parseInt(count),
      type,
      contextDocuments: 1,
      result
    });

  } catch (error) {
    console.error('Prompt test generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Prompt test generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate tests from uploaded file
router.post('/generate-file', upload.single('file'), async (req, res) => {
  try {
    const { endpoint, count = 2, type = 'both' } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Initialize LLM
    const config = MODEL_CONFIGS.groq;
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      ...config
    });

    const testGenerator = new TestGenerator(llm as any);
    
    // Parse the uploaded file
    const ingestionService = new DocumentIngestionService();
    const parsedDoc = await ingestionService.parseDocument(file.path);
    
    // Generate tests from file content
    const result = await testGenerator.generateTestsFromContext(
      endpoint || 'API endpoints from file',
      parsedDoc.content,
      parseInt(count),
      type,
      `Uploaded File: ${file.originalname}`
    );

    res.json({
      success: true,
      fileName: file.originalname,
      endpoint: endpoint || 'API endpoints from file',
      count: parseInt(count),
      type,
      contextDocuments: 1,
      result
    });

    // Clean up uploaded file after processing
    try {
      fs.unlinkSync(file.path);
    } catch (cleanupError) {
      console.warn('Failed to clean up uploaded file:', cleanupError);
    }

  } catch (error) {
    console.error('File test generation error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file on error:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'File test generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate tests from URL
router.post('/generate-url', async (req, res) => {
  try {
    const { url, endpoint, count = 2, type = 'both' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Initialize LLM
    const config = MODEL_CONFIGS.groq;
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      ...config
    });

    const testGenerator = new TestGenerator(llm as any);
    
    // Parse the URL using ParserFactory
    const parserFactory = new ParserFactory();
    const parser = parserFactory.getParser(url);
    
    if (!parser) {
      return res.status(400).json({ error: 'Unsupported URL type' });
    }
    
    const parsedDoc = await parser.parse(url);
    
    // Generate tests from URL content
    const result = await testGenerator.generateTestsFromContext(
      endpoint || 'API endpoints from URL',
      parsedDoc.content,
      parseInt(count),
      type,
      `URL: ${url}`
    );

    res.json({
      success: true,
      url,
      endpoint: endpoint || 'API endpoints from URL',
      count: parseInt(count),
      type,
      contextDocuments: 1,
      result
    });

  } catch (error) {
    console.error('URL test generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'URL test generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;