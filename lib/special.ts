export const riskLevels = ["Low", "High"] as const;
export const emergencyPriorities = ["Critical", "Urgent", "Normal"] as const;

export const questionnaireQuestions = [
  { key: "main_problem", label: "What is the main problem today?", type: "text" },
  { key: "duration", label: "How long has it lasted?", type: "text" },
  { key: "allergies", label: "Any drug allergies?", type: "text" },
  { key: "current_meds", label: "Medicines you take now?", type: "text" },
  { key: "pregnant", label: "Pregnant or possibly pregnant?", type: "choice", options: ["No", "Yes", "Not sure"] },
  { key: "extra", label: "Anything else the doctor should know?", type: "text" },
] as const;

export type PregnancyRecord = {
  id: string;
  edd: string | null;
  gestational_weeks: number | null;
  risk_level: string;
  next_visit: string | null;
  notes: string;
  created_at: string;
  patient_name?: string;
};

export type EmergencyRequest = {
  id: string;
  reporter_name: string;
  location: string;
  phone: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
};
