'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, Truck, Plus, Search, Pencil, Trash2, AlertTriangle,
  Loader2, Phone, Mail, User, StickyNote,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'
import type { StockItem, Supplier } from '@/lib/types'

type StockItemWithSupplier = StockItem & { suppliers: { name: string } | null }

const CATEGORIES = ['Bebidas', 'Alimentos', 'Descartáveis', 'Limpeza', 'Insumos Bar', 'Outros']
const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct']

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

function qtyStatus(current: number, min: number): 'danger' | 'warning' | 'success' {
  if (current <= min) return 'danger'
  if (current <= min * 1.5) return 'warning'
  return 'success'
}

// ─── Main ─────────────────────────────────────────────────────

export default function EstoquePage() {
  const [tab, setTab] = useState<'estoque' | 'fornecedores'>('estoque')
  const [items, setItems] = useState<StockItemWithSupplier[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [itemsData, suppliersData] = await Promise.all([
        api<StockItemWithSupplier[]>('/api/estoque'),
        api<Supplier[]>('/api/estoque/fornecedores'),
      ])
      setItems(itemsData)
      setSuppliers(suppliersData)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

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
        title="Estoque"
        description="Controle de estoque e fornecedores"
      />

      <div className="flex gap-1 rounded-lg bg-surface-2 border border-border p-1 mb-6 w-fit">
        <button
          onClick={() => { setTab('estoque'); setSearch('') }}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'estoque'
              ? 'bg-gold-400 text-brand-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
          )}
        >
          <Package size={16} /> Estoque
        </button>
        <button
          onClick={() => { setTab('fornecedores'); setSearch('') }}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'fornecedores'
              ? 'bg-gold-400 text-brand-900'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
          )}
        >
          <Truck size={16} /> Fornecedores
        </button>
      </div>

      {tab === 'estoque' ? (
        <EstoqueTab
          items={items}
          setItems={setItems}
          suppliers={suppliers}
          search={search}
          setSearch={setSearch}
        />
      ) : (
        <FornecedoresTab
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          search={search}
          setSearch={setSearch}
        />
      )}
    </div>
  )
}

// ─── Estoque Tab ──────────────────────────────────────────────

interface EstoqueTabProps {
  items: StockItemWithSupplier[]
  setItems: React.Dispatch<React.SetStateAction<StockItemWithSupplier[]>>
  suppliers: Supplier[]
  search: string
  setSearch: (v: string) => void
}

function EstoqueTab({ items, setItems, suppliers, search, setSearch }: EstoqueTabProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StockItemWithSupplier | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    category: CATEGORIES[0],
    unit: UNITS[0],
    current_qty: '',
    min_qty: '',
    supplier_id: '',
    cost_per_unit: '',
  })

  function openCreate() {
    setEditing(null)
    setForm({
      name: '', category: CATEGORIES[0], unit: UNITS[0],
      current_qty: '', min_qty: '', supplier_id: '', cost_per_unit: '',
    })
    setModalOpen(true)
  }

  function openEdit(item: StockItemWithSupplier) {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      current_qty: String(item.current_qty),
      min_qty: String(item.min_qty),
      supplier_id: item.supplier_id || '',
      cost_per_unit: item.cost_per_unit ? String(item.cost_per_unit) : '',
    })
    setModalOpen(true)
  }

  async function saveItem() {
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        current_qty: Number(form.current_qty) || 0,
        min_qty: Number(form.min_qty) || 0,
        supplier_id: form.supplier_id || null,
        cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
      }

      if (editing) {
        const updated = await api<StockItemWithSupplier>(`/api/estoque/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
        toast.success('Item atualizado')
      } else {
        const created = await api<StockItemWithSupplier>('/api/estoque', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setItems(prev => [...prev, created])
        toast.success('Item criado')
      }
      setModalOpen(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Excluir este item do estoque?')) return
    try {
      await api(`/api/estoque/${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Item excluído')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  )

  const belowMin = items.filter(i => i.current_qty <= i.min_qty).length
  const grouped = CATEGORIES.reduce<Record<string, StockItemWithSupplier[]>>((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {})

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-brand-500/10 p-2.5">
            <Package size={20} className="text-brand-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{items.length}</p>
            <p className="text-xs text-text-muted">Itens no estoque</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className={cn('rounded-lg p-2.5', belowMin > 0 ? 'bg-red-500/10' : 'bg-green-500/10')}>
            <AlertTriangle size={20} className={belowMin > 0 ? 'text-red-400' : 'text-green-400'} />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{belowMin}</p>
            <p className="text-xs text-text-muted">Abaixo do mínimo</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar itens..."
            className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 transition-colors"
          />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} /> Adicionar Item
        </Button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum item encontrado"
          description={search ? 'Tente outro termo de busca' : 'Adicione itens ao estoque'}
          action={!search ? <Button size="sm" onClick={openCreate}><Plus size={16} /> Adicionar Item</Button> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-text-secondary mb-3">{category}</h3>
              <div className="rounded-xl border border-border bg-surface-2 overflow-hidden">
                <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px_140px_80px] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-text-muted">
                  <span>Nome</span>
                  <span>Quantidade</span>
                  <span>Mínimo</span>
                  <span>Unidade</span>
                  <span>Custo</span>
                  <span>Fornecedor</span>
                  <span />
                </div>
                {catItems.map(item => {
                  const status = qtyStatus(item.current_qty, item.min_qty)
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_100px_120px_140px_80px] gap-2 md:gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-3/50 transition-colors items-center"
                    >
                      <span className="text-sm font-medium text-text-primary">{item.name}</span>
                      <span className="md:block">
                        <Badge variant={status}>
                          {item.current_qty} {item.unit}
                        </Badge>
                      </span>
                      <span className="text-sm text-text-muted">{item.min_qty} {item.unit}</span>
                      <span className="text-sm text-text-muted">{item.unit}</span>
                      <span className="text-sm text-text-secondary">
                        {item.cost_per_unit ? `R$ ${item.cost_per_unit.toFixed(2)}` : '—'}
                      </span>
                      <span className="text-sm text-text-secondary truncate">
                        {item.suppliers?.name || '—'}
                      </span>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => deleteItem(item.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Item' : 'Novo Item'}
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            id="item-name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Coca-Cola 2L"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoria"
              id="item-category"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
            />
            <Select
              label="Unidade"
              id="item-unit"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              options={UNITS.map(u => ({ value: u, label: u }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Qtd. atual"
              id="item-qty"
              type="number"
              min="0"
              value={form.current_qty}
              onChange={e => setForm(f => ({ ...f, current_qty: e.target.value }))}
            />
            <Input
              label="Qtd. mínima"
              id="item-min"
              type="number"
              min="0"
              value={form.min_qty}
              onChange={e => setForm(f => ({ ...f, min_qty: e.target.value }))}
            />
          </div>
          <Input
            label="Custo unitário (R$)"
            id="item-cost"
            type="number"
            min="0"
            step="0.01"
            value={form.cost_per_unit}
            onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))}
          />
          <Select
            label="Fornecedor"
            id="item-supplier"
            value={form.supplier_id}
            onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
            options={[
              { value: '', label: 'Nenhum' },
              ...suppliers.map(s => ({ value: s.id, label: s.name })),
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={saveItem}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Fornecedores Tab ─────────────────────────────────────────

interface FornecedoresTabProps {
  suppliers: Supplier[]
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>
  search: string
  setSearch: (v: string) => void
}

function FornecedoresTab({ suppliers, setSuppliers, search, setSearch }: FornecedoresTabProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    category: CATEGORIES[0],
    notes: '',
  })

  function openCreate() {
    setEditing(null)
    setForm({ name: '', contact_name: '', phone: '', email: '', category: CATEGORIES[0], notes: '' })
    setModalOpen(true)
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      category: supplier.category,
      notes: supplier.notes || '',
    })
    setModalOpen(true)
  }

  async function saveSupplier() {
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        category: form.category,
        notes: form.notes.trim() || null,
      }

      if (editing) {
        const updated = await api<Supplier>(`/api/estoque/fornecedores/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s))
        toast.success('Fornecedor atualizado')
      } else {
        const created = await api<Supplier>('/api/estoque/fornecedores', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setSuppliers(prev => [...prev, created])
        toast.success('Fornecedor adicionado')
      }
      setModalOpen(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSupplier(id: string) {
    if (!confirm('Excluir este fornecedor?')) return
    try {
      await api(`/api/estoque/fornecedores/${id}`, { method: 'DELETE' })
      setSuppliers(prev => prev.filter(s => s.id !== id))
      toast.success('Fornecedor excluído')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_name && s.contact_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar fornecedores..."
            className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 transition-colors"
          />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} /> Adicionar Fornecedor
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Nenhum fornecedor encontrado"
          description={search ? 'Tente outro termo de busca' : 'Adicione fornecedores'}
          action={!search ? <Button size="sm" onClick={openCreate}><Plus size={16} /> Adicionar Fornecedor</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(supplier => (
            <Card key={supplier.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary truncate">{supplier.name}</p>
                  <Badge className="mt-1">{supplier.category}</Badge>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(supplier)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => deleteSupplier(supplier.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-text-secondary">
                {supplier.contact_name && (
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-text-muted shrink-0" />
                    <span className="truncate">{supplier.contact_name}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-text-muted shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className="text-text-muted shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.notes && (
                  <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border">
                    <StickyNote size={12} className="text-text-muted shrink-0 mt-0.5" />
                    <span className="text-text-muted line-clamp-2">{supplier.notes}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            id="sup-name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nome da empresa"
            autoFocus
          />
          <Select
            label="Categoria"
            id="sup-category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
          />
          <Input
            label="Contato"
            id="sup-contact"
            value={form.contact_name}
            onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
            placeholder="Nome do contato"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Telefone"
              id="sup-phone"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="Email"
              id="sup-email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sup-notes" className="text-sm font-medium text-text-secondary">
              Observações
            </label>
            <textarea
              id="sup-notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Informações adicionais..."
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" loading={saving} onClick={saveSupplier}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
