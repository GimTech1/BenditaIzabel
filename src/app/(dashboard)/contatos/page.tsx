'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Users, Edit3, Trash2, Loader2,
  Phone, Mail, Building2, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'
import type { Contact } from '@/lib/types'

const CATEGORIES = [
  'Fornecedor', 'Técnico', 'Funcionário', 'Contador',
  'Segurança', 'Delivery', 'Marketing', 'Outros',
]

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

export default function ContatosPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formCompany, setFormCompany] = useState('')
  const [formCategory, setFormCategory] = useState(CATEGORIES[0])
  const [formNotes, setFormNotes] = useState('')

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Contact[]>('/api/contatos')
      setContacts(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const filtered = useMemo(() => {
    let list = contacts
    if (activeCategory) {
      list = list.filter(c => c.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q)) ||
        c.role.toLowerCase().includes(q)
      )
    }
    return list
  }, [contacts, activeCategory, search])

  function openNew() {
    setEditing(null)
    setFormName('')
    setFormRole('')
    setFormPhone('')
    setFormEmail('')
    setFormCompany('')
    setFormCategory(CATEGORIES[0])
    setFormNotes('')
    setShowModal(true)
  }

  function openEdit(contact: Contact) {
    setEditing(contact)
    setFormName(contact.name)
    setFormRole(contact.role)
    setFormPhone(contact.phone ?? '')
    setFormEmail(contact.email ?? '')
    setFormCompany(contact.company ?? '')
    setFormCategory(contact.category)
    setFormNotes(contact.notes ?? '')
    setShowModal(true)
  }

  async function handleSave() {
    if (!formName.trim() || !formRole.trim()) {
      toast.error('Nome e função são obrigatórios')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        role: formRole.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        company: formCompany.trim() || null,
        category: formCategory,
        notes: formNotes.trim() || null,
      }
      if (editing) {
        await api(`/api/contatos/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        toast.success('Contato atualizado')
      } else {
        await api('/api/contatos', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Contato criado')
      }
      setShowModal(false)
      fetchContacts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este contato?')) return
    try {
      await api(`/api/contatos/${id}`, { method: 'DELETE' })
      toast.success('Contato excluído')
      fetchContacts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  return (
    <div>
      <PageHeader
        title="Contatos"
        description="Agenda de contatos e fornecedores"
        action={
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus size={16} className="mr-1.5" /> Novo Contato
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou função..."
            className="h-10 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              !activeCategory
                ? 'bg-gold-400 text-brand-900'
                : 'bg-surface-3 text-text-secondary hover:text-text-primary'
            )}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-gold-400 text-brand-900'
                  : 'bg-surface-3 text-text-secondary hover:text-text-primary'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum contato encontrado"
          description={
            contacts.length > 0
              ? 'Tente alterar os filtros de busca'
              : 'Adicione contatos de fornecedores, técnicos e parceiros'
          }
          action={
            contacts.length === 0 ? (
              <Button variant="primary" size="sm" onClick={openNew}>
                <Plus size={16} className="mr-1.5" /> Novo Contato
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(contact => (
            <Card key={contact.id} className="flex flex-col gap-2.5 !p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary truncate">{contact.name}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{contact.role}</p>
                </div>
                <Badge variant="default">{contact.category}</Badge>
              </div>

              {contact.company && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Building2 size={13} className="shrink-0" />
                  <span className="truncate">{contact.company}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1.5 text-xs text-gold-400 hover:underline"
                  >
                    <Phone size={13} className="shrink-0" />
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1.5 text-xs text-gold-400 hover:underline"
                  >
                    <Mail size={13} className="shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </a>
                )}
              </div>

              {contact.notes && (
                <p className="text-xs text-text-muted line-clamp-2">{contact.notes}</p>
              )}

              <div className="flex justify-end gap-1 mt-auto pt-1 border-t border-border">
                <Button variant="ghost" size="icon" onClick={() => openEdit(contact)}>
                  <Edit3 size={15} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
                  <Trash2 size={15} className="text-red-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Contato' : 'Novo Contato'}
      >
        <div className="flex flex-col gap-4">
          <Input
            id="ct-name"
            label="Nome"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="Nome completo"
          />
          <Input
            id="ct-role"
            label="Função"
            value={formRole}
            onChange={e => setFormRole(e.target.value)}
            placeholder="Ex: Representante comercial"
          />
          <Select
            id="ct-category"
            label="Categoria"
            value={formCategory}
            onChange={e => setFormCategory(e.target.value)}
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
          />
          <Input
            id="ct-company"
            label="Empresa"
            value={formCompany}
            onChange={e => setFormCompany(e.target.value)}
            placeholder="Nome da empresa"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="ct-phone"
              label="Telefone"
              type="tel"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
            <Input
              id="ct-email"
              label="E-mail"
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <Input
            id="ct-notes"
            label="Observações"
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            placeholder="Informações adicionais"
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
