import index from "./frontend/index.html";
import display from "./frontend/display.html";
import {
  getDb,
  EventRepository,
  RacerRepository,
  HeatRepository,
  ResultRepository,
  umzug,
} from "./db";

// Initialize database on startup
await umzug.up();
console.log("Database initialized");

// Repository instances
const eventsRepo = new EventRepository();
const racersRepo = new RacerRepository();
const heatsRepo = new HeatRepository();
const resultsRepo = new ResultRepository();

// Active heat state (for live race console)
type ActiveHeatState = {
  heatId: string | null;
  running: boolean;
  startTimeMs: number | null;
  elapsedMs: number;
};

const activeHeat: ActiveHeatState = {
  heatId: null,
  running: false,
  startTimeMs: null,
  elapsedMs: 0,
};

const jsonHeaders = {
  "Content-Type": "application/json",
};

const respondJson = (payload: unknown, status = 200) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
};

const getCurrentElapsedMs = () => {
  if (!activeHeat.running || activeHeat.startTimeMs === null) {
    return activeHeat.elapsedMs;
  }
  return Date.now() - activeHeat.startTimeMs;
};

Bun.serve({
  routes: {
    // Serve the main UI
    "/": index,
    "/register": index,
    "/heats": index,
    "/race": index,
    "/standings": index,
    "/display": display,

    // ===== EVENTS API =====
    "/api/events": {
      GET: () => {
        const events = eventsRepo.findAll();
        return respondJson(events);
      },
      POST: async (req) => {
        const body = (await req.json()) as {
          name: string;
          date: string;
          lane_count?: number;
        };
        if (!body.name || !body.date) {
          return respondJson({ error: "Name and date are required" }, 400);
        }
        const event = eventsRepo.create({
          name: body.name,
          date: body.date,
          lane_count: body.lane_count,
        });
        return respondJson(event, 201);
      },
    },

    "/api/events/:id": {
      GET: (req) => {
        const event = eventsRepo.findById(req.params.id);
        if (!event) return respondJson({ error: "Event not found" }, 404);
        return respondJson(event);
      },
      PATCH: async (req) => {
        const body = (await req.json()) as {
          name?: string;
          date?: string;
          lane_count?: number;
          status?: "draft" | "checkin" | "racing" | "complete";
        };
        const event = eventsRepo.update(req.params.id, body);
        if (!event) return respondJson({ error: "Event not found" }, 404);
        return respondJson(event);
      },
      DELETE: (req) => {
        const deleted = eventsRepo.delete(req.params.id);
        if (!deleted) return respondJson({ error: "Event not found" }, 404);
        return respondJson({ success: true });
      },
    },

    // ===== RACERS API (includes car info now) =====
    "/api/events/:eventId/racers": {
      GET: (req) => {
        const racers = racersRepo.findByEvent(req.params.eventId);
        return respondJson(racers);
      },
      POST: async (req) => {
        const body = (await req.json()) as {
          name: string;
          den?: string;
          car_number: string;
        };
        if (!body.name || !body.car_number) {
          return respondJson({ error: "Name and car number are required" }, 400);
        }
        const racer = racersRepo.create({
          event_id: req.params.eventId,
          name: body.name,
          den: body.den,
          car_number: body.car_number,
        });
        return respondJson(racer, 201);
      },
    },

    "/api/racers/:id": {
      GET: (req) => {
        const racer = racersRepo.findById(req.params.id);
        if (!racer) return respondJson({ error: "Racer not found" }, 404);
        return respondJson(racer);
      },
      PATCH: async (req) => {
        const body = (await req.json()) as {
          name?: string;
          den?: string;
          car_number?: string;
          weight_ok?: boolean;
        };
        const racer = racersRepo.update(req.params.id, body);
        if (!racer) return respondJson({ error: "Racer not found" }, 404);
        return respondJson(racer);
      },
      DELETE: (req) => {
        const deleted = racersRepo.delete(req.params.id);
        if (!deleted) return respondJson({ error: "Racer not found" }, 404);
        return respondJson({ success: true });
      },
    },

    "/api/racers/:id/inspect": {
      POST: async (req) => {
        const body = (await req.json()) as { weight_ok: boolean };
        const racer = racersRepo.inspect(req.params.id, body.weight_ok ?? false);
        if (!racer) return respondJson({ error: "Racer not found" }, 404);
        return respondJson(racer);
      },
    },

    // ===== HEATS API =====
    "/api/events/:eventId/heats": {
      GET: (req) => {
        const heats = heatsRepo.findByEventWithLanes(req.params.eventId);
        return respondJson(heats);
      },
      POST: async (req) => {
        const body = (await req.json()) as {
          round: number;
          heat_number: number;
          lanes: { lane_number: number; racer_id: string }[];
        };
        if (!body.lanes || body.lanes.length === 0) {
          return respondJson({ error: "Lanes are required" }, 400);
        }
        const heat = heatsRepo.create({
          event_id: req.params.eventId,
          round: body.round,
          heat_number: body.heat_number,
          lanes: body.lanes,
        });
        return respondJson(heat, 201);
      },
      DELETE: (req) => {
        // Delete all heats for event (for regeneration)
        heatsRepo.deleteByEvent(req.params.eventId);
        return respondJson({ success: true });
      },
    },

    "/api/heats/:id": {
      GET: (req) => {
        const heat = heatsRepo.findWithLanes(req.params.id);
        if (!heat) return respondJson({ error: "Heat not found" }, 404);
        return respondJson(heat);
      },
    },

    "/api/heats/:id/start": {
      POST: (req) => {
        const heat = heatsRepo.updateStatus(req.params.id, "running");
        if (!heat) return respondJson({ error: "Heat not found" }, 404);

        // Set as active heat
        activeHeat.heatId = req.params.id;
        activeHeat.running = true;
        activeHeat.startTimeMs = Date.now();
        activeHeat.elapsedMs = 0;

        return respondJson(heat);
      },
    },

    "/api/heats/:id/complete": {
      POST: (req) => {
        const heat = heatsRepo.updateStatus(req.params.id, "complete");
        if (!heat) return respondJson({ error: "Heat not found" }, 404);

        // Clear active heat if this was it
        if (activeHeat.heatId === req.params.id) {
          activeHeat.heatId = null;
          activeHeat.running = false;
          activeHeat.startTimeMs = null;
          activeHeat.elapsedMs = 0;
        }

        return respondJson(heat);
      },
    },

    // ===== HEAT GENERATION API =====
    "/api/events/:eventId/generate-heats": {
      POST: async (req) => {
        const body = (await req.json()) as {
          rounds?: number;
          lane_count?: number;
        };

        const event = eventsRepo.findById(req.params.eventId);
        if (!event) return respondJson({ error: "Event not found" }, 404);

        const racers = racersRepo.findInspectedByEvent(req.params.eventId);
        if (racers.length === 0) {
          return respondJson({ error: "No racers have passed inspection" }, 400);
        }

        // Delete existing heats
        heatsRepo.deleteByEvent(req.params.eventId);

        const laneCount = body.lane_count ?? event.lane_count;
        const rounds = body.rounds ?? 1;

        // Generate balanced lane rotation
        const heats = generateBalancedHeats(
          racers.map((r) => ({ id: r.id, car_number: r.car_number })),
          laneCount,
          rounds
        );

        // Save heats
        let heatNumber = 1;
        for (const heatRacers of heats) {
          heatsRepo.create({
            event_id: req.params.eventId,
            round: 1,
            heat_number: heatNumber++,
            lanes: heatRacers.map((racer, idx) => ({
              lane_number: idx + 1,
              racer_id: racer.id,
            })),
          });
        }

        // Update event status to racing
        eventsRepo.update(req.params.eventId, { status: "racing" });

        const createdHeats = heatsRepo.findByEventWithLanes(req.params.eventId);
        return respondJson(createdHeats);
      },
    },

    // ===== RESULTS API =====
    "/api/heats/:heatId/results": {
      GET: (req) => {
        const results = resultsRepo.findByHeat(req.params.heatId);
        return respondJson(results);
      },
      POST: async (req) => {
        const body = (await req.json()) as {
          results: {
            lane_number: number;
            racer_id: string;
            place: number;
            time_ms?: number;
            dnf?: boolean;
          }[];
        };

        if (!body.results || body.results.length === 0) {
          return respondJson({ error: "Results are required" }, 400);
        }

        const savedResults = resultsRepo.createBatch(
          body.results.map(r => ({ ...r, heat_id: req.params.heatId }))
        );

        // Complete the heat
        heatsRepo.updateStatus(req.params.heatId, "complete");

        return respondJson(savedResults);
      },
    },

    // ===== STANDINGS API =====
    "/api/events/:eventId/standings": {
      GET: (req) => {
        const standings = resultsRepo.getStandings(req.params.eventId);
        return respondJson(standings);
      },
    },

    // ===== LIVE RACE CONSOLE API =====
    "/api/race/active": {
      GET: () => {
        return respondJson({
          heatId: activeHeat.heatId,
          running: activeHeat.running,
          elapsedMs: getCurrentElapsedMs(),
        });
      },
    },

    "/api/race/stop": {
      POST: () => {
        activeHeat.elapsedMs = getCurrentElapsedMs();
        activeHeat.running = false;
        activeHeat.startTimeMs = null;

        return respondJson({
          heatId: activeHeat.heatId,
          running: activeHeat.running,
          elapsedMs: activeHeat.elapsedMs,
        });
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

// Heat generation algorithm - balanced lane rotation
// Ensures every car races in every lane exactly once when possible
function generateBalancedHeats(
  racers: { id: string; car_number: string }[],
  laneCount: number,
  rounds: number
): { id: string; car_number: string }[][] {
  const heats: { id: string; car_number: string }[][] = [];
  const totalRacers = racers.length;

  if (totalRacers === 0 || laneCount === 0) {
    return heats;
  }

  // Handle case where we have fewer racers than lanes
  if (totalRacers <= laneCount) {
    // Each racer needs to run in each lane
    // We need laneCount heats minimum (one per lane)
    // Each heat will have all racers, rotated through lanes
    const heatsNeeded = Math.max(laneCount, rounds);

    for (let heatIdx = 0; heatIdx < heatsNeeded; heatIdx++) {
      const heat: { id: string; car_number: string }[] = [];

      for (let lane = 0; lane < laneCount; lane++) {
        // Rotate which racer is in which lane
        const racerIndex = (heatIdx + lane) % totalRacers;
        const racer = racers[racerIndex];
        if (racer) {
          heat.push(racer);
        }
      }

      heats.push(heat);
    }
  } else {
    // More racers than lanes
    // We need to ensure each car races in each lane
    // This requires a more complex rotation algorithm

    // Calculate how many heats each car needs (one per lane)
    const heatsPerCar = Math.max(laneCount, rounds);

    // Total car-lane assignments needed
    const totalAssignments = totalRacers * heatsPerCar;

    // Each heat provides 'laneCount' assignments
    const totalHeats = Math.ceil(totalAssignments / laneCount);

    // Use a round-robin tournament scheduling approach
    // Create a grid where rows are heats and columns are lanes
    // Each car appears exactly once in each column (lane)

    // Initialize tracking: which lanes each car has used
    const carLaneCounts: Map<string, number[]> = new Map();
    for (const racer of racers) {
      carLaneCounts.set(racer.id, new Array(laneCount).fill(0));
    }

    // Generate heats
    for (let heatIdx = 0; heatIdx < totalHeats; heatIdx++) {
      const heat: ({ id: string; car_number: string } | null)[] = new Array(laneCount).fill(null);
      const usedCars = new Set<string>();

      // For each lane, find a car that:
      // 1. Hasn't been used in this heat
      // 2. Has the lowest count for this specific lane
      // 3. Has the lowest total lane count overall

      for (let lane = 0; lane < laneCount; lane++) {
        let bestCar: { id: string; car_number: string } | null = null;
        let bestScore = Infinity;

        for (const racer of racers) {
          if (usedCars.has(racer.id)) continue;

          const laneCounts = carLaneCounts.get(racer.id);
          if (!laneCounts) continue;
          const thisLaneCount = laneCounts[lane] ?? 0;
          const totalCount = laneCounts.reduce((a, b) => a + b, 0);

          // Score: prioritize cars that need this lane, then by total usage
          const score = thisLaneCount * 1000 + totalCount;

          if (score < bestScore) {
            bestScore = score;
            bestCar = racer;
          }
        }

        if (bestCar) {
          heat[lane] = bestCar;
          usedCars.add(bestCar.id);
          const counts = carLaneCounts.get(bestCar.id);
          if (counts) {
            counts[lane]++;
          }
        }
      }

      // Only add heat if all lanes are filled
      if (heat.every(car => car !== null)) {
        heats.push(heat as { id: string; car_number: string }[]);
      }
    }
  }

  return heats;
}

console.log("Derby Race Server running on http://localhost:3000");
