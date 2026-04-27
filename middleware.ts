import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const { data: authUser } = await supabase
      .from('authorized_users')
      .select('couple_id')
      .eq('email', user.email)
      .single()

    // No couple yet → onboarding
    if (!authUser?.couple_id) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // Protect onboarding — must be logged in
  if (request.nextUrl.pathname.startsWith('/onboarding')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users with couple away from login
  if (request.nextUrl.pathname === '/login' && user) {
    const { data: authUser } = await supabase
      .from('authorized_users')
      .select('couple_id')
      .eq('email', user.email)
      .single()

    if (authUser?.couple_id) return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/onboarding'],
}
