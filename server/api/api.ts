import { Request, Response, Express, NextFunction } from 'express';
import { ResultSetHeader } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authenticateToken from '../auth-Middleware/auth'; // Auth Middleware importieren
import { Database } from '../database/database';
import { AuthenticatedRequest } from '../types/express'; // Pfad anpassen

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

    // Comment Routes
    this.app.get('/posts/:postId/comments', authenticateToken, this.getComments.bind(this));
    this.app.post('/posts/:postId/comments', authenticateToken, this.createComment.bind(this));   
    this.app.put('/posts/:postId/comments/:id', authenticateToken, this.updateComment.bind(this));
    this.app.delete('/posts/:postId/comments/:id', authenticateToken, this.deleteComment.bind(this));

    // Like Routes
    this.app.post('/posts/:id/like', authenticateToken, this.likePost.bind(this));
    this.app.post('/posts/:id/dislike', authenticateToken, this.dislikePost.bind(this));


    this.app.use(this.disableCache);
  }

  // --- Utility Functions ---
  private validateId(id: number | string ): boolean {
    const numId = Number(id); // Konvertiere in eine Zahl
    return !isNaN(numId) && numId > 0;
  }  

  // --- Post Functions ---
  private async getPosts(req: AuthenticatedRequest, res: Response) {
    try {
      const query = `SELECT tweets.id, tweets.content, tweets.created_at, users.username 
                     FROM tweets 
                     INNER JOIN users ON tweets.user_id = users.id 
                     ORDER BY tweets.created_at DESC`;
      const posts = await this.db.executeSQL<RowDataPacket[]>(query);
      res.json(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Error fetching posts' });
    }
  }

  private async createPost(req: AuthenticatedRequest, res: Response) {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Invalid content' });
    }

    try {
      const query = `INSERT INTO tweets (user_id, content, created_at) VALUES (?, ?, NOW())`;
      const result = await this.db.executeSQL<ResultSetHeader>(query, [req.user?.id, content]);
      res.status(201).json({ message: 'Post created', postId: (result as ResultSetHeader).insertId });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ message: 'Error creating post' });
    }
  }

  private async updatePost(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { content } = req.body;

    if (!this.validateId(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Invalid content' });
    }

    try {
      const query = `UPDATE tweets SET content = ? WHERE id = ? AND user_id = ?`;
      const result = await this.db.executeSQL<ResultSetHeader>(query, [content, id, req.user?.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Post not found or unauthorized' });
      }
      res.json({ message: 'Post updated' });
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ message: 'Error updating post' });
    }
  }

  private async deletePost(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    if (!this.validateId(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    try {
      const query = `DELETE FROM tweets WHERE id = ? AND user_id = ?`;
      const result = await this.db.executeSQL<ResultSetHeader>(query, [id, req.user?.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Post not found or unauthorized' });
      }
      res.json({ message: 'Post deleted' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ message: 'Error deleting post' });
    }
  }

  // --- Comment Functions ---
  private async createComment(req: AuthenticatedRequest, res: Response) {
    const postId = Number(req.params.postId);
    const { content } = req.body;

    console.log('Create Comment - Received POST Request'); // Log hinzufügen
    console.log('Post ID:', postId, 'Content:', content); // Log hinzufügen

    if (!this.validateId(postId)) {
        console.error('Invalid Post ID:', postId); // Log hinzufügen
        return res.status(400).json({ message: 'Invalid post ID' });
    }

    if (!content || typeof content !== 'string') {
        console.error('Invalid Content:', content); // Log hinzufügen
        return res.status(400).json({ message: 'Content cannot be empty' });
    }

    try {
        const query = `
          INSERT INTO comments (post_id, user_id, content, created_at)
          VALUES (?, ?, ?, NOW())
        `;
        const result = await this.db.executeSQL<ResultSetHeader>(query, [postId, req.user?.id, content]);

        console.log('Comment Created Successfully - ID:', result.insertId); // Log hinzufügen
        res.status(201).json({ message: 'Comment created', commentId: result.insertId });
    } catch (error) {
        console.error('Error creating comment:', error); // Log hinzufügen
        res.status(500).json({ message: 'Error creating comment' });
    }
  }

  //get commets
  
  private async getComments(req: AuthenticatedRequest, res: Response) {
    const { postId } = req.params;

    if (!this.validateId(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    try {
      const query = `
        SELECT c.id, c.content, c.created_at, u.username
        FROM comments c
        INNER JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `;
      const rows = await this.db.executeSQL<RowDataPacket[]>(query, [postId]);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Error fetching comments' });
    }
  }

  private async updateComment(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { content } = req.body;

    if (!this.validateId(id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Invalid content' });
    }

    try {
      const query = `UPDATE comments SET content = ? WHERE id = ? AND user_id = ?`;
      const result = await this.db.executeSQL<ResultSetHeader>(query, [content, id, req.user?.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Comment not found or unauthorized' });
      }
      res.json({ message: 'Comment updated' });
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({ message: 'Error updating comment' });
    }
  }

  private async deleteComment(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    if (!this.validateId(id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    try {
      const query = `DELETE FROM comments WHERE id = ? AND user_id = ?`;
      const result = await this.db.executeSQL<ResultSetHeader>(query, [id, req.user?.id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Comment not found or unauthorized' });
      }
      res.json({ message: 'Comment deleted' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Error deleting comment' });
    }
  }

  // Like eines Posts
  private async likePost(req: AuthenticatedRequest, res: Response) {
    const postId = Number(req.params.id);
  
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
  
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      const query = `
        INSERT INTO likes (post_id, user_id, type) 
        VALUES (?, ?, 'like')
        ON DUPLICATE KEY UPDATE type = 'like'
      `;
      await this.db.executeSQL(query, [postId, req.user.id]);
      res.status(200).json({ message: 'Post liked' });
    } catch (error) {
      console.error('Error liking post:', error);
      res.status(500).json({ message: 'Error liking post' });
    }
  }
  
  private async dislikePost(req: AuthenticatedRequest, res: Response) {
    const postId = Number(req.params.id);
  
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
  
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      const query = `
        INSERT INTO likes (post_id, user_id, type) 
        VALUES (?, ?, 'dislike')
        ON DUPLICATE KEY UPDATE type = 'dislike'
      `;
      await this.db.executeSQL(query, [postId, req.user.id]);
      res.status(200).json({ message: 'Post disliked' });
    } catch (error) {
      console.error('Error disliking post:', error);
      res.status(500).json({ message: 'Error disliking post' });
    }
  }  

// Abrufen von Like- und Dislike-Anzahl
  private async getLikes(req: AuthenticatedRequest, res: Response) {
    const postId = Number(req.params.id);

    if (!postId) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    try {
      const query = `
        SELECT 
          SUM(CASE WHEN type = 'like' THEN 1 ELSE 0 END) AS likes,
          SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END) AS dislikes
        FROM likes
        WHERE post_id = ?
      `;
      const result = (await this.db.executeSQL(query, [postId])) as RowDataPacket[];
      res.json(result);
    } catch (error) {
      console.error('Error fetching likes:', error);
      res.status(500).json({ message: 'Error fetching likes' });
    }
  }

    
  // --- Authentication ---
  private async registerUser(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).send('Invalid username or password');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
      await this.db.executeSQL(query, [username, hashedPassword]);
      res.status(201).send('User registered');
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).send('Error registering user');
    }
  }

  private async loginUser(req: Request, res: Response) {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).send('Invalid username or password');
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

      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || 'supersecretkey',
        { expiresIn: '1h' }
      );

      res.json({ token });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).send('Error logging in');
    }
  }

  public disableCache(req: Request, res: Response, next: NextFunction) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  }
}