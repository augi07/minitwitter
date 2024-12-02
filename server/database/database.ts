import mysql, { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';
import { USER_TABLE, TWEET_TABLE } from './schema'

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
      connectionLimit: 5,
    })
    this.initializeDBSchema()
  }

  // Methods
  private initializeDBSchema = async () => {
    console.log('Initializing DB schema...')
    await this.executeSQL(USER_TABLE)
    await this.executeSQL(TWEET_TABLE)
  }

  public executeSQL = async <T extends RowDataPacket[] | OkPacket | ResultSetHeader>(
    query: string,
    params: any[] = []
  ): Promise<T> => {
    try {
      const conn = await this._pool.getConnection();
      try {
        const [results] = await conn.query<T>(query, params);
        return results;
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error('Error executing query:', err);
      throw err; // Wirf den Fehler weiter, um ihn im API-Handler zu behandeln
    }
  };
}
