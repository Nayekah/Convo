export type AuthUser = {
  id: string;
  email: string;
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  privateKeySalt: string;
  privateKeyKdfIterations: number;
  privateKeyDeriveAlgorithm: string;
  privateKeyCipher: string;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser;
};

export type SignUpPayload = {
  email: string;
  password: string;
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  privateKeySalt: string;
  privateKeyKdfIterations: number;
  privateKeyDeriveAlgorithm: string;
  privateKeyCipher: string;
};

export type SignInPayload = {
  email: string;
  password: string;
};
