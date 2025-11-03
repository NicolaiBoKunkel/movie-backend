import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

// graceful shutdown (ctrl+c)
process.on('SIGINT', () => {
  console.log('\nshutting down...');
  server.close(() => process.exit(0));
});
