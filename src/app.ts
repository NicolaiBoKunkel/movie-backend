import express from 'express';
import healthRouter from './routes/health';
import moviesRouter from './routes/movies';

const app = express();
app.use(express.json());

app.use('/health', healthRouter);
app.use('/movies', moviesRouter);

export default app;
