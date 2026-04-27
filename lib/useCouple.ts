'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function useCouple() {
  const supabase = createClient()
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [myPerson, setMyPerson] = useState<'A' | 'B'>('A')
  const [soloMode, setSoloMode] = useState(false)
  const [partnerJoined, setPartnerJoined] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: au } = await supabase
        .from('authorized_users')
        .select('couple_id, person')
        .eq('email', data.user.email)
        .single()
      if (!au?.couple_id) { setReady(true); return }

      setCoupleId(au.couple_id)
      setMyPerson(au.person as 'A' | 'B')

      const [{ data: couple }, { data: members }] = await Promise.all([
        supabase.from('couples').select('solo_mode, invite_code').eq('id', au.couple_id).single(),
        supabase.from('authorized_users').select('email').eq('couple_id', au.couple_id),
      ])

      setSoloMode(couple?.solo_mode || false)
      setInviteCode(couple?.invite_code || '')
      setPartnerJoined((members?.length || 0) >= 2)
      setReady(true)
    })
  }, [])

  return { coupleId, myPerson, soloMode, partnerJoined, inviteCode, ready }
}
