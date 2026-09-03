'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserCheck, UserX, Loader2, ChevronRight } from 'lucide-react';
import { searchStudents, type StudentSearchResult } from '@/features/reception/actions';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';
import { formatQueueNumber } from '@/lib/utils';
import {
  CLINIC_REGISTRATION_STATUS_LABELS,
  CLINIC_REGISTRATION_STATUS_COLORS,
  VISIT_STATUS_LABELS,
  VISIT_STATUS_COLORS,
} from '@/lib/constants';
import type { ClinicRegistrationStatus, VisitStatus } from '@/types/database';

interface Props {
  onSelect?: (result: StudentSearchResult) => void;
}

export function PatientSearch({ onSelect }: Props) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<StudentSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = React.useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const data = await searchStudents(value.trim());
    setResults(data);
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 350);
  };

  const handleSelect = (result: StudentSearchResult) => {
    if (onSelect) {
      onSelect(result);
    } else {
      router.push(`/reception/check-in?student=${result.student.id}`);
    }
  };

  return (
    <div className="w-full">
      <Input
        type="search"
        placeholder="Search by name, registration number, or email…"
        value={query}
        onChange={handleChange}
        autoComplete="off"
        leftElement={
          loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Search className="h-4 w-4" />
        }
        className="text-base"
      />

      {/* Results */}
      {searched && !loading && (
        <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-panel">
          {results.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-5 text-slate-500">
              <UserX className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">No students found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Check the registration number or name and try again.
                </p>
              </div>
            </div>
          ) : (
            <ul role="listbox" className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <li key={result.student.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left group"
                  >
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
                      {result.student.full_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">
                          {result.student.full_name}
                        </p>
                        <code className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {result.student.registration_number}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">
                          {result.student.department ?? 'No department'}
                        </span>

                        {result.clinic_profile ? (
                          <>
                            <span className="text-slate-200">·</span>
                            <code className="text-xs text-slate-500 font-mono">
                              {result.clinic_profile.file_number}
                            </code>
                            <span className="text-slate-200">·</span>
                            <StatusBadge
                              label={CLINIC_REGISTRATION_STATUS_LABELS[result.clinic_profile.registration_status as ClinicRegistrationStatus]}
                              colorClass={CLINIC_REGISTRATION_STATUS_COLORS[result.clinic_profile.registration_status as ClinicRegistrationStatus]}
                              dot={false}
                            />
                          </>
                        ) : (
                          <>
                            <span className="text-slate-200">·</span>
                            <span className="text-xs text-amber-600 font-medium">
                              Not registered
                            </span>
                          </>
                        )}

                        {result.active_visit && (
                          <>
                            <span className="text-slate-200">·</span>
                            <StatusBadge
                              label={VISIT_STATUS_LABELS[result.active_visit.status as VisitStatus]}
                              colorClass={VISIT_STATUS_COLORS[result.active_visit.status as VisitStatus]}
                              dot={false}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
