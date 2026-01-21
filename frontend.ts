type Result = {
  id: string;
  carNumber: string;
  lane: string | null;
  timeMs: number;
  recordedAt: string;
};

type DerbyState = {
  running: boolean;
  elapsedMs: number;
  results: Result[];
};

const timerDisplay = document.querySelector<HTMLDivElement>("#timerDisplay");
const timerStatus = document.querySelector<HTMLDivElement>("#timerStatus");
const startBtn = document.querySelector<HTMLButtonElement>("#startBtn");
const stopBtn = document.querySelector<HTMLButtonElement>("#stopBtn");
const recordForm = document.querySelector<HTMLFormElement>("#recordForm");
const recordBtn = document.querySelector<HTMLButtonElement>("#recordBtn");
const carNumberInput = document.querySelector<HTMLInputElement>("#carNumber");
const laneSelect = document.querySelector<HTMLSelectElement>("#lane");
const formMessage = document.querySelector<HTMLParagraphElement>("#formMessage");
const resultsList = document.querySelector<HTMLOListElement>("#resultsList");
const emptyState = document.querySelector<HTMLDivElement>("#emptyState");

if (
  !timerDisplay ||
  !timerStatus ||
  !startBtn ||
  !stopBtn ||
  !recordForm ||
  !recordBtn ||
  !carNumberInput ||
  !laneSelect ||
  !formMessage ||
  !resultsList ||
  !emptyState
) {
  throw new Error("Missing required UI elements.");
}

let state: DerbyState = {
  running: false,
  elapsedMs: 0,
  results: [],
};

let baseElapsedMs = 0;
let lastSync = performance.now();

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor(ms / 1000) % 60;
  const millis = Math.floor(ms % 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
    .toString()
    .padStart(3, "0")}`;
};

const setMessage = (message = "") => {
  formMessage.textContent = message;
  formMessage.dataset.visible = message ? "true" : "false";
};

const updateControls = () => {
  startBtn.disabled = state.running;
  stopBtn.disabled = !state.running;
  recordBtn.disabled = !state.running;
  carNumberInput.disabled = !state.running;
  laneSelect.disabled = !state.running;
  timerStatus.textContent = state.running ? "Heat running" : "Ready";
};

const renderResults = () => {
  resultsList.innerHTML = "";

  if (!state.results.length) {
    emptyState.dataset.visible = "true";
    return;
  }

  emptyState.dataset.visible = "false";

  state.results.forEach((result, index) => {
    const item = document.createElement("li");
    item.className = "result-item";

    const place = document.createElement("span");
    place.className = "result-place";
    place.textContent = `${index + 1}`;

    const meta = document.createElement("div");
    meta.className = "result-meta";

    const car = document.createElement("strong");
    car.textContent = `Car ${result.carNumber}`;

    const lane = document.createElement("span");
    lane.textContent = result.lane ? `Lane ${result.lane}` : "Lane auto";

    meta.append(car, lane);

    const time = document.createElement("span");
    time.className = "result-time";
    time.textContent = formatTime(result.timeMs);

    item.append(place, meta, time);
    resultsList.append(item);
  });
};

const applyState = (next: DerbyState) => {
  state = next;
  baseElapsedMs = next.elapsedMs;
  lastSync = performance.now();
  updateControls();
  renderResults();
};

const syncState = async () => {
  try {
    const response = await fetch("/api/state");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as DerbyState;
    applyState(data);
  } catch {
    setMessage("Unable to reach the server.");
  }
};

const tick = () => {
  const now = performance.now();
  const elapsed = state.running ? baseElapsedMs + (now - lastSync) : baseElapsedMs;
  timerDisplay.textContent = formatTime(elapsed);
  requestAnimationFrame(tick);
};

startBtn.addEventListener("click", async () => {
  setMessage("");
  const response = await fetch("/api/race/start", { method: "POST" });
  if (!response.ok) {
    setMessage("Unable to start the heat.");
    return;
  }
  const data = (await response.json()) as DerbyState;
  applyState(data);
  carNumberInput.focus();
});

stopBtn.addEventListener("click", async () => {
  setMessage("");
  const response = await fetch("/api/race/stop", { method: "POST" });
  if (!response.ok) {
    setMessage("Unable to stop the heat.");
    return;
  }
  const data = (await response.json()) as DerbyState;
  applyState(data);
});

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  const carNumber = carNumberInput.value.trim();
  const lane = laneSelect.value.trim();

  if (!carNumber) {
    setMessage("Enter a car number first.");
    carNumberInput.focus();
    return;
  }

  recordBtn.disabled = true;
  const response = await fetch("/api/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carNumber, lane: lane || undefined }),
  });
  recordBtn.disabled = false;

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    setMessage(error.error ?? "Unable to record finish.");
    return;
  }

  const data = (await response.json()) as DerbyState;
  applyState(data);
  carNumberInput.value = "";
  carNumberInput.focus();
});

setInterval(syncState, 1000);
syncState();
tick();
updateControls();
