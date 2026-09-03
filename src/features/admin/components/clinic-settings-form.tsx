'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/feedback/toast';
import { SETTING_KEYS } from '@/lib/constants';
import type { ClinicSetting } from '@/types/database';

interface Props {
  settings: ClinicSetting[];
}

const SETTING_LABELS: Record<string, { label: string; hint?: string; type?: string }> = {
  [SETTING_KEYS.CLINIC_NAME]:          { label: 'Clinic name' },
  [SETTING_KEYS.CLINIC_PHONE]:         { label: 'Clinic phone number', type: 'tel' },
  [SETTING_KEYS.CLINIC_EMAIL]:         { label: 'Clinic email', type: 'email' },
  [SETTING_KEYS.WORKING_HOURS_START]:  { label: 'Opening time', hint: 'Format: HH:MM (24-hour)', type: 'time' },
  [SETTING_KEYS.WORKING_HOURS_END]:    { label: 'Closing time', hint: 'Format: HH:MM (24-hour)', type: 'time' },
  [SETTING_KEYS.LOW_STOCK_THRESHOLD]:  { label: 'Low stock threshold', hint: 'Alert when stock falls below this number', type: 'number' },
  [SETTING_KEYS.MAX_DAILY_QUEUE]:      { label: 'Max daily queue entries', type: 'number' },
};

export function ClinicSettingsForm({ settings }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  // Build form state from settings array
  const initialValues = React.useMemo(() => {
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    return map;
  }, [settings]);

  const [values, setValues] = React.useState<Record<string, string>>(initialValues);
  const [saving, setSaving] = React.useState(false);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const updates = Object.entries(values).map(([key, value]) =>
      supabase
        .from('clinic_settings')
        .update({ value })
        .eq('key', key)
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      toastError('Save failed', 'Some settings could not be saved. Please try again.');
    } else {
      success('Settings saved', 'Clinic settings have been updated.');
      router.refresh();
    }
    setSaving(false);
  };

  const displayedKeys = Object.keys(SETTING_LABELS).filter(
    (k) => k in values
  );

  return (
    <div className="space-y-5">
      {displayedKeys.map((key) => {
        const meta = SETTING_LABELS[key];
        return (
          <Input
            key={key}
            label={meta.label}
            type={meta.type ?? 'text'}
            hint={meta.hint}
            value={values[key] ?? ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
      })}

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
        >
          Save settings
        </Button>
      </div>
    </div>
  );
}
