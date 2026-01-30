import { getDb } from "../connection";

const db = getDb();

export function up(): void {
  // Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      lane_count INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'checkin', 'racing', 'complete')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Racers table with car info merged in (no separate cars table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS racers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      den TEXT,
      car_number TEXT NOT NULL,
      weight_ok INTEGER NOT NULL DEFAULT 0,
      inspected_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(event_id, car_number)
    )
  `);

  // Heats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS heats (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      round INTEGER NOT NULL,
      heat_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete')),
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(event_id, round, heat_number)
    )
  `);

  // Heat lanes table (which racer is in which lane for each heat)
  db.exec(`
    CREATE TABLE IF NOT EXISTS heat_lanes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      heat_id TEXT NOT NULL REFERENCES heats(id) ON DELETE CASCADE,
      lane_number INTEGER NOT NULL,
      racer_id TEXT NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(heat_id, lane_number),
      UNIQUE(heat_id, racer_id)
    )
  `);

  // Results table
  db.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      heat_id TEXT NOT NULL REFERENCES heats(id) ON DELETE CASCADE,
      lane_number INTEGER NOT NULL,
      racer_id TEXT NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
      place INTEGER,
      time_ms INTEGER,
      dnf INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(heat_id, lane_number),
      UNIQUE(heat_id, racer_id)
    )
  `);

  // Standings table (materialized view for performance)
  db.exec(`
    CREATE TABLE IF NOT EXISTS standings (
      racer_id TEXT PRIMARY KEY REFERENCES racers(id) ON DELETE CASCADE,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      heats_run INTEGER NOT NULL DEFAULT 0,
      avg_time_ms REAL,
      last_updated TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Indexes for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_racers_event ON racers(event_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_heats_event ON heats(event_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_heat_lanes_heat ON heat_lanes(heat_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_results_heat ON results(heat_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_results_racer ON results(racer_id)`);
}

export function down(): void {
  db.exec(`DROP TABLE IF EXISTS standings`);
  db.exec(`DROP TABLE IF EXISTS results`);
  db.exec(`DROP TABLE IF EXISTS heat_lanes`);
  db.exec(`DROP TABLE IF EXISTS heats`);
  db.exec(`DROP TABLE IF EXISTS racers`);
  db.exec(`DROP TABLE IF EXISTS events`);
}
