import { describe, expect, it, beforeAll, afterAll } from "bun:test";

describe("DerbyTimer API Integration Tests", () => {
  const baseUrl = "http://localhost:3000";
  let eventId: string;
  let racerId: string;
  let heatId: string;

  // Test Event Management
  describe("Events API", () => {
    it("should create an event", async () => {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Pack Derby",
          date: "2026-02-15",
          lane_count: 4,
        }),
      });

      expect(response.status).toBe(201);
      const event = await response.json();
      expect(event.name).toBe("Test Pack Derby");
      expect(event.date).toBe("2026-02-15");
      expect(event.lane_count).toBe(4);
      expect(event.status).toBe("draft");
      expect(event.id).toBeDefined();
      eventId = event.id;
    });

    it("should list all events", async () => {
      const response = await fetch(`${baseUrl}/api/events`);
      expect(response.status).toBe(200);
      const events = await response.json();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it("should get a specific event", async () => {
      const response = await fetch(`${baseUrl}/api/events/${eventId}`);
      expect(response.status).toBe(200);
      const event = await response.json();
      expect(event.id).toBe(eventId);
      expect(event.name).toBe("Test Pack Derby");
    });

    it("should update an event", async () => {
      const response = await fetch(`${baseUrl}/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "checkin" }),
      });

      expect(response.status).toBe(200);
      const event = await response.json();
      expect(event.status).toBe("checkin");
    });
  });

  // Test Racer Registration (merged car + racer)
  describe("Racers API", () => {
    it("should create a racer with car info", async () => {
      const response = await fetch(`${baseUrl}/api/events/${eventId}/racers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Johnny Test",
          den: "Wolf",
          car_number: "7",
        }),
      });

      expect(response.status).toBe(201);
      const racer = await response.json();
      expect(racer.name).toBe("Johnny Test");
      expect(racer.den).toBe("Wolf");
      expect(racer.car_number).toBe("7");
      expect(racer.weight_ok).toBe(0);
      expect(racer.id).toBeDefined();
      racerId = racer.id;
    });

    it("should reject racer without required fields", async () => {
      const response = await fetch(`${baseUrl}/api/events/${eventId}/racers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Incomplete",
        }),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toContain("required");
    });

    it("should list racers for an event", async () => {
      const response = await fetch(`${baseUrl}/api/events/${eventId}/racers`);
      expect(response.status).toBe(200);
      const racers = await response.json();
      expect(Array.isArray(racers)).toBe(true);
      expect(racers.length).toBe(1);
      expect(racers[0].name).toBe("Johnny Test");
      expect(racers[0].car_number).toBe("7");
    });

    it("should pass inspection for a racer", async () => {
      const response = await fetch(`${baseUrl}/api/racers/${racerId}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_ok: true }),
      });

      expect(response.status).toBe(200);
      const racer = await response.json();
      expect(racer.weight_ok).toBe(1);
      expect(racer.inspected_at).toBeDefined();
    });
  });
});
