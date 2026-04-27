import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('=== AUTH CALLBACK ===')
  console.log('URL:', request.url)
  console.log('Origin:', origin)
  console.log('Code:', code ? 'presente' : 'ausente')
  console.log('Error:', error, errorDescription)

  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${error}`)
  }

  if (code) {
    // ✅ Usa await aquí
    const supabase = await createServerSupabaseClient()
    const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (!authError && data.user) {
      const email = data.user.email
      const googleName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        email

      // Buscar usuario en la tabla
      const { data: authUser } = await supabase
        .from('authorized_users')
        .select('email, person, couple_id, name')
        .eq('email', email)
        .single()

      if (!authUser || !authUser.couple_id) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Actualizar nombre si está vacío
      if (!authUser.name || authUser.name === email) {
        await supabase
          .from('authorized_users')
          .update({ name: googleName })
          .eq('email', email)

        const configKey = authUser.person === 'A' ? 'name_a' : 'name_b'
        await supabase
          .from('config')
          .update({ value: googleName })
          .eq('key', configKey)
          .eq('couple_id', authUser.couple_id)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
