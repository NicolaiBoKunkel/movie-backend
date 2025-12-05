-- 09_user_account.sql
-- App-level users for login/auth (NOT PostgreSQL roles)

CREATE TABLE IF NOT EXISTS "UserAccount" (
  "user_id"       BIGSERIAL PRIMARY KEY,
  "username"      VARCHAR(100) UNIQUE NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role"          VARCHAR(20) NOT NULL CHECK ("role" IN ('admin','user')),
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index to speed up logins
CREATE INDEX IF NOT EXISTS idx_useraccount_username ON "UserAccount"("username");

-- Optional: a read-only view (handy for debugging):
CREATE OR REPLACE VIEW vw_users_safe AS
SELECT user_id, username, role, created_at
FROM "UserAccount";

-- Insert default admin user
-- Note: In production, use bcrypt to hash passwords (e.g., bcrypt.hash('admin123', 10))
-- This is a bcrypt hash of 'admin123' with salt rounds = 10
INSERT INTO "UserAccount" (username, password_hash, role)
VALUES ('admin', '$2b$10$cmGcK/l2q4RsiOxLTRidFuC8p2.pltq2PXbSptoge.kxTfYF4RYMC', 'admin')
ON CONFLICT (username) DO NOTHING;
