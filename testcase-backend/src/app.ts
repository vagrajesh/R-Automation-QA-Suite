import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes';
import embeddingRoutes from './routes/embedding.routes';
import searchRoutes from './routes/search.routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use(healthRoutes);
app.use(embeddingRoutes);
app.use(searchRoutes);

app.get('/', (_req, res) => res.json({ success: true, message: 'RAG backend API' }));

export default app;
