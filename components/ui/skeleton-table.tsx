interface SkeletonTableProps {
  rows?: number
  cols?: number
}

export function SkeletonTable({ rows = 5, cols = 6 }: SkeletonTableProps) {
  return (
    <div
      style={{
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
        background: 'var(--surface-1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '16px',
          padding: '10px 16px',
          background: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--surface-border)',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '10px', width: i === 0 ? '70%' : '50%' }} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '16px',
            padding: '14px 16px',
            borderBottom: rowIdx < rows - 1 ? '1px solid var(--surface-border)' : 'none',
          }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="skeleton"
              style={{ height: '14px', width: colIdx === 0 ? '80%' : colIdx === 1 ? '60%' : '45%' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
