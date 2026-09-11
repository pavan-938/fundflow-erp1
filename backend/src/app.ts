import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import challanRoutes from './routes/challanRoutes';
import customerRoutes from './routes/customerRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import productRoutes from './routes/productRoutes';
import rbacRoutes from './routes/rbacRoutes';
import stockMovementRoutes from './routes/stockMovementRoutes';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'fundflow-api',
    });
  });

  app.get('/api', (_req, res) => {
    res.status(200).json({
      name: 'FundFlow ERP API',
      version: '1.0.0',
      message: 'Auth, CRM, inventory, sales challans, and dashboard summary.',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/stock-movements', stockMovementRoutes);
  app.use('/api/challans', challanRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/rbac', rbacRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
