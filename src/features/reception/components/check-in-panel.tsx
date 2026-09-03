'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck, ClipboardList, AlertCircle,
  CheckCircle2, ArrowRight, Edit2
} from 'lucide-react';
import { walkInCheckIn, type StudentSearchResult, type CheckInResult } from '@/features/reception/actions';
import { ClinicRegistrationForm } from './clinic-registration-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/feedback/toast';
import { formatQueueNumber, formatTime } from '@/lib/utils';
import {
  CLINIC_REGISTRATION_STATUS_LABELS,
  CLINIC_REGISTRATION_STATUS_COLORS,
  VISIT_STATUS_LABELS,
  VISIT_STATUS_COLORS,
} from '@/lib/constants';
import type { ClinicRegistrationStatus, VisitStatus, ClinicProfile } from '@/types/database';

interface Props {
  result: StudentSearchResult;
  onReset: () => void;
}

export function CheckInPanel({ result, onReset }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [checkingIn, setCheckingIn] = React.useState(false);
  const [checkedIn, setCheckedIn] = React.useState<CheckInResult | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = React.useState(false);
  const [clinicProfile, setClinicProfile] = React.useState(result.clinic_profile);

  const { student, active_visit } = result;
  const hasClinicProfile = !!clinicProfile;
  const alreadyCheckedIn = !!active_visit;

  const handleCheckIn = async () => {
    if (!clinicProfile) {
      toastError(
        'Clinic profile required',
        'Please complete the student\'s clinic registration before checking in.'
      );
      setShowRegistrationModal(true);
      return;
    }

    setCheckingIn(true);
    const res = await walkInCheckIn(student.id, clinicProfile.id);
    setCheckingIn(false);

    if (!res.success || !res.data) {
      toastError('Check-in failed', res.error ?? 'Please try again.');
      return;
    }

    setCheckedIn(res.data);
    success(
      `Checked in — Queue ${formatQueueNumber(res.data.queue_number)}`,
      `${student.full_name} is now in the queue.`
    );
    router.refresh();
  };

  const handleRegistrationSuccess = (profile: ClinicProfile) => {
    setClinicProfile(profile);
    setShowRegistrationModal(false);
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (checkedIn) {
    return (
      <Card className="text-center py-6">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 mb-4 mx-auto">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Check-in complete
        </h2>
        <p className="text-sm text-slate-500 mb-1">{student.full_name}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl mt-3 mb-6">
          <span className="text-xs text-amber-600 font-medium">Queue number</span>
          <span className="text-2xl font-bold text-amber-700 font-mono">
            {formatQueueNumber(checkedIn.queue_number)}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button variant="outline" onClick={onReset}>
            Check in another patient
          </Button>
          <Button
            variant="primary"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={() => router.push('/reception/queue')}
          >
            View queue
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Student identity card */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Patient
            </h2>
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-blue-600 hover:underline"
            >
              Change
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
              {student.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{student.full_name}</p>
              <code className="text-xs text-slate-500 font-mono">
                {student.registration_number}
              </code>
              {student.department && (
                <p className="text-xs text-slate-400 mt-0.5">{student.department}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Clinic profile card */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Clinic Registration
            </h2>
            <button
              type="button"
              onClick={() => setShowRegistrationModal(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Edit2 className="h-3 w-3" />
              {hasClinicProfile ? 'Edit' : 'Register'}
            </button>
          </div>

          {hasClinicProfile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">File number</span>
                <code className="text-sm font-semibold text-slate-800 font-mono">
                  {clinicProfile!.file_number}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Status</span>
                <StatusBadge
                  label={CLINIC_REGISTRATION_STATUS_LABELS[clinicProfile!.registration_status as ClinicRegistrationStatus]}
                  colorClass={CLINIC_REGISTRATION_STATUS_COLORS[clinicProfile!.registration_status as ClinicRegistrationStatus]}
                />
              </div>
              {clinicProfile!.blood_group && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Blood group</span>
                  <span className="text-sm font-medium text-slate-700">
                    {clinicProfile!.blood_group}
                  </span>
                </div>
              )}
              {clinicProfile!.genotype && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Genotype</span>
                  <span className="text-sm font-medium text-slate-700">
                    {clinicProfile!.genotype}
                  </span>
                </div>
              )}
              {clinicProfile!.allergies && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Allergies</span>
                  <span className="text-sm text-rose-600">{clinicProfile!.allergies}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Not registered
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  This student doesn&apos;t have a clinic profile yet. Register them before checking in.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Active visit warning */}
        {alreadyCheckedIn && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <ClipboardList className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Already checked in today
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                This patient has an active visit.{' '}
                <StatusBadge
                  label={VISIT_STATUS_LABELS[active_visit!.status as VisitStatus]}
                  colorClass={VISIT_STATUS_COLORS[active_visit!.status as VisitStatus]}
                  dot={false}
                />
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Checked in at {formatTime(active_visit!.check_in_time)}
              </p>
            </div>
          </div>
        )}

        {/* Check-in action */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          leftIcon={<UserCheck className="h-5 w-5" />}
          loading={checkingIn}
          disabled={alreadyCheckedIn || !hasClinicProfile}
          onClick={handleCheckIn}
        >
          {alreadyCheckedIn
            ? 'Already checked in today'
            : checkingIn
              ? 'Checking in…'
              : 'Check in & add to queue'}
        </Button>

        {!hasClinicProfile && !alreadyCheckedIn && (
          <p className="text-xs text-center text-slate-400">
            Complete clinic registration first, then check in.
          </p>
        )}
      </div>

      {/* Registration modal */}
      <Modal
        open={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        title={hasClinicProfile ? 'Update clinic registration' : 'New clinic registration'}
        description={`${student.full_name} — ${student.registration_number}`}
        size="md"
      >
        <ClinicRegistrationForm
          studentId={student.id}
          studentName={student.full_name}
          existing={clinicProfile}
          onSuccess={handleRegistrationSuccess}
          onCancel={() => setShowRegistrationModal(false)}
        />
      </Modal>
    </>
  );
}
