import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';

export const EXHIBITION_ACCOUNT_EMAIL = 'expo@lookia.com';

export const isExhibitionAccount = async (
  identifier: string,
  password: string,
  passwordHash: string | undefined,
) => {
  if (identifier.trim().toLocaleLowerCase('en') !== EXHIBITION_ACCOUNT_EMAIL) return false;
  if (!passwordHash) throw new Error('La cuenta de exposición no está configurada.');
  return bcrypt.compare(password, passwordHash);
};

export const establishExhibitionSession = (req: Request) => new Promise<void>((resolve, reject) => {
  req.session.regenerate(error => {
    if (error) {
      reject(error);
      return;
    }
    req.session.exhibitionAccount = true;
    req.session.save(saveError => saveError ? reject(saveError) : resolve());
  });
});

export const denyExhibitionAccount = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.exhibitionAccount) {
    return res.status(403).json({ error: 'Esta función no está disponible en el modo exposición.' });
  }
  return next();
};

export const authorizeProfileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.exhibitionAccount) return res.sendStatus(403);
  const requestedUserId = req.path.split('/').filter(Boolean)[0];
  if (!req.session?.userId || Number(requestedUserId) !== Number(req.session.userId)) {
    return res.sendStatus(404);
  }
  return next();
};
