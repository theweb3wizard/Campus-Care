# Campus Care

Clinic care without the long queue.

This is an app for a university clinic. The problem is simple: students queue from morning with paper cards, nobody knows when test results are ready, and receptionists do everything by hand. Campus Care puts the queue, the card, the results, and the pharmacy on the phone instead.

It is built for FUD Clinic first. The structure allows other schools to run their own copy later.

## What it actually does

**If you are a student**, you sign up with your Reg No (something like `FCO/CSC/24/1001`), book a visit by picking a service, a doctor, a day, and a time. Taken times show as taken. You get a reference like `CC-8F3K2A`. Reception checks you in and you get a queue number for the day. Test results appear under Tests only after the lab releases them. Your medicines show under Visits when the pharmacy dispenses them.

**If you are a receptionist**, one screen does the whole job. Find a patient by reg number, card number, or name. Check them in (walk-in or from a booking). Book ahead for patients without phones and print a paper ticket. Run the queue: call, skip, recall, start, cancel.

**If you are a doctor**, you see today's queue. Confirm and complete visits, order lab tests, prescribe medicines, and write a one page report the patient can read later.

**If you are lab staff**, ordered tests land in your inbox. Enter the result, mark it ready, then release it. Nothing reaches a patient before release. That rule lives in the database, not just in the interface.

**If you are pharmacy staff**, prescriptions queue up with the stock on hand shown next to each one. One button dispenses. Stock moves in the same database transaction, so it can never go negative or double count.

**If you are an admin**, you import the student registry from a CSV, invite staff by Staff ID, set roles, manage doctors and drug stock, edit clinic settings, and read the audit log.

There is also pregnancy care with follow-up dates, an emergency request flow that works logged out, a specialist finder, a short health questionnaire, and an alerts inbox.

## How it is built

Next.js (App Router) with TypeScript and Tailwind CSS. Supabase underneath for Postgres, Auth, and row level security. Deployed on Vercel. No SMS provider, no paid service. The full database lives in `supabase/migrations/` as plain SQL files, numbered in run order, plus `seed.sql` with demo students and drugs.

Login uses school IDs, not email. A student types a Reg No, a staff member types a Staff ID, plus a password. Email is collected once at signup and used only for password reset. The mapping from ID to account is enforced by database functions, and every sensitive rule (who sees which result, who can dispense, who can change a role) is enforced by the database too. The interface is not trusted with any of that.

The design rules are written down in `docs/DESIGN.md` so every screen keeps the same look. The database thinking is in `docs/database-v2.md`.

## Run it locally

You need Node 20 or newer.

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Supabase project URL and anon key (Dashboard, Project Settings, API).

```bash
npm run dev
```

Open `http://localhost:3000`.

## Set up the database

Fresh Supabase project, SQL Editor, run each file once, in this order, and expect success on each:

1. `supabase/migrations/0001_core.sql`
2. `supabase/migrations/0002_clinical.sql`
3. `supabase/migrations/0003_special.sql`
4. `supabase/migrations/0004_rpc.sql`
5. `supabase/migrations/0005_security.sql`
6. `supabase/migrations/0006_frontend_alignment.sql`
7. `supabase/seed.sql`

Then turn OFF `Confirm email` in Authentication, Sign In / Sign Up. That is for testing only. Turn it back ON before real students arrive, because confirmed email is part of what stops fake accounts.

## Test accounts

Everyone signs up at `/signup` with these exact IDs and emails (the claim checks them letter for letter), sets their own password, and lands with the right role. Full table and test order are in the project docs. The short version: student books, reception checks in, doctor consults, lab releases, pharmacy dispenses.

## Where things live

```text
app/            pages, one folder per route (/book, /visits, /lab, ...)
components/     UI pieces, including components/motion/ for animation tokens
lib/            small helpers (booking slots, auth, error messages, state copy)
supabase/       migrations 0001 to 0006, seed.sql, pgTAP regression specs
docs/           brand, design system, database thinking, phase notes
```

## Honest status

This works end to end on a connected database and every flow has been walked through. What it has not had yet: a real clinic day with real patients, rate limiting on public forms, and automated browser tests. Treat it as a tested pilot, not a finished product. The open items are listed in `docs/skeptic-fixes.md`.
