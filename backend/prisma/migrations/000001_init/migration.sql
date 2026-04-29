CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "password_salt" TEXT NOT NULL,
  "public_key" TEXT NOT NULL,
  "encrypted_private_key" TEXT NOT NULL,
  "private_key_iv" TEXT NOT NULL,
  "private_key_salt" TEXT NOT NULL,
  "private_key_kdf_iterations" INTEGER NOT NULL,
  "private_key_derive_algorithm" TEXT NOT NULL,
  "private_key_cipher" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users"("email");
