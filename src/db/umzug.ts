import { Umzug, SequelizeStorage } from "umzug";
import { getDb } from "./connection";

const db = getDb();

// Create Sequelize storage wrapper for bun:sqlite
const storage = {
  async executed(): Promise<string[]> {
    try {
      // Check if migrations table exists
      const tableExists = db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='SequelizeMeta'"
      ).get();
      
      if (!tableExists) {
        return [];
      }
      
      const rows = db.query("SELECT name FROM SequelizeMeta").all() as { name: string }[];
      return rows.map(row => row.name);
    } catch {
      return [];
    }
  },
  
  async logMigration({ name }: { name: string }): Promise<void> {
    db.run("INSERT INTO SequelizeMeta (name) VALUES (?)", [name]);
  },
  
  async unlogMigration({ name }: { name: string }): Promise<void> {
    db.run("DELETE FROM SequelizeMeta WHERE name = ?", [name]);
  }
};

// Create migrations table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS SequelizeMeta (
    name TEXT PRIMARY KEY
  )
`);

export const umzug = new Umzug({
  migrations: {
    glob: "src/db/migrations/*.ts",
    resolve: ({ name, path }) => {
      if (!path) throw new Error(`Migration path not found for ${name}`);
      const migration = require(path);
      return {
        name,
        up: async () => migration.up(),
        down: async () => migration.down?.()
      };
    }
  },
  storage: storage as any,
  logger: console
});

export type Migration = typeof umzug._types.migration;
