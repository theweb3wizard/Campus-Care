"use client";

import { createClient } from "@/lib/supabase/client";

/** Best-effort in-app notification. Never throws — callers must not fail because of it.
 * Returns true when the row was stored. Warns in console otherwise so missing alerts are diagnosable. */
export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  link: string = ""
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("notifications").insert({ user_id: userId, title, body, link });
    if (error) {
      console.warn("notifyUser dropped:", error.message);
      return false;
    }
    return true;
  } catch {
    // Pilot-safe: notifications must never break booking/lab/pharmacy flows.
    return false;
  }
}
