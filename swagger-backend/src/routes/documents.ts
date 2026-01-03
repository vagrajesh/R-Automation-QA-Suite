import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { DocumentIngestionService } from '../lib/rag/documentIngestionService.js';
import vectorStore from '../lib/rag/vectorStore.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Ingest document into RAG
router.post('/ingest', upload.single('file'), async (req, res) => {
  try {
    const { url, content } = req.body;
    const file = req.file;
    
    if (!file && !url && !content) {
      return res.status(400).json({ 
        error: 'File, URL, or content is required' 
      });
    }

    const ingestionService = new DocumentIngestionService();
    let parsedDoc;
    let source;

    if (file) {
      source = file.path;
      parsedDoc = await ingestionService.parseDocument(file.path);
    } else if (url) {
      source = url;
      parsedDoc = await ingestionService.parseDocument(url);
    } else {
      source = 'direct-content';
      parsedDoc = {
        content,
        metadata: { title: 'Direct Content', source: 'user-input' }
      };
    }

    // Create RAG document
    const ragDoc = {
      type: 'endpoint' as const,
      title: parsedDoc.metadata.title || 'Untitled Document',
      content: parsedDoc.content,
      endpoint: '',
      method: 'GET',
      tags: [],
      metadata: {
        ...parsedDoc.metadata,
        source
      }
    };

    // Use deduplication service for ingestion
    const result = await ingestionService.ingestWithDeduplication([ragDoc]);

    res.json(result);

    // Clean up uploaded file after processing
    if (file) {
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', cleanupError);
      }
    }

  } catch (error) {
    console.error('Document ingestion error:', error);
    
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
      error: 'Document ingestion failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get ingested documents list
router.get('/list', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    const documents = await vectorStore.findByQuery(
      {}, 
      parseInt(limit as string)
    );

    res.json({
      success: true,
      count: documents.length,
      documents: documents.map((doc: any, index: number) => ({
        id: `doc_${index}`,
        title: doc.title,
        type: doc.type,
        source: doc.metadata?.source || 'unknown',
        contentLength: doc.content.length,
        createdAt: doc.metadata?.createdAt
      }))
    });

  } catch (error) {
    console.error('Document list error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;