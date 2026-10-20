-- ==================================================================
-- Novaframe Studio — MySQL 5.7+/8.0 schema (PHP edition of the API)
-- Mirrors server/db.ts (SQLite).
--
-- 1. Create an empty database (cPanel → MySQL Databases, or
--      CREATE DATABASE novaframe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;)
-- 2. Import this file INTO that database:
--      mysql -u <user> -p <database> < server/php/schema.sql
--    or phpMyAdmin → select the database → Import.
--
-- Content and settings are seeded automatically on the first request
-- from server/php/seed.json (regenerate with `npm run seed:php`).
-- All timestamps are stored in UTC.
-- ==================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admin_users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(160) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  salt          VARCHAR(64)  NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'owner',
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at DATETIME         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_email (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash   CHAR(64)     NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  ip_address   VARCHAR(64)      NULL,
  user_agent   VARCHAR(300)     NULL,
  expires_at   DATETIME     NOT NULL,
  last_seen_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_token (token_hash),
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES admin_users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS enquiries (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference       VARCHAR(16)  NOT NULL,
  name            VARCHAR(120) NOT NULL,
  company_name    VARCHAR(160)     NULL,
  email           VARCHAR(160) NOT NULL,
  phone           VARCHAR(40)      NULL,
  service         VARCHAR(100) NOT NULL,
  budget_range    VARCHAR(80)  NOT NULL,
  timeline        VARCHAR(120)     NULL,
  project_details TEXT         NOT NULL,
  status          ENUM('new','contacted','qualified','proposal','won','lost','archived') NOT NULL DEFAULT 'new',
  priority        ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  value_estimate  INT UNSIGNED     NULL,
  internal_notes  TEXT             NULL,
  source          VARCHAR(30)  NOT NULL DEFAULT 'website',
  ip_address      VARCHAR(64)      NULL,
  user_agent      VARCHAR(300)     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enquiries_reference (reference),
  KEY idx_enquiries_status (status),
  KEY idx_enquiries_created (created_at)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS enquiry_notes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  enquiry_id INT UNSIGNED NOT NULL,
  admin_id   INT UNSIGNED     NULL,
  admin_name VARCHAR(120)     NULL,
  kind       VARCHAR(20)  NOT NULL DEFAULT 'note',
  body       TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notes_enquiry (enquiry_id, created_at),
  CONSTRAINT fk_notes_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference      VARCHAR(16)  NOT NULL,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  phone          VARCHAR(40)      NULL,
  company_name   VARCHAR(160)     NULL,
  topic          VARCHAR(100) NOT NULL,
  budget_range   VARCHAR(80)      NULL,
  notes          TEXT             NULL,
  slot_date      CHAR(10)     NOT NULL,
  slot_time      VARCHAR(12)  NOT NULL,
  timezone       VARCHAR(60)  NOT NULL DEFAULT 'Asia/Kolkata',
  status         ENUM('scheduled','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
  meeting_link   VARCHAR(300)     NULL,
  internal_notes TEXT             NULL,
  enquiry_id     INT UNSIGNED     NULL,
  ip_address     VARCHAR(64)      NULL,
  user_agent     VARCHAR(300)     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- MySQL has no partial indexes: only active bookings get a non-NULL slot key.
  active_slot    VARCHAR(30) GENERATED ALWAYS AS (IF(status IN ('scheduled','confirmed'), CONCAT(slot_date, ' ', slot_time), NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_reference (reference),
  UNIQUE KEY uq_bookings_active_slot (active_slot),
  KEY idx_bookings_slot (slot_date, slot_time),
  CONSTRAINT fk_bookings_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS subscribers (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email      VARCHAR(160) NOT NULL,
  source     VARCHAR(40)      NULL DEFAULT 'footer',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscribers_email (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS events (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(40)  NOT NULL,
  path       VARCHAR(200)     NULL,
  session_id VARCHAR(64)      NULL,
  referrer   VARCHAR(300)     NULL,
  meta       TEXT             NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_name_time (name, created_at),
  KEY idx_events_time (created_at)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id    INT UNSIGNED     NULL,
  admin_email VARCHAR(160)     NULL,
  action      VARCHAR(40)  NOT NULL,
  target      VARCHAR(120)     NULL,
  details     VARCHAR(500)     NULL,
  ip_address  VARCHAR(64)      NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_time (created_at)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS content (
  collection VARCHAR(40)  NOT NULL,
  id         VARCHAR(80)  NOT NULL,
  data       LONGTEXT     NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  published  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collection, id),
  KEY idx_content_listing (collection, published, sort_order)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(40) NOT NULL,
  value       LONGTEXT    NOT NULL,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE = InnoDB;

-- Fixed-window rate limiting for public forms and sign-in (PHP has no shared memory).
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket   VARCHAR(190) NOT NULL,
  hits     INT UNSIGNED NOT NULL DEFAULT 0,
  reset_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (bucket)
) ENGINE = InnoDB;
