// Fixed 7 questions — short, skippable, plain words. No 'use server' here
// so both server actions and pages can import it.
export const QUESTIONS = [
  { key: 'fever', label: 'Do you have fever now?' },
  { key: 'pain', label: 'Where is the pain? (or type "none")' },
  { key: 'days', label: 'How many days have you felt sick?' },
  { key: 'meds', label: 'Drugs you already took for this?' },
  { key: 'allergies', label: 'Any drug allergies we should know?' },
  { key: 'chronic', label: 'Any ongoing illness (e.g. asthma, ulcer)?' },
  { key: 'other', label: 'Anything else the doctor should know?' },
] as const;
