import { join } from 'path';
import { DatabaseNamespace } from '../dto/database-namespace';
import { Logger } from '../utils/logger';
import { DatabaseConnection } from './connection';
import { readFileSync } from 'fs';

class Migrator {
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

  public async runMigrations(): Promise<void> {
    try {
      this.logger.info('Running migrations');
      const migrationFile = join(__dirname, 'migrations', '001_create_contacts_table.sql');
      const migrationSQL = readFileSync(migrationFile, 'utf-8');

      await this.db.query(migrationSQL);

      this.logger.info('Migrations completed');
    } catch (error) {
      this.logger.error('Failed to run migrations', { error });
      throw error;
    }
  }
}

const migrator = new Migrator();
migrator
  .runMigrations()
  .then(() => {
    console.log('Migrations completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to run migrations', { error });
    process.exit(1);
  });
