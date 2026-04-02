'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  UserPlus, Search, Trash2, Loader2,
  Phone, Cake, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'
import type { Customer } from '@/lib/types'

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

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

function formatBirthDate(date: string) {
  try {
    return format(new Date(date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })
  } catch {
    return date
  }
}

function getAge(date: string) {
  try {
    const birth = new Date(date + 'T12:00:00')
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  } catch {
    return null
  }
}

function isBirthdayToday(date: string) {
  try {
    const birth = new Date(date + 'T12:00:00')
    const today = new Date()
    return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate()
  } catch {
    return false
  }
}

function isBirthdayThisMonth(date: string) {
  try {
    const birth = new Date(date + 'T12:00:00')
    return birth.getMonth() === new Date().getMonth()
  } catch {
    return false
  }
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'birthday_month'>('all')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Customer[]>('/api/customers')
      setCustomers(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const filtered = useMemo(() => {
    let list = customers
    if (filter === 'birthday_month') {
      list = list.filter(c => isBirthdayThisMonth(c.birth_date))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q.replace(/\D/g, ''))
      )
    }
    return list
  }, [customers, filter, search])

  const birthdayCount = useMemo(
    () => customers.filter(c => isBirthdayThisMonth(c.birth_date)).length,
    [customers]
  )

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente?')) return
    try {
      await api(`/api/customers/${id}`, { method: 'DELETE' })
      toast.success('Cliente excluído')
      fetchCustomers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Clientes cadastrados via IZA (tablet)"
        action={
          <Badge variant="default" className="text-sm px-3 py-1.5">
            {customers.length} cadastrados
          </Badge>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-gold-400 text-brand-900'
                : 'bg-surface-3 text-text-secondary hover:text-text-primary'
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('birthday_month')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'birthday_month'
                ? 'bg-gold-400 text-brand-900'
                : 'bg-surface-3 text-text-secondary hover:text-text-primary'
            )}
          >
            Aniversariantes do mês {birthdayCount > 0 && `(${birthdayCount})`}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Nenhum cliente encontrado"
          description={
            customers.length > 0
              ? 'Tente alterar os filtros de busca'
              : 'Os clientes se cadastram pelo tablet usando a IZA'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(customer => {
            const age = getAge(customer.birth_date)
            const birthday = isBirthdayToday(customer.birth_date)

            return (
              <Card
                key={customer.id}
                className={cn(
                  'flex flex-col gap-2.5 !p-4',
                  birthday && 'ring-2 ring-gold-400/50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text-primary truncate">
                        {customer.name}
                      </h3>
                      {birthday && (
                        <span className="text-base" title="Aniversariante de hoje!">
                          🎂
                        </span>
                      )}
                    </div>
                    {age !== null && (
                      <p className="text-xs text-text-secondary mt-0.5">{age} anos</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-1.5 text-xs text-gold-400 hover:underline"
                  >
                    <Phone size={13} className="shrink-0" />
                    {formatPhone(customer.phone)}
                  </a>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Cake size={13} className="shrink-0" />
                    {formatBirthDate(customer.birth_date)}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-1 border-t border-border">
                  <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <Calendar size={11} />
                    {format(new Date(customer.created_at), 'dd/MM/yyyy')}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
                    <Trash2 size={15} className="text-red-400" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
