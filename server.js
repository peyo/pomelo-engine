import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import screenRouter from './routes/screen.js';
import qualifyRouter from './routes/qualify.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/screen', screenRouter);
app.use('/api/qualify', qualifyRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
