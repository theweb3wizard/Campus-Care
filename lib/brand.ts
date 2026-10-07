export const brand = {
  name: "Campus Care",
  fullName: "Campus Care — FUD Clinic",
  subtitle: "FUD Clinic",
  tagline: "Your health, made simple.",
  emergencyLabel: "Emergency",
} as const;

export const navItems = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book" },
  { href: "/visits", label: "Visits" },
  { href: "/tests", label: "Tests" },
  { href: "/profile", label: "Profile" },
] as const;
