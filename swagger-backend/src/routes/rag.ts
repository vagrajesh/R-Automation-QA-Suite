import { Router } from 'express';
import retriever from '../lib/rag/retriever.js';
import vectorStore from '../lib/rag/vectorStore.js';

const router = Router();

// Search RAG database
router.post('/search', async (req, res) => {
  try {
    const { query, mode = 'hybrid', limit = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let results;
    
    switch (mode.toLowerCase()) {
      case 'vector':
        results = await vectorStore.search(query, parseInt(limit));
        break;
      case 'keyword':
        results = await vectorStore.findByQuery(
          { $text: { $search: query } }, 
          parseInt(limit)
        );
        break;
      case 'hybrid':
      default:
        results = await retriever.retrieve(query);
        break;
    }

    const limitedResults = results.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      query,
      mode,
      count: limitedResults.length,
      results: limitedResults
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get RAG statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await vectorStore.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;