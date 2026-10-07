# Phase 3 — Clinical (Done, needs Supabase connect)

## Built
- `supabase/migrations/0003_clinical.sql` — `test_orders` (status Ordered/Sampled/Ready/Cancelled + `is_released` gate), `medicines` catalog, `prescriptions` (Prescribed/Dispensed/Cancelled), `reports` (one per appointment), RLS (own-read for patients, staff full)
- `lib/clinical.ts` — types + `canViewResult()` (Ready AND released)
- Doctor queue extended: order test + prescribe inline, Write report link
- `/tests` — patient list with gating: unready shows "Not ready yet…", unreleased Ready shows "come to the clinic to discuss it"
- `/lab` + `LabInbox` — inbox, enter result, mark sampled/ready, release toggle (lab/doctor/nurse/admin)
- `/pharmacy` + `PharmacyQueue` — dispense queue with pickup confirmation
- `/reports` — patient report list; `/reports/new?appointment=` — doctor form (upsert per appointment)
- `/visits` — added Medicines section + Reports link
- `/profile` — staff quick links (Queue/Lab/Pharmacy/Reports), patients get My reports

## Verify
- `npm run lint` — pass
- `npm run build` — pass, 16 routes

## To go live
1. Run `0003_clinical.sql`, optionally seed medicines
2. Test full loop: doctor orders test + prescribes → lab enters result + releases → patient sees result in /tests → pharmacy dispenses → patient sees it in /visits → doctor writes report → patient reads /reports

## Next — Phase 4 Special modules
Pregnancy/maternity follow-ups, emergency requests, expert finder, questionnaire, notifications (email/in-app test-ready), reception/no-phone mode. Then hardening: audit log, backup, print cards, pilot.
