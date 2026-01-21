import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import quizRoutes from './routes/quiz.routes.js';

// ES Modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (two levels up from src/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.use('/api/quiz', quizRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
