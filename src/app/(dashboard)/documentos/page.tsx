'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, FileText, Edit3, Trash2, Loader2,
  CheckCircle, AlertTriangle, AlertCircle, XCircle, Calendar,
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
import type { Document } from '@/lib/types'

const CATEGORIES = [
  'Alvará', 'Vigilância Sanitária', 'Bombeiros', 'CNPJ/Fiscal',
  'Contrato', 'Seguro', 'Licença', 'Outros',
]

const STATUS_OPTIONS = [
  { value: 'ok', label: 'OK' },
  { value: 'pending', label: 'Pendente' },
  { value: 'attention', label: 'Atenção' },
  { value: 'expired', label: 'Vencido' },
]

const STATUS_CONFIG: Record<string, {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'default'
  label: string
  icon: typeof CheckCircle
  color: string
  bg: string
}> = {
  ok: { variant: 'success', label: 'OK', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  pending: { variant: 'warning', label: 'Pendente', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  attention: { variant: 'danger', label: 'Atenção', icon: AlertCircle, color: 'text-brand-500', bg: 'bg-brand-500/10' },
  expired: { variant: 'danger', label: 'Vencido', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
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

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Document | null>(null)
  const [saving, setSaving] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState(CATEGORIES[0])
  const [formStatus, setFormStatus] = useState('ok')
  const [formExpiry, setFormExpiry] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formFileUrl, setFormFileUrl] = useState('')

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Document[]>('/api/documentos')
      setDocs(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const counts = {
    ok: docs.filter(d => d.status === 'ok').length,
    pending: docs.filter(d => d.status === 'pending').length,
    attention: docs.filter(d => d.status === 'attention').length,
    expired: docs.filter(d => d.status === 'expired').length,
  }

  function openNew() {
    setEditing(null)
    setFormTitle('')
    setFormCategory(CATEGORIES[0])
    setFormStatus('ok')
    setFormExpiry('')
    setFormNotes('')
    setFormFileUrl('')
    setShowModal(true)
  }

  function openEdit(doc: Document) {
    setEditing(doc)
    setFormTitle(doc.title)
    setFormCategory(doc.category)
    setFormStatus(doc.status)
    setFormExpiry(doc.expiry_date ?? '')
    setFormNotes(doc.notes ?? '')
    setFormFileUrl(doc.file_url ?? '')
    setShowModal(true)
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      toast.error('Informe o título do documento')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: formTitle.trim(),
        category: formCategory,
        status: formStatus,
        expiry_date: formExpiry || null,
        notes: formNotes.trim() || null,
        file_url: formFileUrl.trim() || null,
      }
      if (editing) {
        await api(`/api/documentos/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        toast.success('Documento atualizado')
      } else {
        await api('/api/documentos', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Documento criado')
      }
      setShowModal(false)
      fetchDocs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este documento?')) return
    try {
      await api(`/api/documentos/${id}`, { method: 'DELETE' })
      toast.success('Documento excluído')
      fetchDocs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  return (
    <div>
      <PageHeader
        title="Documentos"
        description="Controle de documentos, licenças e alvarás"
        action={
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus size={16} className="mr-1.5" /> Novo Documento
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['ok', 'pending', 'attention', 'expired'] as const).map(status => {
          const cfg = STATUS_CONFIG[status]
          const Icon = cfg.icon
          return (
            <Card key={status} className="flex items-center gap-3 !p-4">
              <div className={cn('rounded-lg p-2.5', cfg.bg)}>
                <Icon size={20} className={cfg.color} />
              </div>
              <div>
                <p className="text-xs text-text-secondary">{cfg.label}</p>
                <p className={cn('text-lg font-bold', cfg.color)}>{counts[status]}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento"
          description="Cadastre documentos, licenças e alvarás do estabelecimento"
          action={
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={16} className="mr-1.5" /> Novo Documento
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map(doc => {
            const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.ok
            return (
              <Card key={doc.id} className="flex flex-col gap-3 !p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-text-primary truncate">{doc.title}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{doc.category}</p>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
                {doc.expiry_date && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Calendar size={13} />
                    Vencimento: {format(new Date(doc.expiry_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                )}
                {doc.notes && (
                  <p className="text-xs text-text-muted line-clamp-2">{doc.notes}</p>
                )}
                <div className="flex justify-end gap-1 mt-auto pt-1 border-t border-border">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(doc)}>
                    <Edit3 size={15} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                    <Trash2 size={15} className="text-red-400" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Documento' : 'Novo Documento'}
      >
        <div className="flex flex-col gap-4">
          <Input
            id="doc-title"
            label="Título"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            placeholder="Ex: Alvará de Funcionamento"
          />
          <Select
            id="doc-category"
            label="Categoria"
            value={formCategory}
            onChange={e => setFormCategory(e.target.value)}
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
          />
          <Select
            id="doc-status"
            label="Status"
            value={formStatus}
            onChange={e => setFormStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
          <Input
            id="doc-expiry"
            label="Data de Vencimento"
            type="date"
            value={formExpiry}
            onChange={e => setFormExpiry(e.target.value)}
          />
          <Input
            id="doc-notes"
            label="Observações"
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            placeholder="Notas sobre o documento"
          />
          <Input
            id="doc-file-url"
            label="URL do Arquivo"
            value={formFileUrl}
            onChange={e => setFormFileUrl(e.target.value)}
            placeholder="https://..."
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
