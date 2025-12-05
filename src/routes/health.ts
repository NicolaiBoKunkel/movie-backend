import { Router } from 'express';
const router = Router();

router.get('/', (_req, res) => res.json({ status: 'ok, bitch' }));

export default router;
