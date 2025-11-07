import express from 'express';
import healthRouter from './routes/health';
import moviesRouter from './routes/movies';
import moviesPostRouter from './routes/movies.post';

const app = express();
app.use(express.json());

app.use('/health', healthRouter);
app.use('/movies', moviesRouter);
app.use('/movies', moviesPostRouter);

export default app;
