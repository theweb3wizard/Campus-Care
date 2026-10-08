# Campus Care: Testing Handover

Hey team. This is everything you need to test the clinic app end to end. Read it once, then work through your section.

## What this system is

Campus Care replaces the paper cards and the morning queue at our school clinic. A student books a visit on the phone, reception checks them in and gives a queue number for the day, the doctor consults, the lab handles tests, pharmacy dispenses drugs, and the patient sees results and reports without coming back to ask. One flow, start to finish. No paper.

Everyone logs in with a school ID, not an email. Students use their Reg No. Staff use their Staff ID. Password for every test account below is the same. Email is only there because the system needs one behind the scenes. Type everything exactly as written. Capital letters matter.

## Where to open it

Production link: (paste the Vercel production URL here before sending)

If a page ever shows sample doctors with a preview banner, that means it could not reach the database. Stop and report it in the group instead of testing further.

## Credentials (password for ALL accounts: `Test1234`)

| Role | ID to type at login | What this account tests |
|---|---|---|
| Admin | `FUD/ST/001` | Staff invites, roles, doctors list, registry import, settings, audit log |
| Doctor | `FUD/ST/002` | Queue, confirm and complete visits, order tests, prescribe, write reports |
| Nurse | `FUD/ST/003` | Queue views and support actions |
| Receptionist | `FUD/ST/004` | Find patient, check in, book ahead, print ticket, run the queue |
| Lab | `FUD/ST/005` | Enter results, mark ready, release to patient |
| Pharmacy | `FUD/ST/006` | Dispense queue, stock restock |
| Student | `FCO/CSC/24/1001` (name: Amina Bello) | Booking, visits, tests, reports, medicines, alerts |

## How the full loop works (do it in this order)

This is the one path that touches everything. Do not skip steps, because each step feeds the next one.

1. **Student books.** Log in as the student. Open Book. Pick General, pick the doctor, pick a day, pick a time. Taken times show as taken, so pick a free one. Confirm. You get a reference like `CC-8F3K2A`. Write it down.
2. **Reception checks in.** Log in as receptionist. Open Reception. Search `FCO/CSC/24/1001`. Select the patient. Press check in. The patient gets a queue number (No. 1 if first today) plus a clinic file number. Confirm the queue list shows them.
3. **Doctor consults.** Log in as doctor. Open the queue. Confirm the visit, then Complete it. Order a Malaria test. Prescribe Paracetamol. Write a short report.
4. **Lab releases.** Log in as lab. Open Lab. The Malaria order should be sitting in the inbox. Enter a result, mark ready, then release it. Note: before release, the student must NOT see the result. That is the whole point of the release step, so verify it.
5. **Student checks.** Log back in as student. Open Tests. The result should now be visible with the release note. Open the bell icon. There should be an alert about the result.
6. **Pharmacy dispenses.** Log in as pharmacy. Open Pharmacy. The Paracetamol prescription should be waiting with the stock count shown. Dispense it. Open Visits as the student and confirm the medicine shows there.
7. **Reports.** As the student, open Reports. The doctor's summary should be readable.
8. **Emergency.** Log out completely. Open Emergency. File a request without logging in. Log in as receptionist, open emergency requests, acknowledge it, then resolve it.
9. **Extras.** As student: answer the health questionnaire, open pregnancy care, search a specialist. As receptionist: book a future visit for the student and print the ticket. As admin: open Staff, change nothing yet, just confirm all seven accounts show with correct roles. Open the audit log and confirm today's actions appear there.

## What good looks like, and what to report

Good means every step above works with plain messages, no blank screens, no technical error text, and buttons that respond on the first tap. Specifically watch for these:

* A taken time slot can never book twice, even if two people tap at once.
* The same patient cannot check in twice on the same day.
* An unreleased test result is invisible to the student. If you ever see a result before release, that is a critical bug. Report it immediately.
* Dispensing reduces stock by exactly the prescribed quantity, never below zero.
* Cancel uses a confirmation. Reschedule picks a new slot and returns a new reference.
* Anything that fails shows a clear message plus a way forward (try again, go back, book again). A blank list with no explanation is a bug.
* On your phone, nothing should scroll sideways. Every button should be tappable without zooming.

## How to report a bug

For each bug send four things: what you tapped, what you expected, what happened instead, and a screenshot or screen recording. Include your role and the reference or ticket number if one exists. One bug per message so nothing gets lost.

## Two rules for the whole team

1. These are shared test accounts. Do not change passwords, roles, or emails. If you need a different scenario, say so in the group first.
2. Test with the roles you were given. An admin testing the student flow will see different screens than a student, and that is by design, not a bug.

That is everything. Start from step 1 and work down. If the full loop passes clean, the product is ready for a real clinic day.
