import mysql, { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';
import { USER_TABLE, TWEET_TABLE, COMMENT_TABLE } from './schema'

export class Database {
  // Properties
  private _pool: mysql.Pool

  // Constructor
  constructor() {
    this._pool = mysql.createPool({
      database: process.env.DB_NAME || 'minitwitter',
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'minitwitter',
      password: process.env.DB_PASSWORD || 'supersecret123',
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10
    })
    this.initializeDBSchema()
  }

  // Methods
  private initializeDBSchema = async () => {
    console.log('Initializing DB schema...')
    await this.executeSQL(USER_TABLE)
    await this.executeSQL(TWEET_TABLE)
    await this.executeSQL(COMMENT_TABLE)
  }

  public async executeSQL<T extends RowDataPacket[] | OkPacket | ResultSetHeader>(
    query: string,
    params: any[] = []
  ): Promise<T> {
    try {
      console.log('Executing SQL:', query, 'with params:', params); // Debugging
      const conn = await this._pool.getConnection();
      try {
        const [results] = await conn.query<T>(query, params);
        console.log('Query results:', results); // Debugging
        return results;
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error('Error executing query:', err);
      throw err; // Re-throw error for API error handling
    }
  }       
}
