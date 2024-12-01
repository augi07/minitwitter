import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string }; // Typ der `user`-Eigenschaft definieren
    }
  }
}