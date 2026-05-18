import { TableSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      <div style={{ width: '140px', height: '13px', borderRadius: '6px', background: 'var(--bg-muted)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
      <TableSkeleton rows={10} cols={6} />
    </div>
  )
}
