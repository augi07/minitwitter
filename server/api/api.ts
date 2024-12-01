import { Request, Response, Express } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../auth-Middleware/auth'; // Auth Middleware importieren
import { Database } from '../database/database';

export class API {
  app: Express;
  db: Database;

  constructor(app: Express, db: Database) {
    this.app = app;
    this.db = db;

    // Unprotected Routes
    this.app.post('/register', this.registerUser.bind(this));
    this.app.post('/login', this.loginUser.bind(this));

    this.app.get('/protected', authenticateToken, (req: Request, res: Response) => {
      if (req.user) {
        res.send(`Hello, ${req.user.username}! This is a protected route.`);
      } else {
        res.status(403).send('User not found');
      }
    });
  }

  private registerUser = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = `
        INSERT INTO users (username, password)
        VALUES (?, ?);
      `;
      await this.db.executeSQL(query, [username, hashedPassword]);
      res.status(201).send('User registered successfully');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error registering user');
    }
  };

  private loginUser = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    try {
      const query = `SELECT * FROM users WHERE username = ?`;
      const users: any = await this.db.executeSQL(query, [username]);

      if (users.length === 0) {
        return res.status(404).send('User not found');
      }

      const user = users[0];
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).send('Invalid credentials');
      }

      // JWT generieren
      const token = jwt.sign(
        { id: user.id, username: user.username }, // Payload
        process.env.JWT_SECRET || 'supersecretkey', // Secret Key
        { expiresIn: '1h' } // Token Ablaufzeit
      );

      res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error logging in');
    }
  };
}