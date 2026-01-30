import index from "../index.html";
import {
  getDb,
  EventRepository,
  RacerRepository,
  CarRepository,
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
const carsRepo = new CarRepository();
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
    "/display": index,

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

    // ===== RACERS API =====
    "/api/events/:eventId/racers": {
      GET: (req) => {
        const racers = racersRepo.findByEvent(req.params.eventId);
        return respondJson(racers);
      },
      POST: async (req) => {
        const body = (await req.json()) as {
          first_name: string;
          last_name: string;
          den?: string;
          rank?: string;
          contact?: string;
        };
        if (!body.first_name || !body.last_name) {
          return respondJson({ error: "First and last name are required" }, 400);
        }
        const racer = racersRepo.create({
          event_id: req.params.eventId,
          first_name: body.first_name,
          last_name: body.last_name,
          den: body.den,
          rank: body.rank,
          contact: body.contact,
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
          first_name?: string;
          last_name?: string;
          den?: string;
          rank?: string;
          contact?: string;
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

    // ===== CARS API =====
    "/api/events/:eventId/cars": {
      GET: (req) => {
        const cars = carsRepo.findByEvent(req.params.eventId);
        return respondJson(cars);
      },
      POST: async (req) => {
        const body = (await req.json()) as {
          racer_id: string;
          car_number: string;
          name?: string;
          class?: string;
        };
        if (!body.racer_id || !body.car_number) {
          return respondJson(
            { error: "Racer ID and car number are required" },
            400
          );
        }
        const car = carsRepo.create({
          event_id: req.params.eventId,
          racer_id: body.racer_id,
          car_number: body.car_number,
          name: body.name,
          class: body.class,
        });
        return respondJson(car, 201);
      },
    },

    "/api/cars/:id": {
      GET: (req) => {
        const car = carsRepo.findById(req.params.id);
        if (!car) return respondJson({ error: "Car not found" }, 404);
        return respondJson(car);
      },
      PATCH: async (req) => {
        const body = (await req.json()) as {
          car_number?: string;
          name?: string;
          class?: string;
          weight_ok?: boolean;
        };
        const car = carsRepo.update(req.params.id, body);
        if (!car) return respondJson({ error: "Car not found" }, 404);
        return respondJson(car);
      },
      DELETE: (req) => {
        const deleted = carsRepo.delete(req.params.id);
        if (!deleted) return respondJson({ error: "Car not found" }, 404);
        return respondJson({ success: true });
      },
    },

    "/api/cars/:id/inspect": {
      POST: async (req) => {
        const body = (await req.json()) as { weight_ok: boolean };
        const car = carsRepo.inspect(req.params.id, body.weight_ok ?? false);
        if (!car) return respondJson({ error: "Car not found" }, 404);
        return respondJson(car);
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
          lanes: { lane_number: number; car_id: string }[];
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

        const cars = carsRepo.findByEvent(req.params.eventId);
        if (cars.length === 0) {
          return respondJson({ error: "No cars registered" }, 400);
        }

        // Delete existing heats
        heatsRepo.deleteByEvent(req.params.eventId);

        const laneCount = body.lane_count ?? event.lane_count;
        const rounds = body.rounds ?? 1;

        // Generate balanced lane rotation
        const heats = generateBalancedHeats(
          cars.map((c) => ({ id: c.id, car_number: c.car_number })),
          laneCount,
          rounds
        );

        // Save heats
        let heatNumber = 1;
        for (const heatCars of heats) {
          heatsRepo.create({
            event_id: req.params.eventId,
            round: 1,
            heat_number: heatNumber++,
            lanes: heatCars.map((car, idx) => ({
              lane_number: idx + 1,
              car_id: car.id,
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
            car_id: string;
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

    "/api/events/:eventId/standings/:className": {
      GET: (req) => {
        const standings = resultsRepo.getStandingsByClass(
          req.params.eventId,
          req.params.className
        );
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
function generateBalancedHeats(
  cars: { id: string; car_number: string }[],
  laneCount: number,
  rounds: number
): { id: string; car_number: string }[][] {
  const heats: { id: string; car_number: string }[][] = [];
  const totalCars = cars.length;

  // If we have fewer cars than lanes, we need to run multiple rounds
  // to ensure each car runs in each lane
  if (totalCars <= laneCount) {
    for (let round = 0; round < rounds; round++) {
      // Rotate starting position for each round
      const rotation = round % totalCars;
      const heat: { id: string; car_number: string }[] = [];

      for (let lane = 0; lane < laneCount; lane++) {
        const carIndex = (rotation + lane) % totalCars;
        const car = cars[carIndex];
        if (car) heat.push(car);
      }

      heats.push(heat);
    }
  } else {
    // More cars than lanes - use round-robin rotation
    // Each car runs 'rounds' times, with lane assignments rotating

    // Calculate how many heats we need
    const heatsPerRound = Math.ceil(totalCars / laneCount);

    for (let round = 0; round < rounds; round++) {
      // Create a shuffled list for this round (rotate by round offset)
      const rotatedCars = [...cars];
      for (let i = 0; i < round && rotatedCars.length > 0; i++) {
        const car = rotatedCars.shift();
        if (car) rotatedCars.push(car);
      }

      for (let heatIdx = 0; heatIdx < heatsPerRound; heatIdx++) {
        const heat: { id: string; car_number: string }[] = [];
        const startIdx = heatIdx * laneCount;

        for (let lane = 0; lane < laneCount; lane++) {
          const carIdx = (startIdx + lane) % totalCars;
          const car = rotatedCars[carIdx];
          if (car) heat.push(car);
        }

        heats.push(heat);
      }
    }
  }

  return heats;
}

console.log("Derby Race Server running on http://localhost:3000");
