import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * `state` firmado para flujos OAuth que vuelven a un callback SIN sesión.
 *
 * El callback de Google Business recibía `state = organizationalId` en claro:
 * cualquiera podía armar un enlace de consentimiento con el id de OTRA
 * organización y, al aceptarlo, dejar SU cuenta de Google vinculada a ella
 * (CSRF de OAuth). Ahora el `state` lleva quién lo pidió y para qué
 * organización, vence pronto, y sin la firma no se acepta.
 *
 * Formato: `<payload base64url>.<hmac base64url>`. El payload no es secreto
 * —solo ids—; lo que importa es que no se pueda fabricar ni alterar.
 */
export interface SignedStatePayload {
  /** Organización a la que se vinculará la cuenta. */
  o: string;
  /** Usuario que inició el flujo. */
  u: string;
  /** Vencimiento, en ms desde epoch. */
  exp: number;
  /** Hace distinto cada `state`, aunque se pida dos veces en el mismo ms. */
  n: string;
}

/**
 * La clave se deriva del secreto con un propósito fijo: así un `state` nunca
 * sirve como otra cosa firmada con el mismo secreto (p. ej. un JWT).
 */
function deriveKey(secret: string, purpose: string): Buffer {
  if (!secret) {
    throw new Error('No hay secreto para firmar el state de OAuth.');
  }
  return createHash('sha256').update(`${purpose}:${secret}`).digest();
}

function sign(data: string, key: Buffer): string {
  return createHmac('sha256', key).update(data).digest('base64url');
}

export function createSignedState(
  data: { organizationalId: string; userId: string },
  secret: string,
  purpose: string,
  ttlMs: number,
  now = Date.now(),
): string {
  const payload: SignedStatePayload = {
    o: data.organizationalId,
    u: data.userId,
    exp: now + ttlMs,
    n: randomBytes(8).toString('base64url'),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, deriveKey(secret, purpose))}`;
}

/** Devuelve el payload si la firma es válida y no venció; si no, `null`. */
export function verifySignedState(
  state: string | undefined | null,
  secret: string,
  purpose: string,
  now = Date.now(),
): SignedStatePayload | null {
  if (!state || typeof state !== 'string') return null;
  const [body, mac, extra] = state.split('.');
  if (!body || !mac || extra !== undefined) return null;

  const expected = Buffer.from(sign(body, deriveKey(secret, purpose)));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }

  let payload: SignedStatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    typeof payload?.o !== 'string' ||
    typeof payload?.u !== 'string' ||
    typeof payload?.exp !== 'number' ||
    payload.exp < now
  ) {
    return null;
  }
  return payload;
}
