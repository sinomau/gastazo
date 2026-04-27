import { createClient } from '@/lib/supabase'

export interface CoupleInfo {
  couple_id: string
  invite_code: string
  my_person: 'A' | 'B'
  partner_name: string
}

export async function getMyCoupleInfo(): Promise<CoupleInfo | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: authUser } = await supabase
    .from('authorized_users')
    .select('couple_id, person, name')
    .eq('email', user.email)
    .single()

  if (!authUser?.couple_id) return null

  const { data: couple } = await supabase
    .from('couples')
    .select('invite_code')
    .eq('id', authUser.couple_id)
    .single()

  const { data: partner } = await supabase
    .from('authorized_users')
    .select('name')
    .eq('couple_id', authUser.couple_id)
    .neq('email', user.email)
    .single()

  return {
    couple_id: authUser.couple_id,
    invite_code: couple?.invite_code || '',
    my_person: authUser.person as 'A' | 'B',
    partner_name: partner?.name || '',
  }
}
