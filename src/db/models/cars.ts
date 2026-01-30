import { getDb } from "../connection";
import type { Database } from "bun:sqlite";

export interface Car {
  id: string;
  event_id: string;
  racer_id: string;
  car_number: string;
  name: string | null;
  class: string | null;
  weight_ok: number;
  inspected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCarInput {
  event_id: string;
  racer_id: string;
  car_number: string;
  name?: string;
  class?: string;
}

export interface UpdateCarInput {
  car_number?: string;
  name?: string;
  class?: string;
  weight_ok?: boolean;
  inspected_at?: string;
}

export class CarRepository {
  private db: Database;

  constructor() {
    this.db = getDb();
  }

  create(input: CreateCarInput): Car {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    this.db.run(
      `INSERT INTO cars (id, event_id, racer_id, car_number, name, class, weight_ok, inspected_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.event_id, input.racer_id, input.car_number, input.name ?? null, input.class ?? null, 0, null, now, now]
    );

    return {
      id,
      event_id: input.event_id,
      racer_id: input.racer_id,
      car_number: input.car_number,
      name: input.name ?? null,
      class: input.class ?? null,
      weight_ok: 0,
      inspected_at: null,
      created_at: now,
      updated_at: now
    };
  }

  findById(id: string): Car | null {
    const row = this.db.query(
      "SELECT * FROM cars WHERE id = ?"
    ).get(id) as Car | undefined;
    return row ?? null;
  }

  findByEvent(eventId: string): Car[] {
    return this.db.query(
      `SELECT c.*, r.first_name || ' ' || r.last_name as racer_name
       FROM cars c
       JOIN racers r ON c.racer_id = r.id
       WHERE c.event_id = ?
       ORDER BY CAST(c.car_number AS INTEGER)`
    ).all(eventId) as (Car & { racer_name: string })[];
  }

  findByRacer(racerId: string): Car[] {
    return this.db.query(
      "SELECT * FROM cars WHERE racer_id = ?"
    ).all(racerId) as Car[];
  }

  update(id: string, input: UpdateCarInput): Car | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const car_number = input.car_number ?? existing.car_number;
    const name = input.name ?? existing.name;
    const class_ = input.class ?? existing.class;
    const weight_ok = input.weight_ok !== undefined ? (input.weight_ok ? 1 : 0) : existing.weight_ok;
    const inspected_at = input.inspected_at ?? existing.inspected_at;
    
    this.db.run(
      `UPDATE cars SET
        car_number = ?,
        name = ?,
        class = ?,
        weight_ok = ?,
        inspected_at = ?,
        updated_at = ?
       WHERE id = ?`,
      [car_number, name, class_, weight_ok, inspected_at, now, id]
    );

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.run("DELETE FROM cars WHERE id = ?", [id]);
    return result.changes > 0;
  }

  inspect(id: string, weightOk: boolean): Car | null {
    return this.update(id, {
      weight_ok: weightOk,
      inspected_at: new Date().toISOString()
    });
  }
}
