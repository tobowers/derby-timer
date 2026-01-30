import { Database } from "bun:sqlite";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database("derby.db");
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
