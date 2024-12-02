import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access token missing' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey', (err, user) => {
    if (err) {
      res.status(403).json({ message: 'Invalid token' });
      return;
    }

    req.user = user as { id: number; username: string };
    next();
  });
};

export default authenticateToken;