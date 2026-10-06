'use client';

import { useRouter } from 'next/navigation';
import { CheckInPanel } from './check-in-panel';
import type { StudentSearchResult } from '@/features/reception/actions';

export function CheckInPreloaded({ result }: { result: StudentSearchResult }) {
  const router = useRouter();
  return (
    <CheckInPanel result={result} onReset={() => router.push('/reception/check-in')} />
  );
}
