/** Every empty/success/failure state in one place. Plain verbs, one action each. */

export type StateKey =
  | "bookEmptyDoctors"
  | "expertsEmpty"
  | "slotTaken"
  | "booked"
  | "visitsEmpty"
  | "visitCancelled"
  | "testsEmpty"
  | "testNotReady"
  | "testWaitingReview"
  | "labEmpty"
  | "pharmacyEmpty"
  | "dispensed"
  | "reportsEmpty"
  | "pregnancyEmpty"
  | "emergencySent"
  | "emergencyOffline"
  | "loginWrongPassword"
  | "loginNoAccount"
  | "signupInUse"
  | "networkFail"
  | "questionnaireSent"
  | "notificationsEmpty"
  | "receptionNotFound"
  | "receptionBooked";

export const states: Record<StateKey, { headline: string; body: string; action: string }> = {
  bookEmptyDoctors: { headline: "No doctors available right now", body: "Try another clinic or check back later.", action: "Find a specialist" },
  expertsEmpty: { headline: "No specialists listed yet", body: "The clinic has not added doctors. Check back later.", action: "Book a visit" },
  slotTaken: { headline: "That time is now taken", body: "Pick another time to keep your place.", action: "Choose another time" },
  booked: { headline: "Booking received", body: "Show your ticket at the reception when you arrive.", action: "View ticket" },
  visitsEmpty: { headline: "No visits yet", body: "Book a visit when you need care.", action: "Book a visit" },
  visitCancelled: { headline: "This visit was cancelled", body: "Book again if you still need care.", action: "Book again" },
  testsEmpty: { headline: "No tests ordered yet", body: "Your doctor will order tests here when you need one.", action: "View visits" },
  testNotReady: { headline: "Result is not ready", body: "Check back later for an update.", action: "Refresh" },
  testWaitingReview: { headline: "Result waits for doctor review", body: "Your doctor will release it after review.", action: "View visit" },
  labEmpty: { headline: "Lab inbox is clear", body: "New test orders from doctors will show here.", action: "Refresh" },
  pharmacyEmpty: { headline: "No prescriptions waiting", body: "New prescriptions from doctors will show here.", action: "Refresh" },
  dispensed: { headline: "Medicines given out", body: "Record is saved. Call the next patient.", action: "Next patient" },
  reportsEmpty: { headline: "No reports yet", body: "Complete visits to build your health history here.", action: "Book a visit" },
  pregnancyEmpty: { headline: "No pregnancy record yet", body: "Add your details so the clinic can follow your care.", action: "Add pregnancy" },
  emergencySent: { headline: "Help is on the way", body: "Stay where you are and keep your phone close.", action: "View emergency info" },
  emergencyOffline: { headline: "Emergency did not send", body: "You are offline. Ask someone near you to call the clinic now.", action: "Try again" },
  loginWrongPassword: { headline: "Wrong password", body: "Check it and try again.", action: "Try again" },
  loginNoAccount: { headline: "We cannot find that account", body: "Check the email or create a new account.", action: "Create account" },
  signupInUse: { headline: "That email is already used", body: "Log in instead or use another email.", action: "Log in" },
  networkFail: { headline: "No connection", body: "Check your network and try again.", action: "Try again" },
  questionnaireSent: { headline: "Answers sent", body: "Your doctor will review them before your visit.", action: "Back to home" },
  notificationsEmpty: { headline: "No notifications yet", body: "We will tell you about bookings, results and visits here.", action: "Book a visit" },
  receptionNotFound: { headline: "No patient found", body: "Check the spelling or search with the registered phone number.", action: "Search again" },
  receptionBooked: { headline: "Patient booked and ticketed", body: "Give the ticket to the patient and direct them to wait.", action: "Book another patient" },
};
