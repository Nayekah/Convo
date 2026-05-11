CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT NOT NULL,
  "user_a_id" TEXT NOT NULL,
  "user_b_id" TEXT NOT NULL,
  "hkdf_salt" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversations_usera_userb_unique"
  ON "conversations"("user_a_id", "user_b_id");

CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "receiver_id" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "mac" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL,
  "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "messages_conversation_sent_at_idx"
  ON "messages"("conversation_id", "sent_at");
