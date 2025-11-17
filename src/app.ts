import express from 'express';
import healthRouter from './routes/health';
import moviesRouter from './routes/movies';
import moviesPostRouter from './routes/movies.admin';
import tvRouter from './routes/tv';
import tvAdminRouter from './routes/tv.admin';
import authRouter from './routes/auth/auth';
import { requireAuth, requireRole } from './middleware/auth';
import adminRouter from './routes/admin';


const app = express();
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);

// Our public reads
app.use('/movies', moviesRouter);
app.use('/tv', tvRouter);


// Our protect creates with admin:
app.use('/movies', requireAuth, requireRole('admin'), moviesPostRouter);
app.use('/tv', requireAuth, requireRole('admin'), tvAdminRouter);
app.use('/admin', adminRouter);



export default app;
