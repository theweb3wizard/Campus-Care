export type StaffLink = {
  href: string;
  label: string;
  desc: string;
  roles: readonly string[];
};

export type StaffGroup = {
  title: string;
  links: StaffLink[];
};

export const staffGroups: StaffGroup[] = [
  {
    title: "Today",
    links: [
      { href: "/reception", label: "Reception", desc: "Find, check in, book, run queue", roles: ["receptionist", "admin", "doctor", "nurse"] },
      { href: "/doctor", label: "Queue", desc: "Today's visits, order, prescribe", roles: ["doctor", "nurse", "receptionist", "admin"] },
      { href: "/emergency/requests", label: "Emergencies", desc: "Triage incoming requests", roles: ["doctor", "nurse", "receptionist", "admin"] },
    ],
  },
  {
    title: "Care",
    links: [
      { href: "/lab", label: "Lab", desc: "Sample, ready, release", roles: ["lab", "doctor", "nurse", "admin"] },
      { href: "/pharmacy", label: "Pharmacy", desc: "Dispense face to face", roles: ["pharmacy", "doctor", "nurse", "admin"] },
      { href: "/reports", label: "Reports", desc: "Visit summaries", roles: ["doctor", "nurse", "admin", "receptionist", "lab", "pharmacy"] },
    ],
  },
  {
    title: "Manage",
    links: [
      { href: "/admin", label: "Admin", desc: "Roles, registry, settings", roles: ["admin"] },
      { href: "/admin/audit", label: "Audit", desc: "Who did what", roles: ["admin"] },
      { href: "/notifications", label: "Alerts", desc: "Bookings, results, visits", roles: ["doctor", "nurse", "admin", "receptionist", "lab", "pharmacy"] },
    ],
  },
];

export function staffLinksFor(role: string): StaffLink[] {
  return staffGroups.flatMap((g) => g.links).filter((l) => l.roles.includes(role));
}

export function staffGroupsFor(role: string): StaffGroup[] {
  return staffGroups
    .map((g) => ({ ...g, links: g.links.filter((l) => l.roles.includes(role)) }))
    .filter((g) => g.links.length > 0);
}

const titles: Record<string, string> = {
  "/reception": "Reception",
  "/doctor": "Doctor queue",
  "/lab": "Lab inbox",
  "/pharmacy": "Pharmacy",
  "/emergency/requests": "Emergency requests",
  "/admin": "Staff management",
  "/admin/audit": "Audit log",
  "/reports": "Reports",
  "/reports/new": "Write report",
  "/notifications": "Alerts",
};

export function staffTitleFor(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  for (const [href, title] of Object.entries(titles)) {
    if (pathname.startsWith(`${href}/`)) return title;
  }
  return "Staff";
}
