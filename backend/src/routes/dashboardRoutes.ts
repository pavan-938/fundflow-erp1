import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { requireAuth } from '../middleware/auth';

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/summary', dashboardController.summary);

export default dashboardRouter;
