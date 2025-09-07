import { Pool, PoolClient } from 'pg';
import { DatabaseNamespace } from '../dto/database-namespace';
import { Logger } from '../utils/logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private logger: Logger;

  private constructor(config: DatabaseNamespace.DatabaseConfig) {
    this.logger = Logger.getInstance();
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (error) => {
      this.logger.error('Database connection error', { error });
    });

    this.pool.on('connect', (client) => {
      this.logger.info('Database connection established');
    });
  }

  public static getInstance(config?: DatabaseNamespace.DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('Database config is required');
      }
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  public async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      this.logger.error('Failed to get database client', { error });
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Executed query in ${duration}ms`, { query: text, params });
      return result;
    } catch (error) {
      this.logger.error('Failed to execute query', { error, text, params });
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Database pool closed');
  }

  public async isConnected(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}
