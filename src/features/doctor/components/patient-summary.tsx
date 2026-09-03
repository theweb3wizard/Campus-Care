import * as React from 'react';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import {
  VISIT_STATUS_LABELS,
  VISIT_STATUS_COLORS,
  PRESCRIPTION_STATUS_LABELS,
  PRESCRIPTION_STATUS_COLORS,
} from '@/lib/constants';
import type { PatientVisitHistory } from '@/features/doctor/actions';
import type { VisitStatus, PrescriptionStatus } from '@/types/database';
import { AlertCircle, Clock } from 'lucide-react';

interface PatientInfo {
  full_name: string;
  registration_number: string;
  department: string | null;
  gender: string | null;
  date_of_birth: string | null;
  file_number: string;
  blood_group: string | null;
  genotype: string | null;
  allergies: string | null;
}

interface Props {
  patient: PatientInfo;
  history: PatientVisitHistory[];
}

export function PatientSummary({ patient, history }: Props) {
  const age = patient.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(patient.date_of_birth).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
    : null;

  return (
    <div className="space-y-4">
      {/* Identity */}
      <Card padding="sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 leading-tight">
              {patient.full_name}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {patient.registration_number}
            </p>
            {patient.department && (
              <p className="text-xs text-slate-400 mt-0.5">{patient.department}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <div>
            <p className="text-xs text-slate-400">File number</p>
            <p className="font-mono text-xs font-semibold text-slate-700 mt-0.5">
              {patient.file_number}
            </p>
          </div>
          {age !== null && (
            <div>
              <p className="text-xs text-slate-400">Age</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                {age} yrs · {patient.gender ?? '—'}
              </p>
            </div>
          )}
          {patient.blood_group && (
            <div>
              <p className="text-xs text-slate-400">Blood group</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">
                {patient.blood_group}
              </p>
            </div>
          )}
          {patient.genotype && (
            <div>
              <p className="text-xs text-slate-400">Genotype</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">
                {patient.genotype}
              </p>
            </div>
          )}
        </div>

        {patient.allergies && (
          <div className="mt-3 flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-700">Allergies</p>
              <p className="text-xs text-rose-600 mt-0.5">{patient.allergies}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Visit history */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Previous visits
        </p>
        {history.length === 0 ? (
          <Card padding="sm">
            <p className="text-xs text-slate-400 text-center py-2">
              No previous visits on record.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((v) => (
              <Card key={v.id} padding="sm" className="!p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">
                      {formatDate(v.visit_date)}
                    </p>
                    {v.medical_record?.complaint && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {v.medical_record.complaint}
                      </p>
                    )}
                    {v.medical_record?.diagnosis && (
                      <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                        Dx: {v.medical_record.diagnosis}
                      </p>
                    )}
                    {v.medical_record?.follow_up_date && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-blue-400" />
                        <p className="text-xs text-blue-600">
                          Follow-up {formatDate(v.medical_record.follow_up_date)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 space-y-1">
                    <StatusBadge
                      label={VISIT_STATUS_LABELS[v.status as VisitStatus]}
                      colorClass={VISIT_STATUS_COLORS[v.status as VisitStatus]}
                      dot={false}
                    />
                    {v.prescription && (
                      <StatusBadge
                        label={PRESCRIPTION_STATUS_LABELS[v.prescription.status as PrescriptionStatus]}
                        colorClass={PRESCRIPTION_STATUS_COLORS[v.prescription.status as PrescriptionStatus]}
                        dot={false}
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
