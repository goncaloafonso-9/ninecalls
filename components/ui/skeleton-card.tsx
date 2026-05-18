export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--card-padding)',
        minHeight: '120px',
      }}
    >
      {/* Label skeleton */}
      <div className="skeleton" style={{ width: '80px', height: '10px', marginBottom: '16px' }} />
      {/* Value skeleton */}
      <div className="skeleton" style={{ width: '120px', height: '36px', marginBottom: '12px' }} />
      {/* Delta skeleton */}
      <div className="skeleton" style={{ width: '100px', height: '10px' }} />
    </div>
  )
}
