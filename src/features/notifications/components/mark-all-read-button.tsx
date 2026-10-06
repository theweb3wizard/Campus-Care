'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function MarkAllReadButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('profile_id', user.id)
        .eq('is_read', false);
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" loading={loading} onClick={handleClick}>
      Mark all read
    </Button>
  );
}
