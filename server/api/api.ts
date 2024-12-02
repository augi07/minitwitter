import { Request, Response, Express, NextFunction } from 'express';
import { ResultSetHeader } from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authenticateToken from '../auth-Middleware/auth'; // Auth Middleware importieren
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

    // Protected Routes
    this.app.get('/posts', authenticateToken, this.getPosts.bind(this));
    this.app.post('/posts', authenticateToken, this.createPost.bind(this));
    this.app.put('/posts/:id', authenticateToken, this.updatePost.bind(this));
    this.app.delete('/posts/:id', authenticateToken, this.deletePost.bind(this));
  }

  private async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const query = `SELECT * FROM tweets WHERE user_id = ? ORDER BY created_at DESC`;
      const posts = await this.db.executeSQL(query, [req.user?.id]);
      res.json(posts);
    } catch (error) {
      next(error);
    }
  }

  private async createPost(req: Request, res: Response, next: NextFunction) {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    try {
      const query = `INSERT INTO tweets (user_id, content, created_at) VALUES (?, ?, NOW())`;
      const result = await this.db.executeSQL<ResultSetHeader>(query, [req.user?.id, content]);
      res.status(201).json({ message: 'Post created', postId: result.insertId });
    } catch (error) {
      next(error);
    }
  }

  private async updatePost(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    try {
      const query = `UPDATE tweets SET content = ? WHERE id = ? AND user_id = ?`;
      const result = await this.db.executeSQL<ResultSetHeader>(query, [content, id, req.user?.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Post not found or unauthorized' });
      }
      res.json({ message: 'Post updated' });
    } catch (error) {
      next(error);
    }
  }

  private async deletePost(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const query = `DELETE FROM tweets WHERE id = ? AND user_id = ?`;
      const result = await this.db.executeSQL<ResultSetHeader>(query, [id, req.user?.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Post not found or unauthorized' });
      }
      res.json({ message: 'Post deleted' });
    } catch (error) {
      next(error);
    }
  }

  private async registerUser(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
      await this.db.executeSQL(query, [username, hashedPassword]);
      res.status(201).send('User registered');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error registering user');
    }
  }

  private async loginUser(req: Request, res: Response) {
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

      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '1h' });
      res.json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error logging in');
    }
  }
}