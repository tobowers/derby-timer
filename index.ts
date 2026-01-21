import index from "./index.html";

type Result = {
  id: string;
  carNumber: string;
  lane: string | null;
  timeMs: number;
  recordedAt: string;
};

type DerbyState = {
  running: boolean;
  startTimeMs: number | null;
  elapsedMs: number;
  results: Result[];
};

const state: DerbyState = {
  running: false,
  startTimeMs: null,
  elapsedMs: 0,
  results: [],
};

const jsonHeaders = {
  "Content-Type": "application/json",
};

const currentElapsedMs = () => {
  if (!state.running || state.startTimeMs === null) {
    return state.elapsedMs;
  }

  return Date.now() - state.startTimeMs;
};

const respondJson = (payload: unknown, status = 200) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
};

Bun.serve({
  routes: {
    "/": index,
    "/api/state": {
      GET: () => {
        return respondJson({
          running: state.running,
          elapsedMs: currentElapsedMs(),
          results: state.results,
        });
      },
    },
    "/api/race/start": {
      POST: () => {
        state.running = true;
        state.startTimeMs = Date.now();
        state.elapsedMs = 0;
        state.results = [];

        return respondJson({
          running: state.running,
          elapsedMs: state.elapsedMs,
          results: state.results,
        });
      },
    },
    "/api/race/stop": {
      POST: () => {
        state.elapsedMs = currentElapsedMs();
        state.running = false;
        state.startTimeMs = null;

        return respondJson({
          running: state.running,
          elapsedMs: state.elapsedMs,
          results: state.results,
        });
      },
    },
    "/api/results": {
      POST: async (req) => {
        if (!state.running) {
          return respondJson(
            { error: "Heat is not running." },
            400,
          );
        }

        const body = (await req.json()) as {
          carNumber?: string;
          lane?: string;
        };

        const carNumber = body.carNumber?.trim();
        if (!carNumber) {
          return respondJson({ error: "Car number is required." }, 400);
        }

        const result: Result = {
          id: crypto.randomUUID(),
          carNumber,
          lane: body.lane?.trim() || null,
          timeMs: currentElapsedMs(),
          recordedAt: new Date().toISOString(),
        };

        state.results.push(result);

        return respondJson({
          running: state.running,
          elapsedMs: currentElapsedMs(),
          results: state.results,
        });
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});
