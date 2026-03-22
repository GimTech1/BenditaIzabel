'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Shield, UserCog, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile, Department, UserRole } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  employee: 'Colaborador',
}

const ROLE_BADGE: Record<UserRole, 'info' | 'warning' | 'default'> = {
  admin: 'info',
  gerente: 'warning',
  employee: 'default',
}

const AVATAR_COLORS = [
  'bg-brand-500',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-rose-600',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function EquipePage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [editModal, setEditModal] = useState(false)
  const [editMember, setEditMember] = useState<Profile | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('employee')
  const [editDepartment, setEditDepartment] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    try {
      const [membersData, depsData] = await Promise.all([
        api<Profile[]>('/api/equipe'),
        api<Department[]>('/api/equipe/departments'),
      ])
      setMembers(membersData)
      setDepartments(depsData)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const current = membersData.find(m => m.id === user.id)
        setCurrentUser(current || null)
      }
    } catch {
      toast.error('Erro ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  useEffect(() => { loadData() }, [loadData])

  function openEdit(member: Profile) {
    setEditMember(member)
    setEditRole(member.role)
    setEditDepartment(member.department_id || '')
    setEditModal(true)
  }

  async function saveEdit() {
    if (!editMember) return
    setSaving(true)
    try {
      const updated = await api<Profile>('/api/equipe', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editMember.id,
          role: editRole,
          department_id: editDepartment || null,
        }),
      })
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
      setEditModal(false)
      toast.success('Membro atualizado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  const isAdmin = currentUser?.role === 'admin'
  const totalAdmins = members.filter(m => m.role === 'admin').length
  const totalGerentes = members.filter(m => m.role === 'gerente').length

  function getDepartmentName(id: string | null) {
    if (!id) return '—'
    return departments.find(d => d.id === id)?.name || '—'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Gerencie os membros da equipe"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-brand-500/10 p-2.5">
            <Users size={20} className="text-brand-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{members.length}</p>
            <p className="text-xs text-text-muted">Total de membros</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-blue-500/10 p-2.5">
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{totalAdmins}</p>
            <p className="text-xs text-text-muted">Admins</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-yellow-500/10 p-2.5">
            <UserCog size={20} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{totalGerentes}</p>
            <p className="text-xs text-text-muted">Gerentes</p>
          </div>
        </Card>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 transition-colors"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro encontrado"
          description={search ? 'Tente outro termo de busca' : 'Nenhum membro na equipe'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0',
                  getAvatarColor(member.full_name)
                )}>
                  {member.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {member.full_name}
                  </p>
                  <p className="text-xs text-text-muted truncate">{member.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={ROLE_BADGE[member.role]}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-1.5">
                    {getDepartmentName(member.department_id)}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(member)}
                    className="w-full"
                  >
                    <UserCog size={14} /> Editar cargo
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title={`Editar — ${editMember?.full_name}`}
      >
        <div className="space-y-4">
          <Select
            label="Cargo"
            id="edit-role"
            value={editRole}
            onChange={e => setEditRole(e.target.value as UserRole)}
            options={[
              { value: 'employee', label: 'Colaborador' },
              { value: 'gerente', label: 'Gerente' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <Select
            label="Departamento"
            id="edit-department"
            value={editDepartment}
            onChange={e => setEditDepartment(e.target.value)}
            options={[
              { value: '', label: 'Nenhum' },
              ...departments.map(d => ({ value: d.id, label: d.name })),
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setEditModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={saveEdit}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
