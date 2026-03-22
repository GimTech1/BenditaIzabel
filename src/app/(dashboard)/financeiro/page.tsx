'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus, DollarSign, TrendingUp, TrendingDown, Wallet,
  Edit3, Trash2, Loader2, Download, Clock, Search, X,
  PieChart, FileText, Upload, ExternalLink,
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
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type {
  FinanceEntry,
  FinanceEntryStatus,
  FinancePaymentMethod,
  Supplier,
} from '@/lib/types'

const INCOME_CATEGORIES = [
  'Vendas bar', 'Vendas eventos', 'Delivery / Ifood', 'Aluguel de espaço', 'Outros recebimentos',
]
const EXPENSE_CATEGORIES = [
  'Fornecedores (bebidas)', 'Fornecedores (alimentos)', 'Funcionários / Folha',
  'Aluguel', 'Contas (luz/água/gás)', 'Marketing', 'Manutenção', 'Impostos / Taxas',
  'Equipamentos', 'Limpeza / Higiene', 'Outros',
]

const PAYMENT_OPTIONS: { value: FinancePaymentMethod; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão crédito' },
  { value: 'cartao_debito', label: 'Cartão débito' },
  { value: 'transferencia', label: 'Transferência (TED/Doc)' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outros', label: 'Outros' },
  { value: 'nao_informado', label: 'Não informado' },
]

const STATUS_OPTIONS: { value: FinanceEntryStatus; label: string }[] = [
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'cancelled', label: 'Cancelado' },
]

const NF_BUCKET = 'bendita-finance-nf'
const MAX_NF_BYTES = 15 * 1024 * 1024

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function normalizeEntry(raw: Record<string, unknown>): FinanceEntry {
  return {
    id: raw.id as string,
    date: raw.date as string,
    type: raw.type as 'income' | 'expense',
    category: raw.category as string,
    description: raw.description as string,
    amount: Number(raw.amount),
    created_by: raw.created_by as string,
    created_at: raw.created_at as string,
    payment_method: (raw.payment_method as FinancePaymentMethod) ?? 'nao_informado',
    status: (raw.status as FinanceEntryStatus) ?? 'confirmed',
    supplier_id: (raw.supplier_id as string) ?? null,
    notes: (raw.notes as string) ?? null,
    reference_code: (raw.reference_code as string) ?? null,
    invoice_file_url: (raw.invoice_file_url as string) ?? null,
  }
}

function sanitizeInvoiceFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'nota'
}

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const hasBody = opts?.body != null
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...opts?.headers,
    },
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

function paymentLabel(m: FinancePaymentMethod) {
  return PAYMENT_OPTIONS.find(p => p.value === m)?.label ?? m
}

function statusLabel(s: FinanceEntryStatus) {
  return STATUS_OPTIONS.find(x => x.value === s)?.label ?? s
}

function statusVariant(s: FinanceEntryStatus): 'success' | 'warning' | 'danger' | 'default' {
  if (s === 'confirmed') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'cancelled') return 'default'
  return 'default'
}

function exportCsv(rows: FinanceEntry[], month: string) {
  const headers = [
    'Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Pagamento', 'Status',
    'Ref.', 'Notas', 'URL NF',
  ]
  const lines = rows.map(e => [
    e.date,
    e.type === 'income' ? 'Receita' : 'Despesa',
    e.category,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    String(e.amount).replace('.', ','),
    paymentLabel(e.payment_method),
    statusLabel(e.status),
    e.reference_code ?? '',
    `"${(e.notes || '').replace(/"/g, '""')}"`,
    e.invoice_file_url ?? '',
  ].join(';'))
  const bom = '\uFEFF'
  const blob = new Blob([bom + headers.join(';') + '\n' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `financeiro-${month}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function FinanceiroPage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(currentMonth)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FinanceEntry | null>(null)
  const [saving, setSaving] = useState(false)

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | FinanceEntryStatus>('all')
  const [filterPayment, setFilterPayment] = useState<'all' | FinancePaymentMethod>('all')
  const [filterSearch, setFilterSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [formDate, setFormDate] = useState('')
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formPayment, setFormPayment] = useState<FinancePaymentMethod>('pix')
  const [formStatus, setFormStatus] = useState<FinanceEntryStatus>('confirmed')
  const [formSupplierId, setFormSupplierId] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formRef, setFormRef] = useState('')
  const [pendingInvoiceFile, setPendingInvoiceFile] = useState<File | null>(null)
  const [removeInvoice, setRemoveInvoice] = useState(false)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await api<Supplier[]>('/api/estoque/fornecedores')
      setSuppliers(data)
    } catch {
      /* silencioso */
    }
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month })
      if (filterType !== 'all') params.set('type', filterType)
      if (filterCategory) params.set('category', filterCategory)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterPayment !== 'all') params.set('payment_method', filterPayment)
      if (debouncedSearch) params.set('q', debouncedSearch)

      const raw = await api<Record<string, unknown>[]>(`/api/financeiro?${params}`)
      setEntries(raw.map(normalizeEntry))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [month, filterType, filterCategory, filterStatus, filterPayment, debouncedSearch])

  useEffect(() => { loadSuppliers() }, [loadSuppliers])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(filterSearch.trim()), 320)
    return () => window.clearTimeout(t)
  }, [filterSearch])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const income = useMemo(
    () => entries.filter(e => e.type === 'income' && e.status !== 'cancelled').reduce((s, e) => s + e.amount, 0),
    [entries]
  )
  const expense = useMemo(
    () => entries.filter(e => e.type === 'expense' && e.status !== 'cancelled').reduce((s, e) => s + e.amount, 0),
    [entries]
  )
  const balance = income - expense

  const pendingTotal = useMemo(
    () => entries.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
    [entries]
  )
  const pendingCount = useMemo(
    () => entries.filter(e => e.status === 'pending').length,
    [entries]
  )

  const breakdownIncome = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of entries) {
      if (e.type !== 'income' || e.status === 'cancelled') continue
      m.set(e.category, (m.get(e.category) ?? 0) + e.amount)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  const breakdownExpense = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of entries) {
      if (e.type !== 'expense' || e.status === 'cancelled') continue
      m.set(e.category, (m.get(e.category) ?? 0) + e.amount)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  const maxBar = useMemo(() => {
    const all = [...breakdownIncome.map(([, v]) => v), ...breakdownExpense.map(([, v]) => v)]
    return Math.max(1, ...all)
  }, [breakdownIncome, breakdownExpense])

  function openNew() {
    setEditing(null)
    setFormDate(new Date().toISOString().split('T')[0])
    setFormType('expense')
    setFormCategory(EXPENSE_CATEGORIES[0])
    setFormDescription('')
    setFormAmount('')
    setFormPayment('pix')
    setFormStatus('confirmed')
    setFormSupplierId('')
    setFormNotes('')
    setFormRef('')
    setPendingInvoiceFile(null)
    setRemoveInvoice(false)
    if (invoiceInputRef.current) invoiceInputRef.current.value = ''
    setShowModal(true)
  }

  function openEdit(entry: FinanceEntry) {
    setEditing(entry)
    setFormDate(entry.date)
    setFormType(entry.type)
    setFormCategory(entry.category)
    setFormDescription(entry.description)
    setFormAmount(String(entry.amount))
    setFormPayment(entry.payment_method ?? 'nao_informado')
    setFormStatus(entry.status ?? 'confirmed')
    setFormSupplierId(entry.supplier_id ?? '')
    setFormNotes(entry.notes ?? '')
    setFormRef(entry.reference_code ?? '')
    setPendingInvoiceFile(null)
    setRemoveInvoice(false)
    if (invoiceInputRef.current) invoiceInputRef.current.value = ''
    setShowModal(true)
  }

  async function handleSave() {
    const amount = parseFloat(formAmount.replace(',', '.'))
    if (!formDate || !formCategory || !formDescription || isNaN(amount) || amount <= 0) {
      toast.error('Preencha data, categoria, descrição e valor válido')
      return
    }
    setSaving(true)
    try {
      let invoice_file_url: string | null =
        editing && !removeInvoice && !pendingInvoiceFile
          ? (editing.invoice_file_url ?? null)
          : null

      if (removeInvoice) {
        invoice_file_url = null
      } else if (pendingInvoiceFile) {
        const allowed =
          pendingInvoiceFile.type === 'application/pdf' ||
          pendingInvoiceFile.type === 'application/xml' ||
          pendingInvoiceFile.type === 'text/xml' ||
          /\.pdf$/i.test(pendingInvoiceFile.name) ||
          /\.xml$/i.test(pendingInvoiceFile.name)
        if (!allowed) {
          toast.error('Use PDF ou XML da nota fiscal (NF-e / NFC-e)')
          setSaving(false)
          return
        }
        if (pendingInvoiceFile.size > MAX_NF_BYTES) {
          toast.error('Arquivo muito grande (máx. 15 MB)')
          setSaving(false)
          return
        }
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          toast.error('Sessão expirada. Faça login de novo.')
          setSaving(false)
          return
        }
        const safe = sanitizeInvoiceFileName(pendingInvoiceFile.name)
        const path = `nf/${user.id}/${Date.now()}_${safe}`
        const { error: upErr } = await supabase.storage
          .from(NF_BUCKET)
          .upload(path, pendingInvoiceFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: pendingInvoiceFile.type || undefined,
          })
        if (upErr) {
          toast.error(upErr.message || 'Erro ao enviar a nota fiscal')
          setSaving(false)
          return
        }
        const { data: pub } = supabase.storage.from(NF_BUCKET).getPublicUrl(path)
        invoice_file_url = pub.publicUrl
      }

      const payload = {
        date: formDate,
        type: formType,
        category: formCategory,
        description: formDescription,
        amount,
        payment_method: formPayment,
        status: formStatus,
        supplier_id: formType === 'expense' && formSupplierId ? formSupplierId : null,
        notes: formNotes.trim() || null,
        reference_code: formRef.trim() || null,
        invoice_file_url,
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
      setPendingInvoiceFile(null)
      setRemoveInvoice(false)
      if (invoiceInputRef.current) invoiceInputRef.current.value = ''
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

  const allCategoriesFilter = useMemo(() => {
    const s = new Set<string>()
    INCOME_CATEGORIES.forEach(c => s.add(c))
    EXPENSE_CATEGORIES.forEach(c => s.add(c))
    entries.forEach(e => s.add(e.category))
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [entries])

  function clearFilters() {
    setFilterType('all')
    setFilterCategory('')
    setFilterStatus('all')
    setFilterPayment('all')
    setFilterSearch('')
  }

  const supplierName = (id: string | null) =>
    id ? suppliers.find(s => s.id === id)?.name ?? '—' : '—'

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas, formas de pagamento e controle por status"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportCsv(entries, month)}
              disabled={entries.length === 0}
            >
              <Download size={16} className="mr-1.5" /> Exportar CSV
            </Button>
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={16} className="mr-1.5" /> Novo Lançamento
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 !p-4">
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <TrendingUp size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Receitas (mês)</p>
            <p className="text-lg font-bold text-emerald-400">{formatBRL(income)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-4">
          <div className="rounded-lg bg-red-500/10 p-2.5">
            <TrendingDown size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Despesas (mês)</p>
            <p className="text-lg font-bold text-red-400">{formatBRL(expense)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-4">
          <div className={cn('rounded-lg p-2.5', balance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
            <Wallet size={20} className={balance >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Saldo líquido</p>
            <p className={cn('text-lg font-bold', balance >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {formatBRL(balance)}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-4">
          <div className="rounded-lg bg-gold-400/10 p-2.5">
            <Clock size={20} className="text-gold-400" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Pendentes</p>
            <p className="text-lg font-bold text-gold-400">{pendingCount}</p>
            <p className="text-[11px] text-text-muted">{formatBRL(pendingTotal)}</p>
          </div>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Mês</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold-400/50"
            />
          </div>
          <Select
            id="f-type"
            label="Tipo"
            value={filterType}
            onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="min-w-[130px]"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'income', label: 'Receitas' },
              { value: 'expense', label: 'Despesas' },
            ]}
          />
          <Select
            id="f-cat"
            label="Categoria"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="min-w-[180px]"
            options={[
              { value: '', label: 'Todas' },
              ...allCategoriesFilter.map(c => ({ value: c, label: c })),
            ]}
          />
          <Select
            id="f-status"
            label="Status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="min-w-[140px]"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'confirmed', label: 'Confirmado' },
              { value: 'pending', label: 'Pendente' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
          />
          <Select
            id="f-pay"
            label="Pagamento"
            value={filterPayment}
            onChange={e => setFilterPayment(e.target.value as typeof filterPayment)}
            className="min-w-[150px]"
            options={[
              { value: 'all', label: 'Todos' },
              ...PAYMENT_OPTIONS.map(p => ({ value: p.value, label: p.label })),
            ]}
          />
          <Button variant="ghost" size="sm" type="button" onClick={clearFilters} className="mb-0.5">
            <X size={16} className="mr-1" /> Limpar
          </Button>
        </div>
        <div className="relative max-w-md flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            placeholder="Buscar na descrição…"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50"
          />
        </div>
      </div>

      {(breakdownIncome.length > 0 || breakdownExpense.length > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="!p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PieChart size={16} className="text-emerald-400" />
              Receitas por categoria
            </div>
            <div className="space-y-2">
              {breakdownIncome.length === 0 ? (
                <p className="text-xs text-text-muted">Sem receitas no período filtrado</p>
              ) : (
                breakdownIncome.map(([cat, val]) => (
                  <div key={cat}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="truncate text-text-secondary">{cat}</span>
                      <span className="shrink-0 font-medium text-emerald-400">{formatBRL(val)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-emerald-500/80 transition-all"
                        style={{ width: `${(val / maxBar) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card className="!p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PieChart size={16} className="text-red-400" />
              Despesas por categoria
            </div>
            <div className="space-y-2">
              {breakdownExpense.length === 0 ? (
                <p className="text-xs text-text-muted">Sem despesas no período filtrado</p>
              ) : (
                breakdownExpense.map(([cat, val]) => (
                  <div key={cat}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="truncate text-text-secondary">{cat}</span>
                      <span className="shrink-0 font-medium text-red-400">{formatBRL(val)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-red-500/70 transition-all"
                        style={{ width: `${(val / maxBar) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Nenhum lançamento"
          description="Ajuste filtros ou adicione receitas e despesas do bar"
          action={
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={16} className="mr-1.5" /> Novo Lançamento
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-text-secondary">
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Categoria</th>
                <th className="px-3 py-3 font-medium">Descrição</th>
                <th className="px-2 py-3 font-medium w-14 text-center" title="Nota fiscal">NF</th>
                <th className="px-3 py-3 font-medium">Ref.</th>
                <th className="px-3 py-3 font-medium">Pagamento</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium text-right">Valor</th>
                <th className="w-20 px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr
                  key={entry.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-surface-3/50 transition-colors',
                    entry.status === 'cancelled' && 'opacity-50'
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {format(new Date(entry.date + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={entry.type === 'income' ? 'success' : 'danger'}>
                      {entry.type === 'income' ? 'Rec.' : 'Desp.'}
                    </Badge>
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2.5 text-text-secondary" title={entry.category}>
                    {entry.category}
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5 text-text-secondary">
                    <span className="line-clamp-2">{entry.description}</span>
                    {entry.type === 'expense' && entry.supplier_id && (
                      <span className="mt-0.5 block text-[10px] text-text-muted">
                        Forn.: {supplierName(entry.supplier_id)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {entry.invoice_file_url ? (
                      <a
                        href={entry.invoice_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-lg p-1.5 text-gold-400 hover:bg-surface-3"
                        title="Abrir nota fiscal"
                      >
                        <FileText size={16} />
                      </a>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="max-w-[80px] truncate px-3 py-2.5 text-xs text-text-muted">
                    {entry.reference_code ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-text-secondary">
                    {paymentLabel(entry.payment_method)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={statusVariant(entry.status)} className="text-[10px]">
                      {statusLabel(entry.status)}
                    </Badge>
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-3 py-2.5 text-right font-medium',
                      entry.type === 'income' ? 'text-emerald-400' : 'text-red-400',
                      entry.status === 'cancelled' && 'line-through'
                    )}
                  >
                    {entry.type === 'expense' ? '- ' : '+ '}
                    {formatBRL(entry.amount)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(entry)} title="Editar">
                        <Edit3 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)} title="Excluir">
                        <Trash2 size={14} className="text-red-400" />
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
        <div className="flex max-h-[min(85vh,640px)] flex-col gap-4 overflow-y-auto pr-1">
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
              if (t === 'income') setFormSupplierId('')
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
            placeholder="Ex: Compra de cerveja — fornecedor X"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="fin-payment"
              label="Forma de pagamento"
              value={formPayment}
              onChange={e => setFormPayment(e.target.value as FinancePaymentMethod)}
              options={PAYMENT_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
            />
            <Select
              id="fin-status"
              label="Status do lançamento"
              value={formStatus}
              onChange={e => setFormStatus(e.target.value as FinanceEntryStatus)}
              options={STATUS_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
            />
          </div>
          {formType === 'expense' && (
            <Select
              id="fin-supplier"
              label="Fornecedor (opcional)"
              value={formSupplierId}
              onChange={e => setFormSupplierId(e.target.value)}
              options={[
                { value: '', label: '— Nenhum —' },
                ...suppliers.map(s => ({ value: s.id, label: s.name })),
              ]}
            />
          )}
          <Input
            id="fin-ref"
            label="Referência (nº NF, recibo, código)"
            value={formRef}
            onChange={e => setFormRef(e.target.value)}
            placeholder="Opcional"
          />

          <div className="space-y-2 rounded-lg border border-border bg-surface-3/50 p-3">
            <label className="text-sm font-medium text-text-secondary">
              Importar nota fiscal (PDF ou XML)
            </label>
            <input
              ref={invoiceInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.xml,application/pdf,application/xml,text/xml"
              onChange={e => {
                const f = e.target.files?.[0]
                setPendingInvoiceFile(f ?? null)
                if (f) setRemoveInvoice(false)
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => invoiceInputRef.current?.click()}
              >
                <Upload size={14} className="mr-1.5" />
                {pendingInvoiceFile ? 'Trocar arquivo' : 'Anexar NF-e / PDF'}
              </Button>
              {pendingInvoiceFile && (
                <span className="max-w-[200px] truncate text-xs text-text-muted" title={pendingInvoiceFile.name}>
                  {pendingInvoiceFile.name}
                </span>
              )}
              {pendingInvoiceFile && (
                <button
                  type="button"
                  className="text-xs text-red-400 hover:underline"
                  onClick={() => {
                    setPendingInvoiceFile(null)
                    if (invoiceInputRef.current) invoiceInputRef.current.value = ''
                  }}
                >
                  Remover seleção
                </button>
              )}
            </div>
            {editing?.invoice_file_url && !pendingInvoiceFile && !removeInvoice && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                <a
                  href={editing.invoice_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-gold-400 hover:text-gold-300"
                >
                  <ExternalLink size={12} /> Ver nota atual
                </a>
                <button
                  type="button"
                  className="text-xs text-red-400 hover:underline"
                  onClick={() => setRemoveInvoice(true)}
                >
                  Remover nota anexada
                </button>
              </div>
            )}
            {removeInvoice && (
              <p className="text-xs text-amber-400">
                A nota será removida ao salvar.{' '}
                <button type="button" className="underline" onClick={() => setRemoveInvoice(false)}>
                  Desfazer
                </button>
              </p>
            )}
            <p className="text-[11px] text-text-muted">
              Aceita DANFE em PDF ou XML da NF-e. Máx. 15 MB. Requer bucket configurado no Supabase (migration 10).
            </p>
          </div>

          <Input
            id="fin-notes"
            label="Notas internas"
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            placeholder="Detalhes extras visíveis só na equipe"
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
          <div className="flex justify-end gap-2 border-t border-border pt-4">
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
