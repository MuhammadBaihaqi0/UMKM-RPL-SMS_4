DROP DATABASE IF EXISTS umkm_insight;
CREATE DATABASE umkm_insight;
USE umkm_insight;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  nama_umkm VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','user','operator') NOT NULL DEFAULT 'user',
  umkm_id VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_umkm_id (umkm_id)
);

-- =============================================
-- Kategori Usaha (Revisi Dosen)
-- =============================================
CREATE TABLE IF NOT EXISTS kategori_usaha (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_kategori VARCHAR(100) NOT NULL UNIQUE,
  deskripsi TEXT NULL,
  icon VARCHAR(10) NULL DEFAULT '🏪',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default categories
INSERT IGNORE INTO kategori_usaha (id, nama_kategori, deskripsi, icon) VALUES
  (1, 'Kuliner', 'Usaha makanan, minuman, catering, dan restoran', '🍽️'),
  (2, 'Fashion', 'Pakaian, aksesoris, dan produk fashion', '👗'),
  (3, 'Elektronik', 'Perangkat elektronik, gadget, dan aksesoris', '📱'),
  (4, 'Jasa', 'Layanan profesional, konsultasi, dan jasa lainnya', '🔧'),
  (5, 'Pertanian', 'Produk pertanian, perkebunan, dan peternakan', '🌾'),
  (6, 'Kerajinan', 'Produk handmade, seni, dan kerajinan tangan', '🎨'),
  (7, 'Kesehatan', 'Produk kesehatan, herbal, dan kecantikan', '💊'),
  (8, 'Pendidikan', 'Kursus, bimbel, dan layanan pendidikan', '📚'),
  (9, 'Teknologi', 'Software, aplikasi, dan layanan IT', '💻'),
  (10, 'Lainnya', 'Kategori usaha lainnya', '📦');

-- =============================================
-- Profil UMKM (Auto-insert saat register + NPWP)
-- =============================================
CREATE TABLE IF NOT EXISTS umkm_profiles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  kategori_id INT NULL,
  npwp VARCHAR(50) NULL,
  alamat TEXT NULL,
  no_telp VARCHAR(20) NULL,
  deskripsi_usaha TEXT NULL,
  business_health_score INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_umkm_profiles_user_id (user_id),
  INDEX idx_umkm_profiles_kategori (kategori_id),
  CONSTRAINT fk_umkm_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_umkm_profiles_kategori FOREIGN KEY (kategori_id) REFERENCES kategori_usaha(id) ON DELETE SET NULL
);

-- =============================================
-- Subscriptions
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  package_name ENUM('free','basic','pro','enterprise') NOT NULL DEFAULT 'free',
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  amount_paid INT NOT NULL DEFAULT 0,
  biaya INT NOT NULL DEFAULT 0,
  duration ENUM('mingguan','bulanan','tahunan') NULL,
  periode ENUM('mingguan','bulanan','tahunan') NULL,
  start_date DATETIME NULL,
  started_at DATETIME NULL,
  expired_date DATETIME NULL,
  expired_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_package (package_name),
  INDEX idx_subscriptions_status (status),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Payment Logs
-- =============================================
CREATE TABLE IF NOT EXISTS payment_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  amount INT NOT NULL,
  package_name ENUM('free','basic','pro','enterprise') NULL,
  duration ENUM('mingguan','bulanan','tahunan') NULL,
  status ENUM('success','failed','pending') NOT NULL DEFAULT 'success',
  description TEXT NULL,
  smartbank_ref VARCHAR(100) NULL,
  gateway_provider VARCHAR(50) NOT NULL DEFAULT 'SmartBank',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_logs_user_id (user_id),
  INDEX idx_payment_logs_status (status),
  CONSTRAINT fk_payment_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Activity Logs (Audit Trail)
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  detail TEXT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_logs_user_id (user_id),
  INDEX idx_activity_logs_created_at (created_at),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- SmartBank Reports
-- =============================================
CREATE TABLE IF NOT EXISTS smartbank_reports (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  umkm_id VARCHAR(50) NULL,
  report_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail TEXT NULL,
  metric_snapshot JSON NULL,
  smartbank_ref VARCHAR(100) NULL,
  status ENUM('queued','sent','acknowledged') NOT NULL DEFAULT 'sent',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_smartbank_reports_user_id (user_id),
  CONSTRAINT fk_smartbank_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Tickets (Customer Service System)
-- =============================================
CREATE TABLE IF NOT EXISTS tickets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  operator_id CHAR(36) NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  kategori ENUM('umum','teknis','pembayaran','akun','lainnya') NOT NULL DEFAULT 'umum',
  prioritas ENUM('rendah','sedang','tinggi') NOT NULL DEFAULT 'sedang',
  status ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tickets_user_id (user_id),
  INDEX idx_tickets_operator_id (operator_id),
  INDEX idx_tickets_status (status),
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tickets_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- Ticket Replies (Percakapan dalam tiket)
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_replies (
  id CHAR(36) PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_replies_ticket_id (ticket_id),
  CONSTRAINT fk_ticket_replies_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_replies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Notifications (WhatsApp Simulation)
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','warning','success','wa_simulation') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  reference_type VARCHAR(50) NULL,
  reference_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_is_read (is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
