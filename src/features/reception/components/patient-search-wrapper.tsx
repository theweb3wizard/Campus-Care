'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PatientSearch } from './patient-search';
import { CheckInPanel } from './check-in-panel';
import type { StudentSearchResult } from '@/features/reception/actions';

/**
 * Orchestrates the search → select → check-in flow on the search page.
 */
export function PatientSearchWrapper() {
  const router = useRouter();
  const [selected, setSelected] = React.useState<StudentSearchResult | null>(null);

  if (selected) {
    return (
      <CheckInPanel
        result={selected}
        onReset={() => setSelected(null)}
      />
    );
  }

  return (
    <PatientSearch onSelect={(result) => setSelected(result)} />
  );
}
