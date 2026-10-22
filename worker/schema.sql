-- Velandris Labs / Klavye Arenası
CREATE TABLE IF NOT EXISTS typing_sessions (
  session_id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  submitted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_typing_sessions_started_at ON typing_sessions(started_at);

-- Her takma ad için yalnızca en iyi tüm zamanlar ve haftalık sonuç tutulur.
CREATE TABLE IF NOT EXISTS typing_players (
  nickname_key TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  all_time_wpm INTEGER NOT NULL,
  all_time_accuracy REAL NOT NULL,
  all_time_correct_words INTEGER NOT NULL,
  all_time_completed_words INTEGER NOT NULL,
  all_time_submitted_at INTEGER NOT NULL,
  weekly_wpm INTEGER NOT NULL,
  weekly_accuracy REAL NOT NULL,
  weekly_correct_words INTEGER NOT NULL,
  weekly_completed_words INTEGER NOT NULL,
  week_start INTEGER NOT NULL,
  weekly_submitted_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_typing_players_all_time ON typing_players(all_time_wpm DESC, all_time_accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_typing_players_weekly ON typing_players(week_start, weekly_wpm DESC, weekly_accuracy DESC);
