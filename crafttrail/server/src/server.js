import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

/**
 * CORS.
 *
 * CLIENT_URL alone breaks every time you switch between local dev and the
 * deployed site, and Vercel hands out a fresh random subdomain on every preview
 * deploy. So: allow anything in CLIENT_URL (comma-separated), plus any
 * localhost port, plus any craft-trail Vercel domain.
 */
const allowed = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                                  // curl, health checks
    if (allowed.includes(origin)) return cb(null, true);
    if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);  // any local port
    if (/^https:\/\/craft-trail.*\.vercel\.app$/.test(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use('/api/artisans/:id/verify', rateLimit({ windowMs: 60_000, max: 10 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, max: 20 }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 200 }));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crafttrail')
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] CraftTrail API on :${PORT}  (OCR_MODE=${process.env.OCR_MODE || 'ocr'})`);
    });
  })
  .catch((err) => {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  });

export default app;