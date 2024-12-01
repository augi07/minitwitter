import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).send('Access Token required'); // Kein explizites "return" notwendig
    return; // Füge ein `return` hinzu, um sicherzustellen, dass die Funktion beendet wird
  }

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey', (err, user) => {
    if (err) {
      res.status(403).send('Invalid Token'); // Kein explizites "return" notwendig
      return;
    }

    req.user = user as { id: number; username: string };
    next(); // Führe die nächste Middleware aus
  });
};