import { Pool, PoolClient, PoolConfig } from 'pg';
import { DatabaseNamespace } from '../dto/database-namespace';
import { Logger } from '../utils/logger';

interface PostgresError extends Error {
  code?: string;
  errno?: string | number;
  severity?: string;
  detail?: string;
  hint?: string;
  position?: string;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private logger: Logger;

  private constructor(config: DatabaseNamespace.DatabaseConfig) {
    this.logger = Logger.getInstance();

    const databaseUrl = process.env.DB_URL;

    const poolConfig: PoolConfig = databaseUrl
      ? {
          connectionString: databaseUrl,
          ssl: {
            rejectUnauthorized: false,
          },
          max: config.max || 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        }
      : {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          max: config.max,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (error: PostgresError) => {
      this.logger.error('Database pool error', {
        error: error.message,
        code: error.code,
        errno: error.errno,
      });
    });

    this.pool.on('connect', () => {
      this.logger.info('New database client connected');
    });

    this.pool.on('acquire', () => {
      this.logger.debug('Client acquired from pool');
    });

    this.pool.on('release', () => {
      this.logger.debug('Client released back to pool');
    });

    this.pool.on('remove', () => {
      this.logger.debug('Client removed from pool');
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
      this.logger.debug('Attempting to get database client...');
      const client = await this.pool.connect();
      this.logger.debug('Successfully got database client');
      return client;
    } catch (error) {
      const pgError = error as PostgresError;
      this.logger.error('Failed to get database client', {
        error: pgError.message,
        code: pgError.code,
        errno: pgError.errno,
      });
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async query(text: string, params?: any[]): Promise<any> {
    let client: PoolClient | null = null;
    try {
      this.logger.debug('Starting query execution...');
      client = await this.getClient();

      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;

      this.logger.debug(`Query executed successfully in ${duration}ms`, {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        paramCount: params ? params.length : 0,
      });

      return result;
    } catch (error) {
      const pgError = error as PostgresError;
      this.logger.error('Query execution failed', {
        error: pgError.message,
        code: pgError.code,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params ? params.length : 0,
      });
      throw error;
    } finally {
      if (client) {
        client.release();
        this.logger.debug('Database client released');
      }
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.info('Database pool closed successfully');
    } catch (error) {
      const pgError = error as PostgresError;
      this.logger.error('Error closing database pool', { error: pgError.message });
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing database connection...');

      const client = await this.getClient();
      const result = await client.query('SELECT 1 as test, NOW() as current_time');
      client.release();

      this.logger.info('Database connection test successful', {
        test: result.rows[0].test,
        serverTime: result.rows[0].current_time,
      });

      return true;
    } catch (error) {
      const pgError = error as PostgresError;
      this.logger.error('Database connection test failed', {
        error: pgError.message,
        code: pgError.code,
        errno: pgError.errno,
      });
      return false;
    }
  }

  public async isConnected(): Promise<boolean> {
    return this.testConnection();
  }

  // New method to get detailed connection info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getConnectionInfo(): any {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      options: {
        max: this.pool.options.max,
        idleTimeoutMillis: this.pool.options.idleTimeoutMillis,
        connectionTimeoutMillis: this.pool.options.connectionTimeoutMillis,
      },
    };
  }
}
