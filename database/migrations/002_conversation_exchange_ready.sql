-- Run once on existing databases (Form 2: both students must mark ready before confirm-form2).
-- Use TINYINT without display width (avoids MySQL 8.0+ deprecation warning 1681).
ALTER TABLE Conversation
  ADD COLUMN Student1ExchangeReady TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN Student2ExchangeReady TINYINT NOT NULL DEFAULT 0;
