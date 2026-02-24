/**
 * T024: Role selector component — 'use client' dropdown.
 * Only exposes SUBMITTER and ADMIN options (never SUPERADMIN per FR-017).
 */
'use client'

import { useState, useTransition } from 'react'
import { updateUserRole } from '@/lib/actions/update-user-role'

type AllowedRole = 'SUBMITTER' | 'ADMIN'

interface RoleSelectorProps {
  userId: string
  currentRole: string
}

const ROLE_LABELS: Record<AllowedRole, string> = {
  SUBMITTER: 'Submitter',
  ADMIN: 'Admin',
}

export function RoleSelector({ userId, currentRole }: RoleSelectorProps) {
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<AllowedRole>(
    currentRole === 'ADMIN' ? 'ADMIN' : 'SUBMITTER'
  )
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as AllowedRole
    setSelectedRole(newRole)
    setError(null)

    startTransition(async () => {
      const result = await updateUserRole(userId, newRole)
      if (result?.error) {
        setError(result.error)
        // Revert on error
        setSelectedRole(currentRole === 'ADMIN' ? 'ADMIN' : 'SUBMITTER')
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={selectedRole}
        onChange={handleChange}
        disabled={isPending}
        aria-label="Change user role"
        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {(Object.entries(ROLE_LABELS) as [AllowedRole, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-gray-400">Saving…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
