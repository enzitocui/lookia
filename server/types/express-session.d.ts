declare module 'express-session' {
  interface SessionData {
    userId?: number;
    exhibitionAccount?: boolean;
  }
}

declare global {
  namespace Express {
    interface Request {
      session: Session & Partial<SessionData>;
    }
  }
}

export {};
