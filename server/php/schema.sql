-- ==================================================================
-- Novaframe Studio — MySQL schema
-- Import with:  mysql -u <user> -p novaframe < server/php/schema.sql
-- Companion to server/php/api.php (PHP 8 + PDO + MySQL backend)
-- ==================================================================

CREATE DATABASE IF NOT EXISTS novaframe
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE novaframe;

-- ------------------------------------------------------------------
-- Service catalogue
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id         VARCHAR(40)  NOT NULL,
  title      VARCHAR(120) NOT NULL,
  category   VARCHAR(60)  NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB;

INSERT IGNORE INTO services (id, title, category) VALUES
  ('web',    'Web Development',  'Engineering'),
  ('app',    'App Development',  'Engineering'),
  ('design', 'UI/UX Design',     'Design'),
  ('seo',    'SEO & Growth',     'Growth'),
  ('video',  'Video & Motion',   'Creative');

-- ------------------------------------------------------------------
-- Project enquiries (main lead pipeline)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enquiries (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference       VARCHAR(16)  NOT NULL,
  name            VARCHAR(120) NOT NULL,
  company_name    VARCHAR(160)     NULL,
  email           VARCHAR(160) NOT NULL,
  phone           VARCHAR(40)      NULL,
  service         VARCHAR(80)  NOT NULL,
  budget_range    VARCHAR(80)  NOT NULL,
  timeline        VARCHAR(80)      NULL,
  project_details TEXT         NOT NULL,
  status          ENUM('new','contacted','qualified','proposal','won','archived')
                  NOT NULL DEFAULT 'new',
  source          VARCHAR(60)  NOT NULL DEFAULT 'website',
  ip_address      VARBINARY(16)    NULL,
  user_agent      VARCHAR(400)     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enquiries_reference (reference),
  KEY idx_enquiries_status  (status),
  KEY idx_enquiries_created (created_at),
  KEY idx_enquiries_email   (email)
) ENGINE = InnoDB;

-- ------------------------------------------------------------------
-- Newsletter subscribers
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscribers (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email      VARCHAR(160) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscribers_email (email)
) ENGINE = InnoDB;

-- ------------------------------------------------------------------
-- First-party analytics events
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_events (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_name VARCHAR(60)  NOT NULL,
  path       VARCHAR(200)     NULL,
  meta       JSON             NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_name   (event_name),
  KEY idx_events_created (created_at)
) ENGINE = InnoDB;

-- ------------------------------------------------------------------
-- Optional: monthly reporting view used by the admin dashboard
-- ------------------------------------------------------------------
CREATE OR REPLACE VIEW v_monthly_leads AS
SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
       COUNT(*)                          AS leads,
       SUM(status = 'won')               AS won
FROM enquiries
GROUP BY month
ORDER BY month DESC;
