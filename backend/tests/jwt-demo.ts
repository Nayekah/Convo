import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

import { sign, verify } from '../src/lib/jwt';

const readRootEnv = () => {
  const envPath = resolve(process.cwd(), '../.env');
  const raw = readFileSync(envPath, 'utf-8');
  const values: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
};

const env = readRootEnv();
const privateKey = env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const publicKey = env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
const issuer = env.JWT_ISSUER ?? 'convo-auth';
const audience = env.JWT_AUDIENCE ?? 'convo-web';

if (!privateKey || !publicKey) {
  throw new Error(
    'JWT_PRIVATE_KEY dan JWT_PUBLIC_KEY harus tersedia di ../.env',
  );
}

const now = Math.floor(Date.now() / 1000);
const outputDir = resolve(process.cwd(), 'tokens');

const roguePair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const roguePrivateKey = roguePair.privateKey
  .export({ format: 'pem', type: 'pkcs8' })
  .toString();
const roguePublicKey = roguePair.publicKey
  .export({ format: 'pem', type: 'spki' })
  .toString();

const createToken = ({
  jti,
  claims,
  payload,
  signingKey = privateKey,
}: {
  jti: string;
  claims?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  signingKey?: string;
}) => {
  return sign({
    header: {
      alg: 'ES256',
      typ: 'JWT',
    },
    claims: {
      iss: issuer,
      aud: audience,
      sub: 'demo-user',
      iat: now,
      exp: now + 3600,
      jti,
      ...claims,
    },
    payload: {
      email: 'demo@example.com',
      role: 'tester',
      ...payload,
    },
    privateKey: signingKey,
  });
};

const validToken = createToken({ jti: 'demo-valid' });
const wrongSignatureToken = createToken({
  jti: 'demo-wrong-signature',
  signingKey: roguePrivateKey,
});
const expiredToken = createToken({
  jti: 'demo-expired',
  claims: {
    iat: now - 7200,
    exp: now - 3600,
  },
});
const futureNbfToken = createToken({
  jti: 'demo-future-nbf',
  claims: {
    nbf: now + 3600,
    exp: now + 7200,
  },
});
const invalidFormatToken = 'abc.def';

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, 'valid.jwt'), validToken);
writeFileSync(resolve(outputDir, 'wrong-signature.jwt'), wrongSignatureToken);
writeFileSync(resolve(outputDir, 'expired.jwt'), expiredToken);
writeFileSync(resolve(outputDir, 'future-nbf.jwt'), futureNbfToken);
writeFileSync(resolve(outputDir, 'invalid-format.jwt'), invalidFormatToken);

const divider = () => console.log('\n' + '='.repeat(72));

const logVerifyFailure = (label: string, callback: () => void): void => {
  divider();
  console.log(label);
  try {
    callback();
    console.log('Unexpected success');
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
  }
};

divider();
console.log('VALID TOKEN WITH CORRECT PUBLIC KEY');
console.dir(
  verify(validToken, publicKey, {
    algs: ['ES256'],
    iss: issuer,
    aud: audience,
  }),
  { depth: null },
);

logVerifyFailure('VALID TOKEN WITH WRONG PUBLIC KEY', () => {
  verify(validToken, roguePublicKey, {
    algs: ['ES256'],
    iss: issuer,
    aud: audience,
  });
});

logVerifyFailure('INVALID TOKEN FORMAT', () => {
  verify(invalidFormatToken, publicKey, {
    algs: ['ES256'],
    iss: issuer,
    aud: audience,
  });
});

logVerifyFailure('EXPIRED TOKEN WITHOUT ignoreExp', () => {
  verify(expiredToken, publicKey, {
    algs: ['ES256'],
    iss: issuer,
    aud: audience,
  });
});

divider();
console.log('EXPIRED TOKEN WITH ignoreExp');
console.dir(
  verify(expiredToken, publicKey, {
    algs: ['ES256'],
    iss: issuer,
    aud: audience,
    ignoreExp: true,
  }),
  { depth: null },
);

logVerifyFailure('FUTURE NBF TOKEN WITHOUT ignoreNbf', () => {
  verify(futureNbfToken, publicKey, {
    algs: ['ES256'],
    iss: issuer,
    aud: audience,
  });
});

divider();
console.log('FUTURE NBF TOKEN WITH ignoreNbf');
console.dir(
  verify(futureNbfToken, publicKey, {
    algs: ['ES256'],
    iss: issuer,
    aud: audience,
    ignoreNbf: true,
  }),
  { depth: null },
);

divider();
console.log(`Token Saved: ${outputDir}`);
