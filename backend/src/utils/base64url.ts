const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;

export const encodeBase64Url = (input: Uint8Array): string => {
  const base64 = Buffer.from(input).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const decodeBase64Url = (input: string): Uint8Array => {
  if (!BASE64URL_PATTERN.test(input) || input.length % 4 === 1) {
    throw new Error('Invalid base64url input');
  }

  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=');
  return new Uint8Array(Buffer.from(padded, 'base64'));
};

export const encodeJsonBase64Url = (value: unknown): string => {
  return encodeBase64Url(encoder.encode(JSON.stringify(value)));
};

export const decodeJsonBase64Url = <T>(value: string): T => {
  const raw = decoder.decode(decodeBase64Url(value));
  return JSON.parse(raw) as T;
};
