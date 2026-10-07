/** Static skeleton rows matching each list page. Use in Suspense fallbacks with aria-busy. */

function Bar({ className }: { className: string }) {
  return <div aria-hidden className={`rounded-md bg-[var(--border)] ${className}`} />;
}

function Card({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex flex-col gap-4">
      {children}
    </div>
  );
}

function Row({ buttons = 0 }: { buttons?: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <Bar className="h-5 w-2/3" />
      <Bar className="mt-2 h-4 w-1/2" />
      {buttons > 0 ? (
        <div className="mt-3 flex gap-2">
          {Array.from({ length: buttons }).map((_, i) => (
            <Bar key={i} className="h-11 w-24 rounded-[10px]" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function VisitsSkeleton() {
  return (
    <Card label="Loading visits">
      <Row buttons={2} />
      <Row buttons={2} />
      <Row buttons={2} />
    </Card>
  );
}

export function TestsSkeleton() {
  return (
    <Card label="Loading tests">
      <Row />
      <Row />
      <Row />
    </Card>
  );
}

export function InboxSkeleton() {
  return (
    <Card label="Loading">
      <Row buttons={3} />
      <Row buttons={3} />
    </Card>
  );
}

export function NoticesSkeleton() {
  return (
    <Card label="Loading alerts">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><Bar className="h-5 w-3/4" /></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><Bar className="h-5 w-2/3" /></div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><Bar className="h-5 w-1/2" /></div>
    </Card>
  );
}

export function SlotsSkeleton() {
  return (
    <Card label="Loading slots">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bar key={i} className="h-12 rounded-[10px]" />
        ))}
      </div>
    </Card>
  );
}
