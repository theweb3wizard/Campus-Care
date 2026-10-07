export const testStatuses = ["Ordered", "Sampled", "Ready", "Cancelled"] as const;
export const prescriptionStatuses = ["Prescribed", "Dispensed", "Cancelled"] as const;

export type TestOrder = {
  id: string;
  test_name: string;
  status: string;
  result_text: string;
  is_released: boolean;
  release_note: string;
  created_at: string;
};

export type Prescription = {
  id: string;
  medicine_name: string;
  dosage: string;
  quantity: number;
  instructions: string;
  status: string;
  created_at: string;
};

export type Report = {
  id: string;
  appointment_id: string;
  diagnosis: string;
  treatment: string;
  follow_up_date: string | null;
  created_at: string;
};

/** Patient may see the result only when lab marked Ready AND clinician released it. */
export function canViewResult(t: Pick<TestOrder, "status" | "is_released">): boolean {
  return t.status === "Ready" && t.is_released;
}
