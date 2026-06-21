import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import tasksRouter from './routes/tasks.ts';
import goalsRouter from './routes/goals.ts';
import memoryRouter from './routes/memory.ts';
import aiRouter from './routes/ai.ts';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(bodyParser.json());

app.use('/api/tasks', tasksRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/memories', memoryRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Velmeir server listening on http://localhost:${port}`);
});
