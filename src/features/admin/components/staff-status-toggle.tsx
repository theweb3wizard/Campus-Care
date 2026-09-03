'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toggleStaffStatus } from '@/features/admin/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/feedback/toast';

interface Props {
  profileId: string;
  currentStatus: string;
  fullName: string;
}

export function StaffStatusToggle({ profileId, currentStatus, fullName }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = React.useState(false);

  const isActive = currentStatus === 'active';

  const handleToggle = async () => {
    setLoading(true);
    const res = await toggleStaffStatus(profileId, currentStatus);
    setLoading(false);

    if (!res.success) {
      toastError('Update failed', res.error ?? 'Could not update status.');
      return;
    }

    success(
      isActive ? 'Account deactivated' : 'Account activated',
      `${fullName} has been ${isActive ? 'deactivated' : 'activated'}.`
    );
    router.refresh();
  };

  return (
    <Button
      variant={isActive ? 'ghost' : 'outline'}
      size="sm"
      loading={loading}
      className={isActive ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}
      onClick={handleToggle}
    >
      {isActive ? 'Deactivate' : 'Activate'}
    </Button>
  );
}
