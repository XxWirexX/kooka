import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/http.js';
import { rateLimit } from '../../lib/rateLimit.js';

const COOKIE = 'kooka_session';
const SESSION_DAYS = 90;

export interface AuthConfig {
  /** Mot de passe de l'app. Vide : pas de protection (développement local uniquement). */
  password?: string;
  /** Clé de signature des sessions. Par défaut, dérivée du mot de passe (le changer déconnecte tout le monde). */
  secret?: string;
  /** Cookie `Secure` (HTTPS uniquement) : à activer en production. */
  secureCookie: boolean;
}

/**
 * Protection par mot de passe unique (l'app est mono-utilisateur).
 * La session est un cookie signé sans état serveur : `<expiration>.<signature HMAC>`.
 */
export function createAuth(config: AuthConfig) {
  const enabled = Boolean(config.password);
  const secret = config.secret || sha256(`kooka:${config.password ?? ''}`);

  const sign = (value: string) => createHmac('sha256', secret).update(value).digest('base64url');

  function issueToken(): string {
    const expires = String(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    return `${expires}.${sign(expires)}`;
  }

  function isValid(token: string | undefined): boolean {
    if (!token) return false;
    const [expires, signature] = token.split('.');
    if (!expires || !signature || Number(expires) < Date.now()) return false;
    return safeEqual(signature, sign(expires));
  }

  const isAuthenticated = (cookieHeader: string | undefined) => !enabled || isValid(readCookie(cookieHeader, COOKIE));

  /** Bloque toutes les routes /api sauf la santé et l'authentification. */
  const guard: RequestHandler = (req, res, next) => {
    if (req.path === '/health' || req.path.startsWith('/auth/') || isAuthenticated(req.headers.cookie)) return next();
    res.status(401).json({ error: 'Connexion requise' });
  };

  const cookieOptions = (maxAgeMs: number) =>
    [
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
      config.secureCookie ? 'Secure' : null,
    ]
      .filter(Boolean)
      .join('; ');

  const router = Router();
  // 10 essais par quart d'heure et par adresse : décourage les tentatives en série.
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Trop de tentatives, réessaie plus tard' });

  router.get('/me', (req, res) => {
    res.json({ required: enabled, authenticated: isAuthenticated(req.headers.cookie) });
  });

  router.post('/login', loginLimit, (req, res) => {
    const { password } = z.object({ password: z.string().max(200) }).parse(req.body);
    if (!enabled) {
      res.json({ ok: true });
      return;
    }
    if (!safeEqual(sha256(password), sha256(config.password!))) throw new HttpError(401, 'Mot de passe incorrect');
    res.setHeader('Set-Cookie', `${COOKIE}=${issueToken()}; ${cookieOptions(SESSION_DAYS * 24 * 60 * 60 * 1000)}`);
    res.json({ ok: true });
  });

  router.post('/logout', (_req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieOptions(0)}`);
    res.json({ ok: true });
  });

  return { enabled, guard, router };
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}
