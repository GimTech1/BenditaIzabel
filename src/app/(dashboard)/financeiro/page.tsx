'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, DollarSign, TrendingUp, TrendingDown, Wallet,
  Edit3, Trash2, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'
import type { FinanceEntry } from '@/lib/types'

const INCOME_CATEGORIES = ['Vendas', 'Eventos', 'Outros']
const EXPENSE_CATEGORIES = [
  'Fornecedores', 'Funcionários', 'Aluguel',
  'Contas (luz/água/gás)', 'Marketing', 'Manutenção', 'Impostos', 'Outros',
]

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

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

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function FinanceiroPage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(currentMonth)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FinanceEntry | null>(null)
  const [saving, setSaving] = useState(false)

  const [formDate, setFormDate] = useState('')
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<FinanceEntry[]>(`/api/financeiro?month=${month}`)
      setEntries(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const balance = income - expense

  function openNew() {
    setEditing(null)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormType('expense')
    setFormCategory('Fornecedores')
    setFormDescription('')
    setFormAmount('')
    setShowModal(true)
  }

  function openEdit(entry: FinanceEntry) {
    setEditing(entry)
    setFormDate(entry.date)
    setFormType(entry.type)
    setFormCategory(entry.category)
    setFormDescription(entry.description)
    setFormAmount(String(entry.amount))
    setShowModal(true)
  }

  async function handleSave() {
    const amount = parseFloat(formAmount)
    if (!formDate || !formCategory || !formDescription || isNaN(amount) || amount <= 0) {
      toast.error('Preencha todos os campos corretamente')
      return
    }
    setSaving(true)
    try {
      const payload = {
        date: formDate,
        type: formType,
        category: formCategory,
        description: formDescription,
        amount,
      }
      if (editing) {
        await api(`/api/financeiro/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        toast.success('Lançamento atualizado')
      } else {
        await api('/api/financeiro', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Lançamento criado')
      }
      setShowModal(false)
      fetchEntries()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    try {
      await api(`/api/financeiro/${id}`, { method: 'DELETE' })
      toast.success('Lançamento excluído')
      fetchEntries()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const categories = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Controle de receitas e despesas"
        action={
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus size={16} className="mr-1.5" /> Novo Lançamento
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 flex-1">
          <Card className="flex items-center gap-3 !p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Receitas</p>
              <p className="text-lg font-bold text-emerald-400">{formatBRL(income)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 !p-4">
            <div className="rounded-lg bg-red-500/10 p-2.5">
              <TrendingDown size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Despesas</p>
              <p className="text-lg font-bold text-red-400">{formatBRL(expense)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 !p-4">
            <div className={cn('rounded-lg p-2.5', balance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
              <Wallet size={20} className={balance >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Saldo</p>
              <p className={cn('text-lg font-bold', balance >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatBRL(balance)}
              </p>
            </div>
          </Card>
        </div>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold-400/50"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Nenhum lançamento"
          description="Adicione receitas e despesas para controlar suas finanças"
          action={
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={16} className="mr-1.5" /> Novo Lançamento
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3 font-medium w-20" />
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr
                  key={entry.id}
                  className="border-b border-border last:border-0 hover:bg-surface-3/50 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(entry.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={entry.type === 'income' ? 'success' : 'danger'}>
                      {entry.type === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{entry.category}</td>
                  <td className="px-4 py-3 text-text-secondary">{entry.description}</td>
                  <td className={cn(
                    'px-4 py-3 text-right font-medium whitespace-nowrap',
                    entry.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {entry.type === 'expense' ? '- ' : '+ '}{formatBRL(entry.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                        <Edit3 size={15} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                        <Trash2 size={15} className="text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Lançamento' : 'Novo Lançamento'}
      >
        <div className="flex flex-col gap-4">
          <Input
            id="fin-date"
            label="Data"
            type="date"
            value={formDate}
            onChange={e => setFormDate(e.target.value)}
          />
          <Select
            id="fin-type"
            label="Tipo"
            value={formType}
            onChange={e => {
              const t = e.target.value as 'income' | 'expense'
              setFormType(t)
              setFormCategory(t === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
            }}
            options={[
              { value: 'income', label: 'Receita' },
              { value: 'expense', label: 'Despesa' },
            ]}
          />
          <Select
            id="fin-category"
            label="Categoria"
            value={formCategory}
            onChange={e => setFormCategory(e.target.value)}
            options={categories.map(c => ({ value: c, label: c }))}
          />
          <Input
            id="fin-description"
            label="Descrição"
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
            placeholder="Ex: Pagamento fornecedor de bebidas"
          />
          <Input
            id="fin-amount"
            label="Valor (R$)"
            type="number"
            min="0.01"
            step="0.01"
            value={formAmount}
            onChange={e => setFormAmount(e.target.value)}
            placeholder="0,00"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
