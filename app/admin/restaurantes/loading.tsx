import { TableSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ width: '160px', height: '24px', borderRadius: '6px', background: 'var(--bg-muted)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '120px', height: '14px', borderRadius: '6px', background: 'var(--bg-muted)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
      </div>
      <TableSkeleton rows={8} cols={4} />
    </div>
  )
}
