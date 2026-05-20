import { appendFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

type AgentLogEntry = {
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
  runId?: string
}

function logFileCandidates(): string[] {
  const paths: string[] = []
  try {
    const libDir = dirname(fileURLToPath(import.meta.url))
    paths.push(join(libDir, '..', '..', 'debug-facf8e.log'))
    paths.push(join(libDir, '..', 'debug-facf8e.log'))
  } catch {
    /* import.meta.url unavailable */
  }
  paths.push(join(process.cwd(), 'debug-facf8e.log'))
  paths.push(join(process.cwd(), '..', 'debug-facf8e.log'))
  paths.push(join(process.cwd(), '..', '..', 'debug-facf8e.log'))
  return [...new Set(paths)]
}

/** Debug NDJSON: HTTP ingest (if up) + append to workspace log (resolved from this file + cwd fallbacks). */
export async function agentDebugLog(entry: AgentLogEntry): Promise<void> {
  const payload = {
    sessionId: 'facf8e',
    runId: entry.runId ?? 'pre-fix',
    hypothesisId: entry.hypothesisId,
    location: entry.location,
    message: entry.message,
    data: entry.data,
    timestamp: Date.now(),
  }
  void fetch('http://127.0.0.1:7660/ingest/a833038d-db57-4c00-9a96-46f6ae8a7a6e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'facf8e' },
    body: JSON.stringify(payload),
  }).catch(() => {})

  const line = `${JSON.stringify(payload)}\n`
  const tried = logFileCandidates()
  for (const filePath of tried) {
    try {
      await appendFile(filePath, line)
      return
    } catch {
      /* try next */
    }
  }
  console.error('[agentDebugLog] failed to append; tried:', tried)
}
