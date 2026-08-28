'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Lock, Users, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'

interface Member {
  membershipId: string
  userId: string
  email: string
  name: string | null
  role: 'owner' | 'admin' | 'member'
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' }

export default function OrganizationSettingsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [orgName, setOrgName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>('member')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)

  const isAdmin = role === 'owner' || role === 'admin'

  const load = async () => {
    const response = await fetch('/api/organization')
    if (response.ok) {
      const data = await response.json()
      setOrgName(data.organization.name)
      setNameDraft(data.organization.name)
      setRole(data.role)
      setMembers(data.members)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status !== 'loading') setLoading(false)
      return
    }
    load().finally(() => setLoading(false))
  }, [status])

  const handleSaveName = async () => {
    if (!nameDraft.trim()) return
    const response = await fetch('/api/organization', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameDraft.trim() }),
    })
    if (response.ok) {
      setOrgName(nameDraft.trim())
      setEditingName(false)
      toast.success('Organization renamed')
    } else {
      const data = await response.json()
      toast.error(data.error || 'Failed to rename organization')
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Enter an email address')
      return
    }
    setInviting(true)
    try {
      const response = await fetch('/api/organization/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to add member')
        return
      }
      toast.success(`Added ${data.email}`)
      setInviteEmail('')
      await load()
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    const response = await fetch(`/api/organization/members/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (response.ok) {
      await load()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Failed to update role')
    }
  }

  const handleRemove = async (membershipId: string, label: string) => {
    if (!confirm(`Remove ${label} from this organization?`)) return
    const response = await fetch(`/api/organization/members/${membershipId}`, { method: 'DELETE' })
    if (response.ok) {
      toast.success('Member removed')
      await load()
    } else {
      const data = await response.json()
      toast.error(data.error || 'Failed to remove member')
    }
  }

  if (status !== 'loading' && status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
        <div className="text-center bg-white border border-secondary-200 rounded-2xl shadow-xl p-10 max-w-md">
          <div className="w-14 h-14 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-secondary-400" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Sign in to manage your organization</h1>
          <Link href="/login" className="btn-primary inline-flex">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white border-b border-secondary-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={() => router.push('/')} className="text-primary-600 hover:text-primary-700 text-sm mb-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-secondary-900">Organization</h1>
          <p className="text-secondary-600 text-sm mt-1">
            Scans, billing, and API keys are shared across everyone in your organization.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="card animate-pulse h-32" />
        ) : (
          <>
            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-3">Name</h2>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    className="form-input flex-1"
                  />
                  <button onClick={handleSaveName} className="p-2 text-green-600 hover:text-green-700" aria-label="Save name">
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameDraft(orgName) }}
                    className="p-2 text-secondary-400 hover:text-secondary-600"
                    aria-label="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-secondary-900">{orgName}</span>
                  {isAdmin && (
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-secondary-400 hover:text-secondary-600"
                      aria-label="Rename organization"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Members
              </h2>
              <div className="divide-y divide-secondary-100 mb-4">
                {members.map(member => (
                  <div key={member.membershipId} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-secondary-900">{member.name || member.email}</div>
                      <div className="text-xs text-secondary-500">{member.email}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isAdmin && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.membershipId, e.target.value)}
                          className="text-sm border border-secondary-200 rounded-md px-2 py-1"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span className="text-xs bg-secondary-100 text-secondary-700 px-2 py-1 rounded">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleRemove(member.membershipId, member.name || member.email)}
                          className="p-1.5 text-secondary-400 hover:text-red-600"
                          aria-label={`Remove ${member.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="border-t border-secondary-100 pt-4">
                  <p className="text-sm text-secondary-600 mb-2">
                    Add someone who already has an Accessibility Navigator account:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      className="form-input flex-1"
                      disabled={inviting}
                    />
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
                      className="form-input w-32"
                      disabled={inviting}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={handleInvite} disabled={inviting} className="btn-primary flex items-center gap-2 px-5">
                      {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
