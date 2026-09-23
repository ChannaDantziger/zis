import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';

export interface PostgresConfig {
  connectionString: string;
  max?: number;
}

export function createPostgresPool(config: PostgresConfig): Pool {
  return new Pool({ connectionString: config.connectionString, max: config.max });
}

export function createPostgresClientFactory(pool: Pool): SqlClientFactory {
  return async (): Promise<SqlClient> => {
    const client = await pool.connect();
    return new PoolClientAdapter(client);
  };
}

class PoolClientAdapter implements SqlClient {
  public constructor(private readonly client: PoolClient) {}

  query<Row extends QueryResultRow = QueryResultRow>(sql: string, values?: readonly unknown[]) {
    return this.client.query<Row>(sql, values as unknown[] | undefined);
  }

  release(): void {
    this.client.release();
  }
}
