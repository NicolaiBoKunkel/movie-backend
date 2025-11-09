import express from 'express';
import healthRouter from './routes/health';
import moviesRouter from './routes/movies';
import moviesPostRouter from './routes/movies.post';
import authRouter from './routes/auth/auth';
import { requireAuth, requireRole } from './middleware/auth';

const app = express();
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);

// Our public reads
app.use('/movies', moviesRouter);

// Our protect creates with admin:
app.use('/movies', requireAuth, requireRole('admin'), moviesPostRouter);

export default app;
