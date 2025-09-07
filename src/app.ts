import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import { DatabaseNamespace } from './dto/database-namespace';
import { Logger } from './utils/logger';
import { DatabaseConnection } from './database/connection';
import { IdentityController } from './controllers/identity-controller';
import { Contact } from './models/contact';
import { IdentityService } from './services/identity-service';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

class App {
  private app: express.Application;
  private logger: Logger;
  private db!: DatabaseConnection;
  private identityController!: IdentityController;

  constructor() {
    this.app = express();
    this.logger = Logger.getInstance();
    this.initializeDatabase();
    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeDatabase(): void {
    this.logger = Logger.getInstance();
    const config: DatabaseNamespace.DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'bitespeed_identity',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: parseInt(process.env.DB_MAX || '20'),
    };
    this.db = DatabaseConnection.getInstance(config);
  }

  private initializeServices(): void {
    const contactModal = new Contact(this.db);
    const identityService = new IdentityService(contactModal);
    this.identityController = new IdentityController(identityService);
  }

  private initializeMiddleware(): void {
    this.app.use(helmet());

    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      }),
    );

    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(morgan('combined'));
  }

  private initializeRoutes(): void {
    // Routes to be added
    this.app.get('/health', this.identityController.health);

    this.app.post('/identify', this.identityController.identify);

    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Route not found',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(
      (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        this.logger.error('Unhandled error', { error: err });
        res.status(500).json({
          error: 'Internal server error',
        });
      },
    );

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled Rejection', { reason });
      process.exit(1);
    });
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || 3000;
    try {
      const isDBConnected = await this.db.isConnected();
      if (!isDBConnected) {
        this.logger.error('Database connection failed');
        process.exit(1);
      }
      this.app.listen(port, () => {
        this.logger.info(`Server is running on port ${port}`);
        this.logger.info(`Environment: ${process.env.NODE_ENV}`);
      });
    } catch (error) {
      this.logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

export default App;
