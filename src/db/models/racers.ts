import { getDb } from "../connection";
import type { Database } from "bun:sqlite";

export interface Racer {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  den: string | null;
  rank: string | null;
  contact: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRacerInput {
  event_id: string;
  first_name: string;
  last_name: string;
  den?: string;
  rank?: string;
  contact?: string;
}

export interface UpdateRacerInput {
  first_name?: string;
  last_name?: string;
  den?: string;
  rank?: string;
  contact?: string;
}

export class RacerRepository {
  private db: Database;

  constructor() {
    this.db = getDb();
  }

  create(input: CreateRacerInput): Racer {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    this.db.run(
      `INSERT INTO racers (id, event_id, first_name, last_name, den, rank, contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.event_id, input.first_name, input.last_name, input.den ?? null, input.rank ?? null, input.contact ?? null, now, now]
    );

    return {
      id,
      event_id: input.event_id,
      first_name: input.first_name,
      last_name: input.last_name,
      den: input.den ?? null,
      rank: input.rank ?? null,
      contact: input.contact ?? null,
      created_at: now,
      updated_at: now
    };
  }

  findById(id: string): Racer | null {
    const row = this.db.query(
      "SELECT * FROM racers WHERE id = ?"
    ).get(id) as Racer | undefined;
    return row ?? null;
  }

  findByEvent(eventId: string): Racer[] {
    return this.db.query(
      "SELECT * FROM racers WHERE event_id = ? ORDER BY last_name, first_name"
    ).all(eventId) as Racer[];
  }

  update(id: string, input: UpdateRacerInput): Racer | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const first_name = input.first_name ?? existing.first_name;
    const last_name = input.last_name ?? existing.last_name;
    const den = input.den ?? existing.den;
    const rank = input.rank ?? existing.rank;
    const contact = input.contact ?? existing.contact;
    
    this.db.run(
      `UPDATE racers SET
        first_name = ?,
        last_name = ?,
        den = ?,
        rank = ?,
        contact = ?,
        updated_at = ?
       WHERE id = ?`,
      [first_name, last_name, den, rank, contact, now, id]
    );

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.run("DELETE FROM racers WHERE id = ?", [id]);
    return result.changes > 0;
  }
}
