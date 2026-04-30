CREATE DATABASE IF NOT EXISTS umkm_insight;
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
