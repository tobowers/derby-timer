import { getDb } from "../connection";
import type { Database } from "bun:sqlite";

export interface Result {
  id: string;
  heat_id: string;
  lane_number: number;
  car_id: string;
  place: number | null;
  time_ms: number | null;
  dnf: number;
  created_at: string;
  updated_at: string;
}

export interface CreateResultInput {
  heat_id: string;
  lane_number: number;
  car_id: string;
  place?: number;
  time_ms?: number;
  dnf?: boolean;
}

export interface Standing {
  car_id: string;
  wins: number;
  losses: number;
  heats_run: number;
  avg_time_ms: number | null;
  last_updated: string;
}

export class ResultRepository {
  private db: Database;

  constructor() {
    this.db = getDb();
  }

  create(input: CreateResultInput): Result {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    this.db.run(
      `INSERT INTO results (id, heat_id, lane_number, car_id, place, time_ms, dnf, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.heat_id, input.lane_number, input.car_id, input.place ?? null, input.time_ms ?? null, input.dnf ? 1 : 0, now, now]
    );

    // Update standings
    this.recalculateStandingsForCar(input.car_id);

    return {
      id,
      heat_id: input.heat_id,
      lane_number: input.lane_number,
      car_id: input.car_id,
      place: input.place ?? null,
      time_ms: input.time_ms ?? null,
      dnf: input.dnf ? 1 : 0,
      created_at: now,
      updated_at: now
    };
  }

  createBatch(inputs: CreateResultInput[]): Result[] {
    return inputs.map(input => this.create(input));
  }

  findByHeat(heatId: string): Result[] {
    return this.db.query(
      `SELECT r.*, c.car_number, ra.first_name || ' ' || ra.last_name as racer_name
       FROM results r
       JOIN cars c ON r.car_id = c.id
       JOIN racers ra ON c.racer_id = ra.id
       WHERE r.heat_id = ?
       ORDER BY r.place IS NULL, r.place ASC, r.time_ms ASC`
    ).all(heatId) as (Result & { car_number: string; racer_name: string })[];
  }

  findByCar(carId: string): Result[] {
    return this.db.query(
      `SELECT r.*, h.round, h.heat_number
       FROM results r
       JOIN heats h ON r.heat_id = h.id
       WHERE r.car_id = ?
       ORDER BY h.round, h.heat_number`
    ).all(carId) as (Result & { round: number; heat_number: number })[];
  }

  update(id: string, input: Partial<CreateResultInput>): Result | null {
    const existing = this.db.query("SELECT * FROM results WHERE id = ?").get(id) as Result | undefined;
    if (!existing) return null;

    const now = new Date().toISOString();
    const place = input.place ?? existing.place;
    const time_ms = input.time_ms ?? existing.time_ms;
    const dnf = input.dnf !== undefined ? (input.dnf ? 1 : 0) : existing.dnf;
    
    this.db.run(
      `UPDATE results SET
        place = ?,
        time_ms = ?,
        dnf = ?,
        updated_at = ?
       WHERE id = ?`,
      [place, time_ms, dnf, now, id]
    );

    // Recalculate standings
    this.recalculateStandingsForCar(existing.car_id);

    return this.db.query("SELECT * FROM results WHERE id = ?").get(id) as Result;
  }

  deleteByHeat(heatId: string): void {
    const results = this.findByHeat(heatId);
    this.db.run("DELETE FROM results WHERE heat_id = ?", [heatId]);
    
    // Recalculate standings for affected cars
    const carIds = [...new Set(results.map(r => r.car_id))];
    for (const carId of carIds) {
      this.recalculateStandingsForCar(carId);
    }
  }

  getStandings(eventId: string): (Standing & { car_number: string; racer_name: string; class: string | null })[] {
    return this.db.query(
      `SELECT s.*, c.car_number, r.first_name || ' ' || r.last_name as racer_name, c.class
       FROM standings s
       JOIN cars c ON s.car_id = c.id
       JOIN racers r ON c.racer_id = r.id
       WHERE c.event_id = ?
       ORDER BY s.wins DESC, s.losses ASC, s.avg_time_ms ASC NULLS LAST`
    ).all(eventId) as (Standing & { car_number: string; racer_name: string; class: string | null })[];
  }

  getStandingsByClass(eventId: string, className: string): (Standing & { car_number: string; racer_name: string })[] {
    return this.db.query(
      `SELECT s.*, c.car_number, r.first_name || ' ' || r.last_name as racer_name
       FROM standings s
       JOIN cars c ON s.car_id = c.id
       JOIN racers r ON c.racer_id = r.id
       WHERE c.event_id = ? AND c.class = ?
       ORDER BY s.wins DESC, s.losses ASC, s.avg_time_ms ASC NULLS LAST`
    ).all(eventId, className) as (Standing & { car_number: string; racer_name: string })[];
  }

  private recalculateStandingsForCar(carId: string): void {
    const results = this.db.query(
      `SELECT r.*, h.round, h.heat_number
       FROM results r
       JOIN heats h ON r.heat_id = h.id
       WHERE r.car_id = ?`
    ).all(carId) as (Result & { round: number; heat_number: number })[];

    let wins = 0;
    let losses = 0;
    let heats_run = 0;
    let total_time_ms = 0;
    let time_count = 0;

    for (const result of results) {
      heats_run++;
      if (result.dnf) {
        losses++;
      } else if (result.place === 1) {
        wins++;
      } else {
        losses++;
      }
      if (result.time_ms) {
        total_time_ms += result.time_ms;
        time_count++;
      }
    }

    const avg_time_ms = time_count > 0 ? total_time_ms / time_count : null;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO standings (car_id, wins, losses, heats_run, avg_time_ms, last_updated)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(car_id) DO UPDATE SET
         wins = excluded.wins,
         losses = excluded.losses,
         heats_run = excluded.heats_run,
         avg_time_ms = excluded.avg_time_ms,
         last_updated = excluded.last_updated`,
      [carId, wins, losses, heats_run, avg_time_ms, now]
    );
  }
}
