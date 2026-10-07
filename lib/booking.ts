export const services = ["General", "Eye", "Dental", "Antenatal", "Lab only"] as const;

export type Doctor = {
  id: string;
  specialty: string;
  room: string;
  bio: string;
  full_name: string;
};

export const demoDoctors: Doctor[] = [
  { id: "demo-1", specialty: "General", room: "Clinic 1", bio: "", full_name: "Dr. Amina Bello" },
  { id: "demo-2", specialty: "Eye", room: "Clinic 2", bio: "", full_name: "Dr. Chidi Okafor" },
  { id: "demo-3", specialty: "Dental", room: "Clinic 3", bio: "", full_name: "Dr. Fatima Sani" },
];

/** Next 7 days, 9:00–16:00, 20-min slots. Skips Sunday. */
export function buildSlots(days = 7): Date[] {
  const slots: Date[] = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    if (day.getDay() === 0) continue;
    for (let h = 9; h < 16; h++) {
      for (const m of [0, 20, 40]) {
        const s = new Date(day);
        s.setHours(h, m, 0, 0);
        if (s.getTime() > now.getTime() + 30 * 60 * 1000) slots.push(s);
      }
    }
  }
  return slots.slice(0, 60);
}

export function formatSlot(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function makeReference(): string {
  return `CC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Clinic-day bounds in Africa/Lagos (UTC+1, no daylight saving, fixed all year).
 * dateValue is yyyy-mm-dd as picked in the UI. Returns UTC instants for booked_slots().
 */
export function lagosDayRange(dateValue: string): { start: string; end: string } {
  const start = new Date(`${dateValue}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}
