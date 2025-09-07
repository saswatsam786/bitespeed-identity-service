import { join } from 'path';
import { DatabaseNamespace } from '../dto/database-namespace';
import { Logger } from '../utils/logger';
import { DatabaseConnection } from './connection';
import { readFileSync } from 'fs';

class DatabaseResetter {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor() {
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

  public async resetDatabase(): Promise<void> {
    try {
      this.logger.info('Starting database reset');

      // Read and execute the reset SQL file
      const resetFile = join(__dirname, 'reset.sql');
      const resetSQL = readFileSync(resetFile, 'utf-8');

      await this.db.query(resetSQL);

      this.logger.info('Database reset completed successfully');
    } catch (error) {
      this.logger.error('Failed to reset database', { error });
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.db.close();
  }
}

const resetter = new DatabaseResetter();
resetter
  .resetDatabase()
  .then(async () => {
    console.log('Database reset completed successfully');
    await resetter.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Failed to reset database:', error);
    await resetter.close();
    process.exit(1);
  });
