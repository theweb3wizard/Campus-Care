"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { questionnaireQuestions } from "@/lib/special";

export function QuestionnaireForm({ patientId }: { patientId: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("questionnaire_responses").insert({
        patient_id: patientId,
        answers,
      });
      if (error) throw error;
      setMsg("Received. Your doctor reads this before your visit.");
    } catch (err) {
      setMsg(friendlyError(err, "Send failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      {questionnaireQuestions.map((q) => (
        <label key={q.key} className="flex flex-col gap-1 text-sm font-medium">
          {q.label}
          {q.type === "choice" && "options" in q ? (
            <select
              value={answers[q.key] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
              className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
            >
              <option value="">Choose…</option>
              {q.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input
              value={answers[q.key] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
              className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
            />
          )}
        </label>
      ))}
      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
      <button type="submit" disabled={loading} className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
        {loading ? "Sending…" : "Send answers"}
      </button>
    </form>
  );
}
