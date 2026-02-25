-- API Key Manager Database Schema
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS api_key_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE api_key_manager;

-- 1. Teams Table
CREATE TABLE IF NOT EXISTS teams_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  monthly_budget DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Team API Keys Table
-- allowed_features: chat, image_generation, image_vision, audio_transcription, audio_speech, embeddings
CREATE TABLE IF NOT EXISTS team_api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  status ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
  allowed_models JSON NOT NULL DEFAULT '["gpt-4.1"]',
  allowed_features JSON NOT NULL DEFAULT '["chat"]',
  monthly_limit_usd DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  FOREIGN KEY (team_id) REFERENCES teams_info(id) ON DELETE CASCADE,
  INDEX idx_key_prefix (key_prefix),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Users Table (사용자 정보 및 팀 연결)
CREATE TABLE IF NOT EXISTS users_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  team_id INT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams_info(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_team_id (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Key Reveal Requests Table (키 조회 요청)
CREATE TABLE IF NOT EXISTS key_reveal_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_key_id INT NOT NULL,
  requester_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'revealed') NOT NULL DEFAULT 'pending',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  revealed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES team_api_keys(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES users_info(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users_info(id) ON DELETE SET NULL,
  INDEX idx_api_key_id (api_key_id),
  INDEX idx_requester_id (requester_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Key Issue Requests Table (키 발급 신청)
CREATE TABLE IF NOT EXISTS key_issue_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  requester_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'issued') NOT NULL DEFAULT 'pending',
  allowed_feature VARCHAR(50) NOT NULL,
  allowed_models JSON NOT NULL,
  monthly_limit_usd DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  issued_api_key_id INT NULL,
  revealed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams_info(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES users_info(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users_info(id) ON DELETE SET NULL,
  FOREIGN KEY (issued_api_key_id) REFERENCES team_api_keys(id) ON DELETE SET NULL,
  INDEX idx_team_id (team_id),
  INDEX idx_requester_id (requester_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Usage Logs Table
-- feature_type: chat, image_generation, image_vision, audio_transcription, audio_speech, embeddings
CREATE TABLE IF NOT EXISTS usage_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  api_key_id INT NOT NULL,
  feature_type VARCHAR(30) NOT NULL DEFAULT 'chat',
  model VARCHAR(50) NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  image_count INT NOT NULL DEFAULT 0,
  audio_seconds INT NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0.000000,
  request_path VARCHAR(255),
  response_status INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams_info(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES team_api_keys(id) ON DELETE CASCADE,
  INDEX idx_team_created (team_id, created_at),
  INDEX idx_created_at (created_at),
  INDEX idx_feature_type (feature_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Monthly Usage Summary View (for quick budget checks)
CREATE OR REPLACE VIEW monthly_team_usage AS
SELECT 
  team_id,
  DATE_FORMAT(created_at, '%Y-%m') AS month,
  SUM(cost_usd) AS total_cost_usd,
  SUM(prompt_tokens) AS total_prompt_tokens,
  SUM(completion_tokens) AS total_completion_tokens,
  COUNT(*) AS request_count
FROM usage_logs
GROUP BY team_id, DATE_FORMAT(created_at, '%Y-%m');

-- Sample Data for Testing
INSERT INTO teams_info (name, monthly_budget) VALUES
  ('Engineering', 500.00),
  ('HR', 100.00),
  ('Marketing', 200.00),
  ('Data Science', 1000.00);




