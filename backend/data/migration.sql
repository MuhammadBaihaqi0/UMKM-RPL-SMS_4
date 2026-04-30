  -- ============================================
  -- UMKM Insight — Supabase Migration
  -- Jalankan SQL ini di Supabase SQL Editor
  -- ============================================

  -- 1. Tabel Users (Data internal UMKM Insight, BUKAN data SmartBank)
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_umkm TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    umkm_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 2. Tabel Subscriptions (Status langganan user)
  CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'premium')),
    biaya INTEGER DEFAULT 0,
    periode TEXT DEFAULT 'mingguan',
    started_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
  );

  -- 3. Tabel Payment Logs (Catatan pembayaran via SmartBank — READ LOG ONLY)
  CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    description TEXT,
    smartbank_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 4. Tabel Activity Logs (Log aktivitas user untuk admin monitoring)
  CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 5. Enable Row Level Security (opsional tapi recommended)
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

  -- 6. Policy: Allow all operations via service role key
  CREATE POLICY "Allow all for service role" ON users FOR ALL USING (true);
  CREATE POLICY "Allow all for service role" ON subscriptions FOR ALL USING (true);
  CREATE POLICY "Allow all for service role" ON payment_logs FOR ALL USING (true);
  CREATE POLICY "Allow all for service role" ON activity_logs FOR ALL USING (true);

  -- 7. Indexes
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
