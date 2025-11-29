import express from 'express';
import healthRouter from './routes/health';
import moviesRouter from './routes/movies';
import moviesPostRouter from './routes/movies.admin';
import tvRouter from './routes/tv';
import tvAdminRouter from './routes/tv.admin';
import authRouter from './routes/auth/auth';
import { requireAuth, requireRole } from './middleware/auth';
import adminRouter from './routes/admin';
import moviesNeoRouter from './routes/neo4j/movies.neo';
import moviesNeoAdmin from './routes/neo4j/movies.neo.admin';
import tvNeoRouter from './routes/neo4j/tv.neo';
import tvNeoAdmin from './routes/neo4j/tv.neo.admin';
import moviesMongoRouter from "./routes/mongo/movies.mongo";
import moviesMongoAdmin from "./routes/mongo/movies.mongo.admin";
import tvMongoRouter from "./routes/mongo/tv.mongo";
import tvMongoAdmin from "./routes/mongo/tv.mongo.admin"; // later



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

// Public neo4j reads
app.use("/neo/movies", moviesNeoRouter);
app.use("/neo/tv", tvNeoRouter);

//Protected neo4j reads
app.use("/neo/movies", requireAuth, requireRole('admin'), moviesNeoAdmin);
app.use("/neo/tv", requireAuth, requireRole('admin'), tvNeoAdmin);


app.use("/mongo/movies", moviesMongoRouter);
app.use("/mongo/movies", requireAuth, requireRole("admin"), moviesMongoAdmin);

app.use("/mongo/tv", tvMongoRouter);
app.use("/mongo/tv", requireAuth, requireRole("admin"), tvMongoAdmin);

export default app;
