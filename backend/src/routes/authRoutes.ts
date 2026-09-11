import { Router } from 'express';
import * as authController from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { loginSchema } from '../schemas/authSchemas';

const authRouter = Router();

authRouter.post('/login', validateRequest(loginSchema), authController.login);
authRouter.get('/me', requireAuth, authController.me);

export default authRouter;
