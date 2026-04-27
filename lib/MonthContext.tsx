'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { monthKey } from '@/types'

interface MonthContextType {
  month: string
  setMonth: (mk: string) => void
}

const MonthContext = createContext<MonthContextType>({
  month: monthKey(new Date()),
  setMonth: () => {},
})

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [month, setMonthState] = useState(monthKey(new Date()))

  useEffect(() => {
    const saved = sessionStorage.getItem('currentMonth')
    if (saved) setMonthState(saved)
  }, [])

  const setMonth = (mk: string) => {
    setMonthState(mk)
    sessionStorage.setItem('currentMonth', mk)
  }

  return (
    <MonthContext.Provider value={{ month, setMonth }}>
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  return useContext(MonthContext)
}
