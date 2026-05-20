import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for Server Components to read session
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — no auth needed
  if (
    pathname.startsWith('/confirm') ||
    pathname.startsWith('/api/confirm') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/internal') ||
    pathname === '/' ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')
  ) {
    return supabaseResponse
  }

  // Login page — redirect authenticated users to their app
  if (pathname.startsWith('/login')) {
    if (user) {
      const role = user.app_metadata?.role
      const dest = role === 'admin' ? '/admin/dashboard' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return supabaseResponse
  }

  // Protected routes — require auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = user.app_metadata?.role

  // /admin/* e /api/admin/* — requires role: admin
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
    role !== 'admin'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // /dashboard/* e /api/client/* — requires role: client
  if (
    (pathname.startsWith('/dashboard') || pathname.startsWith('/api/client')) &&
    role !== 'client'
  ) {
    // #region agent log
    fetch('http://127.0.0.1:7660/ingest/a833038d-db57-4c00-9a96-46f6ae8a7a6e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'facf8e' }, body: JSON.stringify({ sessionId: 'facf8e', runId: 'pre-fix', hypothesisId: 'E', location: 'proxy.ts:client-route-wrong-role', message: 'dashboard or api/client blocked', data: { pathname, role: role ?? null }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  if (pathname.startsWith('/dashboard')) {
    // #region agent log
    fetch('http://127.0.0.1:7660/ingest/a833038d-db57-4c00-9a96-46f6ae8a7a6e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'facf8e' }, body: JSON.stringify({ sessionId: 'facf8e', runId: 'pre-fix', hypothesisId: 'E', location: 'proxy.ts:dashboard-ok', message: 'dashboard request allowed', data: { pathname }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
