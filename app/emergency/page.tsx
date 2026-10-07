import { EmergencyForm } from "@/components/EmergencyForm";

export default function EmergencyPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Emergency</h1>
      <p className="text-[var(--muted-foreground)]">Go to Clinic Casualty now. One tap to call, or send details below.</p>
      <EmergencyForm />
    </div>
  );
}
