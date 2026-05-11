import { sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';

import {
  decodeBase64Url,
  decodeJsonBase64Url,
  encodeBase64Url,
  encodeJsonBase64Url,
} from '../utils/base64url';

export type JwtAlgorithm = 'ES256' | 'ES384' | 'ES512';

export type JwtHeader = {
  alg: JwtAlgorithm;
  typ: 'JWT';
  cty?: string;
};

export type RegisteredClaims = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
};

export type JwtPayload = Record<string, unknown>;

export type SignInput = {
  header: JwtHeader;
  claims?: Partial<RegisteredClaims>;
  payload?: JwtPayload;
  privateKey: string;
};

export type VerifyOptions = {
  algs?: JwtAlgorithm[];
  iss?: string;
  sub?: string;
  aud?: string;
  ignoreExp?: boolean;
  ignoreNbf?: boolean;
  jti?: string;
};

export type DecodedJwt = {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
};

const ALGORITHM_MAP: Record<
  JwtAlgorithm,
  { hash: 'sha256' | 'sha384' | 'sha512'; signatureLength: number }
> = {
  ES256: {
    hash: 'sha256',
    signatureLength: 64,
  },
  ES384: {
    hash: 'sha384',
    signatureLength: 96,
  },
  ES512: {
    hash: 'sha512',
    signatureLength: 132,
  },
};

const SUPPORTED_HEADER_PARAMETERS = new Set(['alg', 'typ', 'cty']);

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

function ensureJwtHeader(header: unknown): asserts header is JwtHeader {
  if (!isJsonObject(header)) {
    throw new Error('JWT header is required');
  }

  for (const parameter of Object.keys(header)) {
    if (!SUPPORTED_HEADER_PARAMETERS.has(parameter)) {
      throw new Error(`Unsupported JWT header parameter: ${parameter}`);
    }
  }

  if (typeof header.alg !== 'string' || !(header.alg in ALGORITHM_MAP)) {
    throw new Error('Unsupported JWT algorithm');
  }

  if (header.typ !== 'JWT') {
    throw new Error('Invalid JWT type');
  }

  if (header.cty !== undefined) {
    if (header.cty !== 'JWT') {
      throw new Error('Unsupported JWT content type');
    }

    throw new Error('Nested JWT is not supported');
  }
}

const ensurePayloadIsSerializable = (payload: JwtPayload): void => {
  try {
    JSON.stringify(payload);
  } catch {
    throw new Error('Payload must be JSON serializable');
  }
};

const decodeJwtObject = (
  encoded: string,
  component: 'header' | 'payload',
): Record<string, unknown> => {
  let decoded: unknown;

  try {
    decoded = decodeJsonBase64Url<unknown>(encoded);
  } catch {
    throw new Error(`Invalid JWT ${component}`);
  }

  if (!isJsonObject(decoded)) {
    throw new Error(`JWT ${component} must be a JSON object`);
  }

  return decoded;
};

const ensureNumericDate = (
  payload: JwtPayload,
  claim: 'exp' | 'nbf' | 'iat',
): number | undefined => {
  const value = payload[claim];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`JWT ${claim} claim must be a NumericDate`);
  }

  return value;
};

const ensureStringClaim = (
  payload: JwtPayload,
  claim: 'iss' | 'sub' | 'jti',
): string | undefined => {
  const value = payload[claim];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`JWT ${claim} claim must be a string`);
  }

  return value;
};

const ensureAudienceClaim = (
  payload: JwtPayload,
): string | string[] | undefined => {
  const value = payload.aud;

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }

  throw new Error('JWT aud claim must be a string or string array');
};

export const sign = ({
  header,
  claims = {},
  payload = {},
  privateKey,
}: SignInput): string => {
  ensureJwtHeader(header);

  const mergedPayload: JwtPayload = {
    ...payload,
    ...claims,
  };

  ensurePayloadIsSerializable(mergedPayload);

  const encodedHeader = encodeJsonBase64Url(header);
  const encodedPayload = encodeJsonBase64Url(mergedPayload);

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = cryptoSign(
    ALGORITHM_MAP[header.alg].hash,
    Buffer.from(signingInput),
    {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    },
  );

  if (signature.byteLength !== ALGORITHM_MAP[header.alg].signatureLength) {
    throw new Error('Invalid ECDSA signature length');
  }

  return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`;
};

const validateRegisteredClaims = (
  payload: JwtPayload,
  options: VerifyOptions,
): void => {
  const now = Math.floor(Date.now() / 1000);
  const exp = ensureNumericDate(payload, 'exp');
  const nbf = ensureNumericDate(payload, 'nbf');
  ensureNumericDate(payload, 'iat');
  const iss = ensureStringClaim(payload, 'iss');
  const sub = ensureStringClaim(payload, 'sub');
  const jti = ensureStringClaim(payload, 'jti');
  const aud = ensureAudienceClaim(payload);

  if (!options.ignoreExp && exp !== undefined && exp < now) {
    throw new Error('JWT expired');
  }

  if (!options.ignoreNbf && nbf !== undefined && nbf > now) {
    throw new Error('JWT is not active yet');
  }

  if (options.iss && iss !== options.iss) {
    throw new Error('JWT issuer mismatch');
  }

  if (options.sub && sub !== options.sub) {
    throw new Error('JWT subject mismatch');
  }

  if (
    options.aud &&
    (aud === undefined ||
      (Array.isArray(aud) ? !aud.includes(options.aud) : aud !== options.aud))
  ) {
    throw new Error('JWT audience mismatch');
  }

  if (options.jti && jti !== options.jti) {
    throw new Error('JWT ID mismatch');
  }
};

export const verify = (
  token: string,
  publicKey: string,
  options: VerifyOptions = {},
): DecodedJwt => {
  if (!token || typeof token !== 'string') {
    throw new Error('JWT must be a string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtObject(encodedHeader, 'header');
  const payload = decodeJwtObject(encodedPayload, 'payload');
  let signatureBytes: Uint8Array;

  ensureJwtHeader(header);

  if (options.algs && !options.algs.includes(header.alg)) {
    throw new Error('JWT algorithm is not allowed');
  }

  try {
    signatureBytes = decodeBase64Url(encodedSignature);
  } catch {
    throw new Error('Invalid JWT signature');
  }

  if (signatureBytes.byteLength !== ALGORITHM_MAP[header.alg].signatureLength) {
    throw new Error('Invalid JWT signature');
  }

  const signedPart = `${encodedHeader}.${encodedPayload}`;

  const isValidSignature = cryptoVerify(
    ALGORITHM_MAP[header.alg].hash,
    Buffer.from(signedPart),
    {
      key: publicKey,
      dsaEncoding: 'ieee-p1363',
    },
    signatureBytes,
  );

  if (!isValidSignature) {
    throw new Error('Invalid JWT signature');
  }

  validateRegisteredClaims(payload, options);

  return {
    header,
    payload,
    signature: encodedSignature,
  };
};
