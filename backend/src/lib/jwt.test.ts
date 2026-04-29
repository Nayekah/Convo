import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { describe, test } from 'node:test';

import { encodeBase64Url, encodeJsonBase64Url } from '../utils/base64url';
import { sign, type JwtAlgorithm, verify } from './jwt';

const keyPairs: Record<
  JwtAlgorithm,
  { privateKey: string; publicKey: string }
> = {
  ES256: createEcPemKeyPair('prime256v1'),
  ES384: createEcPemKeyPair('secp384r1'),
  ES512: createEcPemKeyPair('secp521r1'),
};

function createEcPemKeyPair(namedCurve: string): {
  privateKey: string;
  publicKey: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve });

  return {
    privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  };
}

const now = () => Math.floor(Date.now() / 1000);

const createToken = (
  alg: JwtAlgorithm = 'ES256',
  overrides: {
    claims?: Parameters<typeof sign>[0]['claims'];
    payload?: Parameters<typeof sign>[0]['payload'];
  } = {},
): string => {
  return sign({
    header: {
      alg,
      typ: 'JWT',
    },
    claims: {
      iss: 'convo-test',
      sub: 'user-1',
      aud: 'convo-client',
      iat: now(),
      exp: now() + 60,
      jti: 'token-1',
      ...overrides.claims,
    },
    payload: {
      email: 'alice@example.com',
      role: 'user',
      ...overrides.payload,
    },
    privateKey: keyPairs[alg].privateKey,
  });
};

const createCompactToken = (parts: {
  header: unknown;
  payload: unknown;
  signature?: string;
}): string => {
  return [
    encodeJsonBase64Url(parts.header),
    encodeJsonBase64Url(parts.payload),
    parts.signature ?? 'A'.repeat(86),
  ].join('.');
};

const replacePayloadWithoutResigning = (
  token: string,
  payload: unknown,
): string => {
  const [encodedHeader, , encodedSignature] = token.split('.');
  return `${encodedHeader}.${encodeJsonBase64Url(payload)}.${encodedSignature}`;
};

const replaceHeaderWithoutResigning = (
  token: string,
  header: unknown,
): string => {
  const [, encodedPayload, encodedSignature] = token.split('.');
  return `${encodeJsonBase64Url(header)}.${encodedPayload}.${encodedSignature}`;
};

describe('JWT sign', () => {
  test('signs ES256, ES384, and ES512 tokens that verify successfully', () => {
    for (const alg of ['ES256', 'ES384', 'ES512'] as const) {
      const token = createToken(alg);
      const decoded = verify(token, keyPairs[alg].publicKey, {
        algs: [alg],
        iss: 'convo-test',
        sub: 'user-1',
        aud: 'convo-client',
        jti: 'token-1',
      });

      assert.equal(token.split('.').length, 3);
      assert.equal(decoded.header.alg, alg);
      assert.equal(decoded.header.typ, 'JWT');
      assert.equal(decoded.payload.email, 'alice@example.com');
      assert.equal(decoded.payload.iss, 'convo-test');
    }
  });

  test('uses claims values when payload and claims contain the same key', () => {
    const token = sign({
      header: {
        alg: 'ES256',
        typ: 'JWT',
      },
      claims: {
        sub: 'claim-subject',
      },
      payload: {
        sub: 'payload-subject',
        email: 'alice@example.com',
      },
      privateKey: keyPairs.ES256.privateKey,
    });

    const decoded = verify(token, keyPairs.ES256.publicKey, {
      algs: ['ES256'],
    });

    assert.equal(decoded.payload.sub, 'claim-subject');
    assert.equal(decoded.payload.email, 'alice@example.com');
  });

  test('rejects a missing header', () => {
    assert.throws(
      () =>
        sign({
          header: undefined as never,
          payload: {},
          privateKey: keyPairs.ES256.privateKey,
        }),
      /JWT header is required/,
    );
  });

  test('rejects an unsupported algorithm', () => {
    assert.throws(
      () =>
        sign({
          header: {
            alg: 'HS256' as JwtAlgorithm,
            typ: 'JWT',
          },
          payload: {},
          privateKey: keyPairs.ES256.privateKey,
        }),
      /Unsupported JWT algorithm/,
    );
  });

  test('rejects an invalid JWT type', () => {
    assert.throws(
      () =>
        sign({
          header: {
            alg: 'ES256',
            typ: 'NOT_JWT' as 'JWT',
          },
          payload: {},
          privateKey: keyPairs.ES256.privateKey,
        }),
      /Invalid JWT type/,
    );
  });

  test('rejects unsupported header parameters', () => {
    assert.throws(
      () =>
        sign({
          header: {
            alg: 'ES256',
            typ: 'JWT',
            kid: 'key-1',
          } as never,
          payload: {},
          privateKey: keyPairs.ES256.privateKey,
        }),
      /Unsupported JWT header parameter/,
    );
  });

  test('rejects nested JWT content type', () => {
    assert.throws(
      () =>
        sign({
          header: {
            alg: 'ES256',
            typ: 'JWT',
            cty: 'JWT',
          },
          payload: {},
          privateKey: keyPairs.ES256.privateKey,
        }),
      /Nested JWT is not supported/,
    );
  });

  test('rejects a payload that cannot be serialized as JSON', () => {
    const circularPayload: Record<string, unknown> = {};
    circularPayload.self = circularPayload;

    assert.throws(
      () =>
        sign({
          header: {
            alg: 'ES256',
            typ: 'JWT',
          },
          payload: circularPayload,
          privateKey: keyPairs.ES256.privateKey,
        }),
      /Payload must be JSON serializable/,
    );
  });

  test('signs a minimal token when claims and payload are omitted', () => {
    const token = sign({
      header: {
        alg: 'ES256',
        typ: 'JWT',
      },
      privateKey: keyPairs.ES256.privateKey,
    });

    const decoded = verify(token, keyPairs.ES256.publicKey, {
      algs: ['ES256'],
    });

    assert.deepEqual(decoded.payload, {});
  });

  test('preserves JSON-compatible public and private claim value types', () => {
    const token = sign({
      header: {
        alg: 'ES256',
        typ: 'JWT',
      },
      payload: {
        stringValue: 'hello',
        numberValue: 42,
        booleanValue: true,
        nullValue: null,
        objectValue: { nested: 'value' },
        arrayValue: ['a', 1, false, null],
      },
      privateKey: keyPairs.ES256.privateKey,
    });

    const decoded = verify(token, keyPairs.ES256.publicKey, {
      algs: ['ES256'],
    });

    assert.deepEqual(decoded.payload, {
      stringValue: 'hello',
      numberValue: 42,
      booleanValue: true,
      nullValue: null,
      objectValue: { nested: 'value' },
      arrayValue: ['a', 1, false, null],
    });
  });

  test('rejects a non-object header value', () => {
    assert.throws(
      () =>
        sign({
          header: [] as never,
          payload: {},
          privateKey: keyPairs.ES256.privateKey,
        }),
      /JWT header is required/,
    );
  });

  test('rejects unsupported content types other than nested JWT', () => {
    assert.throws(
      () =>
        sign({
          header: {
            alg: 'ES256',
            typ: 'JWT',
            cty: 'text/plain',
          },
          payload: {},
          privateKey: keyPairs.ES256.privateKey,
        }),
      /Unsupported JWT content type/,
    );
  });

  test('rejects a private key that does not match the selected ECDSA curve', () => {
    assert.throws(
      () =>
        sign({
          header: {
            alg: 'ES512',
            typ: 'JWT',
          },
          payload: {},
          privateKey: keyPairs.ES256.privateKey,
        }),
      /Invalid ECDSA signature length/,
    );
  });
});

describe('JWT verify', () => {
  test('returns decoded header, payload, and signature for a valid token', () => {
    const token = createToken('ES256');
    const decoded = verify(token, keyPairs.ES256.publicKey, {
      algs: ['ES256'],
      iss: 'convo-test',
      aud: 'convo-client',
    });

    assert.equal(decoded.header.alg, 'ES256');
    assert.equal(decoded.payload.email, 'alice@example.com');
    assert.equal(typeof decoded.signature, 'string');
    assert.ok(decoded.signature.length > 0);
  });

  test('rejects non-string JWT input', () => {
    assert.throws(
      () => verify(undefined as never, keyPairs.ES256.publicKey),
      /JWT must be a string/,
    );
  });

  test('rejects invalid compact serialization format', () => {
    assert.throws(
      () => verify('header.payload', keyPairs.ES256.publicKey),
      /Invalid JWT format/,
    );
  });

  test('rejects invalid base64url or JSON header data', () => {
    assert.throws(
      () => verify('not valid.payload.signature', keyPairs.ES256.publicKey),
      /Invalid JWT header/,
    );
  });

  test('rejects payloads that are not JSON objects', () => {
    const token = `${encodeJsonBase64Url({
      alg: 'ES256',
      typ: 'JWT',
    })}.${encodeBase64Url(new TextEncoder().encode('[]'))}.signature`;

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey),
      /JWT payload must be a JSON object/,
    );
  });

  test('rejects disallowed algorithms', () => {
    const token = createToken('ES384');

    assert.throws(
      () => verify(token, keyPairs.ES384.publicKey, { algs: ['ES256'] }),
      /JWT algorithm is not allowed/,
    );
  });

  test('rejects tampered signatures', () => {
    const parts = createToken('ES256').split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.${'A'.repeat(86)}`;

    assert.throws(
      () =>
        verify(tamperedToken, keyPairs.ES256.publicKey, { algs: ['ES256'] }),
      /Invalid JWT signature/,
    );
  });

  test('rejects expired tokens unless ignoreExp is set', () => {
    const token = createToken('ES256', {
      claims: {
        exp: now() - 1,
      },
    });

    assert.throws(() => verify(token, keyPairs.ES256.publicKey), /JWT expired/);

    assert.doesNotThrow(() =>
      verify(token, keyPairs.ES256.publicKey, { ignoreExp: true }),
    );
  });

  test('rejects tokens before nbf unless ignoreNbf is set', () => {
    const token = createToken('ES256', {
      claims: {
        nbf: now() + 60,
      },
    });

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey),
      /JWT is not active yet/,
    );

    assert.doesNotThrow(() =>
      verify(token, keyPairs.ES256.publicKey, { ignoreNbf: true }),
    );
  });

  test('rejects registered claim type mismatches', () => {
    const token = createToken('ES256', {
      claims: {
        exp: 'tomorrow' as never,
      },
    });

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey),
      /JWT exp claim must be a NumericDate/,
    );
  });

  test('rejects option claim mismatches', () => {
    const token = createToken('ES256');

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { iss: 'wrong-issuer' }),
      /JWT issuer mismatch/,
    );

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { sub: 'wrong-subject' }),
      /JWT subject mismatch/,
    );

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { aud: 'wrong-audience' }),
      /JWT audience mismatch/,
    );

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { jti: 'wrong-jti' }),
      /JWT ID mismatch/,
    );
  });

  test('accepts matching verify options in every supported registered claim option', () => {
    const token = createToken('ES256');

    assert.doesNotThrow(() =>
      verify(token, keyPairs.ES256.publicKey, {
        algs: ['ES256'],
        iss: 'convo-test',
        sub: 'user-1',
        aud: 'convo-client',
        jti: 'token-1',
      }),
    );
  });

  test('accepts an audience array when the requested audience is present', () => {
    const token = createToken('ES256', {
      payload: {
        aud: ['other-client'],
      },
      claims: {
        aud: ['convo-client', 'mobile-client'] as never,
      },
    });

    const decoded = verify(token, keyPairs.ES256.publicKey, {
      aud: 'mobile-client',
    });

    assert.deepEqual(decoded.payload.aud, ['convo-client', 'mobile-client']);
  });

  test('rejects an audience array when the requested audience is absent', () => {
    const token = createToken('ES256', {
      claims: {
        aud: ['convo-client', 'mobile-client'] as never,
      },
    });

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { aud: 'admin-client' }),
      /JWT audience mismatch/,
    );
  });

  test('rejects empty compact serialization segments', () => {
    assert.throws(
      () => verify('..', keyPairs.ES256.publicKey),
      /Invalid JWT header/,
    );

    assert.throws(
      () =>
        verify(
          `${encodeJsonBase64Url({ alg: 'ES256', typ: 'JWT' })}..signature`,
          keyPairs.ES256.publicKey,
        ),
      /Invalid JWT payload/,
    );
  });

  test('rejects tokens with too many compact serialization segments', () => {
    assert.throws(
      () => verify('a.b.c.d', keyPairs.ES256.publicKey),
      /Invalid JWT format/,
    );
  });

  test('rejects base64url padding, whitespace, and non-base64url characters', () => {
    const header = encodeJsonBase64Url({ alg: 'ES256', typ: 'JWT' });
    const payload = encodeJsonBase64Url({});

    assert.throws(
      () => verify(`${header}=.${payload}.signature`, keyPairs.ES256.publicKey),
      /Invalid JWT header/,
    );

    assert.throws(
      () =>
        verify(`${header}.${payload}\n.signature`, keyPairs.ES256.publicKey),
      /Invalid JWT payload/,
    );

    assert.throws(
      () => verify(`${header}.${payload}.sig+`, keyPairs.ES256.publicKey),
      /Invalid JWT signature/,
    );
  });

  test('rejects a JOSE header that is not a JSON object', () => {
    const token = `${encodeBase64Url(new TextEncoder().encode('[]'))}.${encodeJsonBase64Url({})}.signature`;

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey),
      /JWT header must be a JSON object|JWT header is required/,
    );
  });

  test('rejects a JOSE header with unsupported parameters', () => {
    const token = createCompactToken({
      header: {
        alg: 'ES256',
        typ: 'JWT',
        kid: 'key-1',
      },
      payload: {},
    });

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey),
      /Unsupported JWT header parameter: kid/,
    );
  });

  test('rejects a JOSE header with unsupported or malformed alg and typ values', () => {
    assert.throws(
      () =>
        verify(
          createCompactToken({
            header: {
              alg: 'HS256',
              typ: 'JWT',
            },
            payload: {},
          }),
          keyPairs.ES256.publicKey,
        ),
      /Unsupported JWT algorithm/,
    );

    assert.throws(
      () =>
        verify(
          createCompactToken({
            header: {
              alg: ['ES256'],
              typ: 'JWT',
            },
            payload: {},
          }),
          keyPairs.ES256.publicKey,
        ),
      /Unsupported JWT algorithm/,
    );

    assert.throws(
      () =>
        verify(
          createCompactToken({
            header: {
              alg: 'ES256',
              typ: 'JWS',
            },
            payload: {},
          }),
          keyPairs.ES256.publicKey,
        ),
      /Invalid JWT type/,
    );
  });

  test('rejects nested JWT and unsupported content type headers during verification', () => {
    assert.throws(
      () =>
        verify(
          createCompactToken({
            header: {
              alg: 'ES256',
              typ: 'JWT',
              cty: 'JWT',
            },
            payload: {},
          }),
          keyPairs.ES256.publicKey,
        ),
      /Nested JWT is not supported/,
    );

    assert.throws(
      () =>
        verify(
          createCompactToken({
            header: {
              alg: 'ES256',
              typ: 'JWT',
              cty: 'text/plain',
            },
            payload: {},
          }),
          keyPairs.ES256.publicKey,
        ),
      /Unsupported JWT content type/,
    );
  });

  test('rejects payload data that is not valid JSON', () => {
    const token = `${encodeJsonBase64Url({
      alg: 'ES256',
      typ: 'JWT',
    })}.${encodeBase64Url(new TextEncoder().encode('{'))}.signature`;

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey),
      /Invalid JWT payload/,
    );
  });

  test('rejects payload data that is not valid UTF-8', () => {
    const token = `${encodeJsonBase64Url({
      alg: 'ES256',
      typ: 'JWT',
    })}.${encodeBase64Url(new Uint8Array([0xff, 0xfe]))}.signature`;

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey),
      /Invalid JWT payload/,
    );
  });

  test('rejects malformed signature encoding and signature lengths', () => {
    const token = createToken('ES256');
    const [encodedHeader, encodedPayload] = token.split('.');

    assert.throws(
      () =>
        verify(
          `${encodedHeader}.${encodedPayload}.A`,
          keyPairs.ES256.publicKey,
        ),
      /Invalid JWT signature/,
    );

    assert.throws(
      () =>
        verify(
          `${encodedHeader}.${encodedPayload}.AA`,
          keyPairs.ES256.publicKey,
        ),
      /Invalid JWT signature/,
    );
  });

  test('rejects a token verified with a different public key', () => {
    const wrongKeyPair = createEcPemKeyPair('prime256v1');
    const token = createToken('ES256');

    assert.throws(
      () => verify(token, wrongKeyPair.publicKey, { algs: ['ES256'] }),
      /Invalid JWT signature/,
    );
  });

  test('rejects payload tampering after signing', () => {
    const token = createToken('ES256');
    const tamperedToken = replacePayloadWithoutResigning(token, {
      email: 'mallory@example.com',
      iss: 'convo-test',
      sub: 'user-1',
      aud: 'convo-client',
      iat: now(),
      exp: now() + 60,
      jti: 'token-1',
    });

    assert.throws(
      () =>
        verify(tamperedToken, keyPairs.ES256.publicKey, { algs: ['ES256'] }),
      /Invalid JWT signature/,
    );
  });

  test('rejects header tampering after signing', () => {
    const token = createToken('ES256');
    const tamperedToken = replaceHeaderWithoutResigning(token, {
      alg: 'ES384',
      typ: 'JWT',
    });

    assert.throws(
      () =>
        verify(tamperedToken, keyPairs.ES256.publicKey, {
          algs: ['ES256', 'ES384'],
        }),
      /Invalid JWT signature/,
    );
  });

  test('rejects NumericDate claims with non-finite numbers', () => {
    for (const claim of ['exp', 'nbf', 'iat'] as const) {
      const token = createToken('ES256', {
        claims: {
          [claim]: Number.POSITIVE_INFINITY,
        } as never,
      });

      assert.throws(
        () => verify(token, keyPairs.ES256.publicKey),
        new RegExp(`JWT ${claim} claim must be a NumericDate`),
      );
    }
  });

  test('rejects string registered claims with non-string values', () => {
    for (const claim of ['iss', 'sub', 'jti'] as const) {
      const token = createToken('ES256', {
        claims: {
          [claim]: 123,
        } as never,
      });

      assert.throws(
        () => verify(token, keyPairs.ES256.publicKey),
        new RegExp(`JWT ${claim} claim must be a string`),
      );
    }
  });

  test('rejects malformed audience claim values', () => {
    for (const aud of [123, ['convo-client', 123], { value: 'convo-client' }]) {
      const token = createToken('ES256', {
        claims: {
          aud,
        } as never,
      });

      assert.throws(
        () => verify(token, keyPairs.ES256.publicKey),
        /JWT aud claim must be a string or string array/,
      );
    }
  });

  test('does not require registered claims unless matching options are specified', () => {
    const token = sign({
      header: {
        alg: 'ES256',
        typ: 'JWT',
      },
      payload: {
        email: 'alice@example.com',
      },
      privateKey: keyPairs.ES256.privateKey,
    });

    assert.doesNotThrow(() => verify(token, keyPairs.ES256.publicKey));

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { iss: 'convo-test' }),
      /JWT issuer mismatch/,
    );

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { aud: 'convo-client' }),
      /JWT audience mismatch/,
    );
  });

  test('validates nbf and exp independently when ignore flags are combined', () => {
    const token = createToken('ES256', {
      claims: {
        exp: now() - 1,
        nbf: now() + 60,
      },
    });

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { ignoreExp: true }),
      /JWT is not active yet/,
    );

    assert.throws(
      () => verify(token, keyPairs.ES256.publicKey, { ignoreNbf: true }),
      /JWT expired/,
    );

    assert.doesNotThrow(() =>
      verify(token, keyPairs.ES256.publicKey, {
        ignoreExp: true,
        ignoreNbf: true,
      }),
    );
  });
});
