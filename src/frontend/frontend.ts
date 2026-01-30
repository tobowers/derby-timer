// Derby Race Manager - Frontend
// A comprehensive single-page application for managing pinewood derby races

// ===== TYPES =====

interface Event {
  id: string;
  name: string;
  date: string;
  lane_count: number;
  status: 'draft' | 'checkin' | 'racing' | 'complete';
  created_at: string;
  updated_at: string;
}

interface Racer {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  den: string | null;
  rank: string | null;
  contact: string | null;
}

interface Car {
  id: string;
  event_id: string;
  racer_id: string;
  car_number: string;
  name: string | null;
  class: string | null;
  weight_ok: number;
  inspected_at: string | null;
  racer_name?: string;
}

interface Heat {
  id: string;
  event_id: string;
  round: number;
  heat_number: number;
  status: 'pending' | 'running' | 'complete';
  started_at: string | null;
  finished_at: string | null;
}

interface HeatLane {
  id: string;
  heat_id: string;
  lane_number: number;
  car_id: string;
  car_number?: string;
  racer_name?: string;
}

interface HeatWithLanes extends Heat {
  lanes: HeatLane[];
}

interface Result {
  id: string;
  heat_id: string;
  lane_number: number;
  car_id: string;
  place: number | null;
  time_ms: number | null;
  dnf: number;
  car_number?: string;
  racer_name?: string;
}

interface Standing {
  car_id: string;
  wins: number;
  losses: number;
  heats_run: number;
  avg_time_ms: number | null;
  car_number: string;
  racer_name: string;
  class: string | null;
}

// ===== STATE =====

let currentEvent: Event | null = null;
let racers: Racer[] = [];
let cars: Car[] = [];
let heats: HeatWithLanes[] = [];
let currentRoute = '/';

// ===== ROUTER =====

const routes: Record<string, () => HTMLElement> = {
  '/': () => createEventSelector(),
  '/register': () => createRegistrationView(),
  '/heats': () => createHeatsView(),
  '/race': () => createRaceConsoleView(),
  '/standings': () => createStandingsView(),
  '/display': () => createDisplayView(),
};

function navigate(route: string) {
  currentRoute = route;
  render();
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  
  app.innerHTML = '';
  
  // Always add navigation (except on display view)
  if (currentRoute !== '/display') {
    app.appendChild(createNavigation());
  }
  
  // Render current route
  const routeHandler = routes[currentRoute] || routes['/'];
  if (routeHandler) {
    app.appendChild(routeHandler());
  }
}

// ===== NAVIGATION =====

function createNavigation(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'main-nav';
  
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  brand.innerHTML = `
    <span class="nav-logo">🏁</span>
    <span class="nav-title">Derby Race Manager</span>
  `;
  brand.onclick = () => navigate('/');
  
  const links = document.createElement('div');
  links.className = 'nav-links';
  
  const navItems = [
    { route: '/', label: 'Events', icon: '📅' },
    { route: '/register', label: 'Register', icon: '📝' },
    { route: '/heats', label: 'Heats', icon: '🏎️' },
    { route: '/race', label: 'Race', icon: '🚦' },
    { route: '/standings', label: 'Standings', icon: '🏆' },
  ];
  
  for (const item of navItems) {
    const link = document.createElement('button');
    link.className = `nav-link ${currentRoute === item.route ? 'active' : ''}`;
    link.innerHTML = `<span class="nav-icon">${item.icon}</span>${item.label}`;
    link.onclick = () => navigate(item.route);
    links.appendChild(link);
  }
  
  const displayBtn = document.createElement('button');
  displayBtn.className = 'nav-link display-link';
  displayBtn.innerHTML = '📺 Display';
  displayBtn.onclick = () => window.open('/display', '_blank');
  links.appendChild(displayBtn);
  
  nav.appendChild(brand);
  nav.appendChild(links);
  
  return nav;
}

// ===== EVENT SELECTOR VIEW =====

function createEventSelector(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'view event-view';
  
  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h1>Select Event</h1>
    <p class="subtitle">Choose an event or create a new one</p>
  `;
  
  const content = document.createElement('div');
  content.className = 'event-grid';
  
  // Load events
  loadEvents().then(events => {
    if (events.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <p>No events yet. Create your first race day!</p>
        </div>
      `;
    } else {
      for (const event of events) {
        const card = document.createElement('div');
        card.className = `event-card ${currentEvent?.id === event.id ? 'selected' : ''}`;
        card.innerHTML = `
          <h3>${event.name}</h3>
          <p class="event-date">${new Date(event.date).toLocaleDateString()}</p>
          <p class="event-status status-${event.status}">${event.status}</p>
          <p class="event-lanes">${event.lane_count} lanes</p>
        `;
        card.onclick = () => selectEvent(event);
        content.appendChild(card);
      }
    }
  });
  
  const createSection = document.createElement('div');
  createSection.className = 'create-section';
  createSection.innerHTML = `
    <h2>Create New Event</h2>
    <form id="createEventForm" class="form-grid">
      <label>
        Event Name
        <input type="text" name="name" placeholder="Pack 123 Derby 2026" required />
      </label>
      <label>
        Date
        <input type="date" name="date" required />
      </label>
      <label>
        Lanes
        <select name="lane_count">
          <option value="2">2 Lanes</option>
          <option value="3">3 Lanes</option>
          <option value="4" selected>4 Lanes</option>
          <option value="5">5 Lanes</option>
          <option value="6">6 Lanes</option>
        </select>
      </label>
      <button type="submit" class="btn-primary">Create Event</button>
    </form>
  `;
  
  createSection.querySelector('form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        date: formData.get('date'),
        lane_count: parseInt(formData.get('lane_count') as string),
      }),
    });
    
    if (response.ok) {
      form.reset();
      render(); // Refresh
    }
  });
  
  // Set today's date as default
  const dateInput = createSection.querySelector('input[name="date"]') as HTMLInputElement;
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }
  
  container.appendChild(header);
  container.appendChild(content);
  container.appendChild(createSection);
  
  return container;
}

async function loadEvents(): Promise<Event[]> {
  const response = await fetch('/api/events');
  return response.ok ? await response.json() : [];
}

async function selectEvent(event: Event) {
  currentEvent = event;
  
  // Load related data
  const [racersData, carsData, heatsData] = await Promise.all([
    fetch(`/api/events/${event.id}/racers`).then(r => r.ok ? r.json() : []),
    fetch(`/api/events/${event.id}/cars`).then(r => r.ok ? r.json() : []),
    fetch(`/api/events/${event.id}/heats`).then(r => r.ok ? r.json() : []),
  ]);
  
  racers = racersData;
  cars = carsData;
  heats = heatsData;
  
  render();
}

// ===== REGISTRATION VIEW =====

function createRegistrationView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'view registration-view';
  
  if (!currentEvent) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Please select an event first</p>
        <button class="btn-primary" onclick="navigate('/')">Select Event</button>
      </div>
    `;
    return container;
  }
  
  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h1>Registration</h1>
    <p class="subtitle">${currentEvent.name} - ${racers.length} racers, ${cars.length} cars</p>
  `;
  
  const tabs = document.createElement('div');
  tabs.className = 'registration-tabs';
  tabs.innerHTML = `
    <button class="tab-btn active" data-tab="racers">Racers</button>
    <button class="tab-btn" data-tab="cars">Cars</button>
    <button class="tab-btn" data-tab="inspection">Inspection</button>
  `;
  
  const content = document.createElement('div');
  content.className = 'registration-content';
  content.id = 'registrationContent';
  
  // Default to racers tab
  content.appendChild(createRacersTab());
  
  // Tab switching
  tabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      content.innerHTML = '';
      const tabName = btn.getAttribute('data-tab');
      if (tabName === 'racers') content.appendChild(createRacersTab());
      else if (tabName === 'cars') content.appendChild(createCarsTab());
      else if (tabName === 'inspection') content.appendChild(createInspectionTab());
    });
  });
  
  container.appendChild(header);
  container.appendChild(tabs);
  container.appendChild(content);
  
  return container;
}

function createRacersTab(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'tab-content racers-tab';
  
  // Add racer form
  const form = document.createElement('form');
  form.className = 'racer-form';
  form.innerHTML = `
    <h3>Add Racer</h3>
    <div class="form-row">
      <input type="text" name="first_name" placeholder="First Name" required />
      <input type="text" name="last_name" placeholder="Last Name" required />
      <input type="text" name="den" placeholder="Den (e.g., Wolf)" />
      <input type="text" name="rank" placeholder="Rank" />
      <button type="submit" class="btn-primary">Add Racer</button>
    </div>
  `;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const response = await fetch(`/api/events/${currentEvent!.id}/racers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        den: formData.get('den') || undefined,
        rank: formData.get('rank') || undefined,
      }),
    });
    
    if (response.ok) {
      form.reset();
      // Refresh racers
      const racersResponse = await fetch(`/api/events/${currentEvent!.id}/racers`);
      racers = await racersResponse.json();
      render();
    }
  });
  
  // Racers list
  const list = document.createElement('div');
  list.className = 'racers-list';
  
  if (racers.length === 0) {
    list.innerHTML = '<p class="empty-message">No racers registered yet</p>';
  } else {
    for (const racer of racers) {
      const card = document.createElement('div');
      card.className = 'racer-card';
      card.innerHTML = `
        <div class="racer-info">
          <strong>${racer.first_name} ${racer.last_name}</strong>
          ${racer.den ? `<span class="racer-den">${racer.den}</span>` : ''}
          ${racer.rank ? `<span class="racer-rank">${racer.rank}</span>` : ''}
        </div>
        <button class="btn-icon" onclick="deleteRacer('${racer.id}')">🗑️</button>
      `;
      list.appendChild(card);
    }
  }
  
  section.appendChild(form);
  section.appendChild(list);
  
  return section;
}

function createCarsTab(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'tab-content cars-tab';
  
  if (racers.length === 0) {
    section.innerHTML = `
      <div class="empty-state">
        <p>Add racers first before registering cars</p>
      </div>
    `;
    return section;
  }
  
  // Add car form
  const form = document.createElement('form');
  form.className = 'car-form';
  form.innerHTML = `
    <h3>Add Car</h3>
    <div class="form-row">
      <select name="racer_id" required>
        <option value="">Select Racer...</option>
        ${racers.map(r => `<option value="${r.id}">${r.first_name} ${r.last_name}</option>`).join('')}
      </select>
      <input type="text" name="car_number" placeholder="Car #" required />
      <input type="text" name="name" placeholder="Car Name" />
      <input type="text" name="class" placeholder="Class/Division" />
      <button type="submit" class="btn-primary">Add Car</button>
    </div>
  `;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    const response = await fetch(`/api/events/${currentEvent!.id}/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        racer_id: formData.get('racer_id'),
        car_number: formData.get('car_number'),
        name: formData.get('name') || undefined,
        class: formData.get('class') || undefined,
      }),
    });
    
    if (response.ok) {
      form.reset();
      // Refresh cars
      const carsResponse = await fetch(`/api/events/${currentEvent!.id}/cars`);
      cars = await carsResponse.json();
      render();
    }
  });
  
  // Cars list
  const list = document.createElement('div');
  list.className = 'cars-list';
  
  if (cars.length === 0) {
    list.innerHTML = '<p class="empty-message">No cars registered yet</p>';
  } else {
    for (const car of cars) {
      const card = document.createElement('div');
      card.className = 'car-card';
      card.innerHTML = `
        <div class="car-info">
          <strong class="car-number">#${car.car_number}</strong>
          <span class="car-name">${car.name || 'Unnamed'}</span>
          <span class="car-racer">${car.racer_name}</span>
          ${car.class ? `<span class="car-class">${car.class}</span>` : ''}
          ${car.weight_ok ? '<span class="car-inspected">✓ Inspected</span>' : '<span class="car-pending">⏳ Pending</span>'}
        </div>
        <button class="btn-icon" onclick="deleteCar('${car.id}')">🗑️</button>
      `;
      list.appendChild(card);
    }
  }
  
  section.appendChild(form);
  section.appendChild(list);
  
  return section;
}

function createInspectionTab(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'tab-content inspection-tab';
  
  if (cars.length === 0) {
    section.innerHTML = `
      <div class="empty-state">
        <p>No cars to inspect yet</p>
      </div>
    `;
    return section;
  }
  
  const list = document.createElement('div');
  list.className = 'inspection-list';
  
  for (const car of cars) {
    const card = document.createElement('div');
    card.className = `inspection-card ${car.weight_ok ? 'inspected' : 'pending'}`;
    card.innerHTML = `
      <div class="inspection-info">
        <strong class="inspection-number">#${car.car_number}</strong>
        <span class="inspection-name">${car.name || 'Unnamed'}</span>
        <span class="inspection-racer">${car.racer_name}</span>
      </div>
      <div class="inspection-actions">
        ${!car.weight_ok ? `
          <button class="btn-success" onclick="inspectCar('${car.id}', true)">Pass</button>
          <button class="btn-danger" onclick="inspectCar('${car.id}', false)">Fail</button>
        ` : `
          <span class="inspection-passed">✓ Passed</span>
          <button class="btn-secondary" onclick="inspectCar('${car.id}', false)">Reset</button>
        `}
      </div>
    `;
    list.appendChild(card);
  }
  
  section.appendChild(list);
  
  return section;
}

// Make functions available globally for onclick handlers
(window as any).deleteRacer = async (id: string) => {
  if (!confirm('Delete this racer?')) return;
  await fetch(`/api/racers/${id}`, { method: 'DELETE' });
  const racersResponse = await fetch(`/api/events/${currentEvent!.id}/racers`);
  racers = await racersResponse.json();
  render();
};

(window as any).deleteCar = async (id: string) => {
  if (!confirm('Delete this car?')) return;
  await fetch(`/api/cars/${id}`, { method: 'DELETE' });
  const carsResponse = await fetch(`/api/events/${currentEvent!.id}/cars`);
  cars = await carsResponse.json();
  render();
};

(window as any).inspectCar = async (id: string, pass: boolean) => {
  await fetch(`/api/cars/${id}/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight_ok: pass }),
  });
  const carsResponse = await fetch(`/api/events/${currentEvent!.id}/cars`);
  cars = await carsResponse.json();
  render();
};

// ===== HEATS VIEW =====

function createHeatsView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'view heats-view';
  
  if (!currentEvent) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Please select an event first</p>
        <button class="btn-primary" onclick="navigate('/')">Select Event</button>
      </div>
    `;
    return container;
  }
  
  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `
    <h1>Heat Schedule</h1>
    <p class="subtitle">${currentEvent.name} - ${heats.length} heats</p>
  `;
  
  const controls = document.createElement('div');
  controls.className = 'heats-controls';
  
  if (heats.length === 0) {
    controls.innerHTML = `
      <p>Generate heats for ${cars.length} cars across ${currentEvent.lane_count} lanes</p>
      <button class="btn-primary btn-large" id="generateHeatsBtn">Generate Heats</button>
    `;
    
    controls.querySelector('#generateHeatsBtn')?.addEventListener('click', async () => {
      const eligibleCars = cars.filter(c => c.weight_ok);
      if (eligibleCars.length === 0) {
        alert('No cars have passed inspection. Please inspect cars first.');
        return;
      }
      
      if (!confirm(`Generate heats for ${eligibleCars.length} eligible cars?`)) return;
      
      const response = await fetch(`/api/events/${currentEvent!.id}/generate-heats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds: 1 }),
      });
      
      if (response.ok) {
        heats = await response.json();
        render();
      }
    });
  } else {
    controls.innerHTML = `
      <button class="btn-danger" id="clearHeatsBtn">Clear All Heats</button>
      <button class="btn-primary" onclick="navigate('/race')">Start Racing</button>
    `;
    
    controls.querySelector('#clearHeatsBtn')?.addEventListener('click', async () => {
      if (!confirm('Clear all heats? This cannot be undone.')) return;
      await fetch(`/api/events/${currentEvent!.id}/heats`, { method: 'DELETE' });
      heats = [];
      render();
    });
  }
  
  const heatsList = document.createElement('div');
  heatsList.className = 'heats-list';
  
  for (const heat of heats) {
    const heatCard = document.createElement('div');
    heatCard.className = `heat-card status-${heat.status}`;
    heatCard.innerHTML = `
      <div class="heat-header">
        <strong>Heat ${heat.heat_number}</strong>
        <span class="heat-status">${heat.status}</span>
      </div>
      <div class="heat-lanes">
        ${heat.lanes.map(lane => `
          <div class="heat-lane">
            <span class="lane-number">Lane ${lane.lane_number}</span>
            <span class="lane-car">#${lane.car_number}</span>
            <span class="lane-racer">${lane.racer_name}</span>
          </div>
        `).join('')}
      </div>
    `;
    heatsList.appendChild(heatCard);
  }
  
  container.appendChild(header);
  container.appendChild(controls);
  container.appendChild(heatsList);
  
  return container;
}

// ===== RACE CONSOLE VIEW =====

function createRaceConsoleView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'view race-view';
  
  if (!currentEvent) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Please select an event first</p>
        <button class="btn-primary" onclick="navigate('/')">Select Event</button>
      </div>
    `;
    return container;
  }
  
  if (heats.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No heats generated yet. Generate heats first.</p>
        <button class="btn-primary" onclick="navigate('/heats')">Go to Heats</button>
      </div>
    `;
    return container;
  }
  
  // Find next pending heat
  const pendingHeats = heats.filter(h => h.status === 'pending');
  const currentHeat = heats.find(h => h.status === 'running') || pendingHeats[0];
  
  const header = document.createElement('div');
  header.className = 'race-header';
  header.innerHTML = `
    <h1>Race Console</h1>
    <div class="race-progress">
      ${heats.filter(h => h.status === 'complete').length} / ${heats.length} complete
    </div>
  `;
  
  const raceDisplay = document.createElement('div');
  raceDisplay.className = 'race-display';
  
  if (currentHeat) {
    raceDisplay.innerHTML = `
      <div class="current-heat-banner">
        <div class="heat-number-display">Heat ${currentHeat.heat_number}</div>
        <div class="heat-status-display ${currentHeat.status}">${currentHeat.status}</div>
      </div>
      
      <div class="race-lanes">
        ${currentHeat.lanes.map(lane => `
          <div class="race-lane" data-lane="${lane.lane_number}" data-car="${lane.car_id}">
            <div class="lane-header">
              <span class="lane-label">Lane ${lane.lane_number}</span>
              <span class="car-info">#${lane.car_number} - ${lane.racer_name}</span>
            </div>
            <div class="lane-controls">
              <button class="place-btn place-1" onclick="recordPlace('${currentHeat.id}', ${lane.lane_number}, '${lane.car_id}', 1)">1st</button>
              <button class="place-btn place-2" onclick="recordPlace('${currentHeat.id}', ${lane.lane_number}, '${lane.car_id}', 2)">2nd</button>
              <button class="place-btn place-3" onclick="recordPlace('${currentHeat.id}', ${lane.lane_number}, '${lane.car_id}', 3)">3rd</button>
              <button class="place-btn place-4" onclick="recordPlace('${currentHeat.id}', ${lane.lane_number}, '${lane.car_id}', 4)">4th</button>
              <button class="place-btn dnf" onclick="recordDNF('${currentHeat.id}', ${lane.lane_number}, '${lane.car_id}')">DNF</button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="race-actions">
        ${currentHeat.status === 'pending' ? `
          <button class="btn-primary btn-huge" onclick="startHeat('${currentHeat.id}')">🏁 START HEAT</button>
        ` : currentHeat.status === 'running' ? `
          <button class="btn-warning btn-large" onclick="stopHeat()">Stop Heat</button>
          <button class="btn-success btn-large" onclick="finishHeat('${currentHeat.id}')">Complete Heat & Save</button>
        ` : `
          <button class="btn-primary btn-huge" onclick="nextHeat()">Next Heat →</button>
        `}
      </div>
    `;
  } else {
    raceDisplay.innerHTML = `
      <div class="race-complete">
        <h2>🏆 Race Complete!</h2>
        <p>All heats have been run</p>
        <button class="btn-primary btn-huge" onclick="navigate('/standings')">View Standings</button>
      </div>
    `;
  }
  
  container.appendChild(header);
  container.appendChild(raceDisplay);
  
  return container;
}

(window as any).startHeat = async (heatId: string) => {
  await fetch(`/api/heats/${heatId}/start`, { method: 'POST' });
  // Refresh heats
  const heatsResponse = await fetch(`/api/events/${currentEvent!.id}/heats`);
  heats = await heatsResponse.json();
  render();
};

(window as any).stopHeat = async () => {
  await fetch('/api/race/stop', { method: 'POST' });
  render();
};

(window as any).finishHeat = async (heatId: string) => {
  await fetch(`/api/heats/${heatId}/complete`, { method: 'POST' });
  // Refresh heats
  const heatsResponse = await fetch(`/api/events/${currentEvent!.id}/heats`);
  heats = await heatsResponse.json();
  render();
};

(window as any).nextHeat = () => {
  render();
};

const heatResults: Record<string, { lane_number: number; car_id: string; place: number; dnf?: boolean }[]> = {};

(window as any).recordPlace = (heatId: string, laneNumber: number, carId: string, place: number) => {
  if (!heatResults[heatId]) heatResults[heatId] = [];
  
  // Remove any existing entry for this lane/car
  heatResults[heatId] = heatResults[heatId].filter(r => r.lane_number !== laneNumber && r.car_id !== carId);
  
  heatResults[heatId].push({ lane_number: laneNumber, car_id: carId, place });
  
  // Visual feedback
  document.querySelectorAll(`[data-lane="${laneNumber}"] .place-btn`).forEach(btn => {
    btn.classList.remove('selected');
  });
  const btn = document.querySelector(`[data-lane="${laneNumber}"] .place-${place}`);
  btn?.classList.add('selected');
};

(window as any).recordDNF = (heatId: string, laneNumber: number, carId: string) => {
  if (!heatResults[heatId]) heatResults[heatId] = [];
  
  heatResults[heatId] = heatResults[heatId].filter(r => r.lane_number !== laneNumber && r.car_id !== carId);
  heatResults[heatId].push({ lane_number: laneNumber, car_id: carId, place: 99, dnf: true });
  
  document.querySelectorAll(`[data-lane="${laneNumber}"] .place-btn`).forEach(btn => {
    btn.classList.remove('selected');
  });
  const btn = document.querySelector(`[data-lane="${laneNumber}"] .dnf`);
  btn?.classList.add('selected');
};

// ===== STANDINGS VIEW =====

function createStandingsView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'view standings-view';
  
  if (!currentEvent) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Please select an event first</p>
        <button class="btn-primary" onclick="navigate('/')">Select Event</button>
      </div>
    `;
    return container;
  }
  
  const header = document.createElement('div');
  header.className = 'view-header';
  header.innerHTML = `<h1>Race Standings</h1>`;
  
  const content = document.createElement('div');
  content.className = 'standings-content';
  content.id = 'standingsContent';
  content.innerHTML = '<p class="loading">Loading standings...</p>';
  
  // Load standings
  loadStandings().then(standings => {
    content.innerHTML = '';
    
    if (standings.length === 0) {
      content.innerHTML = '<p class="empty-message">No results yet. Run some heats!</p>';
      return;
    }
    
    const table = document.createElement('table');
    table.className = 'standings-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Rank</th>
          <th>Car #</th>
          <th>Racer</th>
          <th>Class</th>
          <th>Wins</th>
          <th>Losses</th>
          <th>Heats</th>
          <th>Avg Time</th>
        </tr>
      </thead>
      <tbody>
        ${standings.map((s, idx) => `
          <tr class="${idx < 3 ? 'top-three rank-' + (idx + 1) : ''}">
            <td class="rank">${idx + 1}</td>
            <td class="car-number">${s.car_number}</td>
            <td class="racer">${s.racer_name}</td>
            <td class="class">${s.class || '-'}</td>
            <td class="wins">${s.wins}</td>
            <td class="losses">${s.losses}</td>
            <td class="heats">${s.heats_run}</td>
            <td class="time">${s.avg_time_ms ? (s.avg_time_ms / 1000).toFixed(3) + 's' : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    
    content.appendChild(table);
  });
  
  container.appendChild(header);
  container.appendChild(content);
  
  return container;
}

async function loadStandings(): Promise<Standing[]> {
  if (!currentEvent) return [];
  const response = await fetch(`/api/events/${currentEvent.id}/standings`);
  return response.ok ? await response.json() : [];
}

// ===== DISPLAY VIEW (For Projection) =====

function createDisplayView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'display-view';
  
  if (!currentEvent) {
    container.innerHTML = `
      <div class="display-idle">
        <h1>🏁 Derby Race Manager</h1>
        <p>Select an event to begin</p>
      </div>
    `;
    return container;
  }
  
  // Auto-rotate between views
  const displayState = {
    view: 'current', // 'current' | 'standings' | 'upcoming'
    currentHeat: heats.find(h => h.status === 'running') || heats.find(h => h.status === 'pending'),
  };
  
  const updateDisplay = async () => {
    // Refresh data
    const [heatsResponse, standingsResponse] = await Promise.all([
      fetch(`/api/events/${currentEvent!.id}/heats`),
      fetch(`/api/events/${currentEvent!.id}/standings`),
    ]);
    
    if (heatsResponse.ok) heats = await heatsResponse.json();
    const standings = standingsResponse.ok ? await standingsResponse.json() : [];
    
    const runningHeat = heats.find(h => h.status === 'running');
    const nextPending = heats.find(h => h.status === 'pending');
    
    container.innerHTML = '';
    
    if (runningHeat) {
      // Show current race
      container.innerHTML = `
        <div class="display-current">
          <div class="display-header">
            <h1>🏁 HEAT ${runningHeat.heat_number}</h1>
          </div>
          <div class="display-lanes">
            ${runningHeat.lanes.map(lane => `
              <div class="display-lane">
                <div class="display-lane-number">Lane ${lane.lane_number}</div>
                <div class="display-car-number">#${lane.car_number}</div>
                <div class="display-racer">${lane.racer_name}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (nextPending) {
      // Show upcoming heat
      container.innerHTML = `
        <div class="display-upcoming">
          <div class="display-header">
            <h1>UP NEXT: Heat ${nextPending.heat_number}</h1>
          </div>
          <div class="display-lanes">
            ${nextPending.lanes.map(lane => `
              <div class="display-lane">
                <div class="display-lane-number">Lane ${lane.lane_number}</div>
                <div class="display-car-number">#${lane.car_number}</div>
                <div class="display-racer">${lane.racer_name}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (standings.length > 0) {
      // Show standings
      container.innerHTML = `
        <div class="display-standings">
          <div class="display-header">
            <h1>🏆 RACE STANDINGS</h1>
          </div>
          <div class="display-podium">
            ${standings.slice(0, 5).map((s: Standing, idx: number) => `
              <div class="display-standings-row rank-${idx + 1}">
                <div class="display-rank">${idx + 1}</div>
                <div class="display-car">#${s.car_number}</div>
                <div class="display-name">${s.racer_name}</div>
                <div class="display-wins">${s.wins} wins</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (currentEvent) {
      container.innerHTML = `
        <div class="display-idle">
          <h1>🏁 ${currentEvent.name}</h1>
          <p>Race Day Ready</p>
        </div>
      `;
    }
  };
  
  // Initial render and auto-refresh
  updateDisplay();
  setInterval(updateDisplay, 5000);
  
  return container;
}

// ===== INITIALIZATION =====

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  render();
});
