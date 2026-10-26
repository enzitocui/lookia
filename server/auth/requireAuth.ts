import type { NextFunction, Request, Response } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.exhibitionAccount) {
    return res.status(403).json({ error: 'Esta función no está disponible en el modo exposición.' });
  }
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Debés iniciar sesión para continuar.' });
  }

  return next();
};
