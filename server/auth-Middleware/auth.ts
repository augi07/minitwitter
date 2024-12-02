import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Typ-Erweiterung für Express-Request
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string }; // Typ für den Benutzer
    }
  }
}

// Middleware zur Authentifizierung von Tokens
const authenticateToken: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization']; // Header extrahieren
  const token = authHeader && authHeader.split(' ')[1]; // Token extrahieren

  // Logging für Debugging
  console.log('Authorization Header:', req.headers['authorization']);
  console.log('Extracted Token:', token);

  if (!token) {
    res.status(401).json({ message: 'Access token missing' }); // Kein Token vorhanden
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey', (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.status(403).json({ message: 'Invalid token' }); // Token ungültig
    }

    req.user = user as { id: number; username: string }; // Benutzer-Information hinzufügen
    console.log('Authenticated User:', req.user);
    next(); // Weiterleitung zur nächsten Middleware oder Route
  });
};

export default authenticateToken;