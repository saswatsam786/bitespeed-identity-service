import { join } from 'path';
import { Logger } from '../utils/logger';
import { DatabaseConnection } from './connection';
import { readFileSync } from 'fs';

class Seeder {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'bitespeed_identity',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 5,
    };

    this.db = DatabaseConnection.getInstance(config);
  }

  public async seedDatabase(): Promise<void> {
    try {
      this.logger.info('Starting database seed');
      const seedFile = join(__dirname, 'seeds', 'sample_data.sql');
      const seedSQL = readFileSync(seedFile, 'utf-8');
      await this.db.query(seedSQL);
      this.logger.info('Database seeded');
    } catch (error) {
      this.logger.error('Failed to seed database', { error });
      throw error;
    }
  }
}

const seeder = new Seeder();
seeder
  .seedDatabase()
  .then(() => {
    console.log('Database seeded');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed database', { error });
    process.exit(1);
  });
