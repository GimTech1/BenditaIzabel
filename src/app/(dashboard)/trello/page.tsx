'use client'

import { useState, useEffect, useCallback, useRef, memo, useMemo, type DragEvent } from 'react'
import {
  Plus, Columns3, MoreHorizontal, Trash2, Edit3, Calendar, Tag,
  CheckSquare, MessageSquare, Paperclip, Users, ChevronDown, X,
  GripVertical, Clock, AlertCircle, Check, Upload, FileText,
  User as UserIcon, Loader2, Star, CircleDot,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type {
  TrelloBoard, TrelloList, TrelloCard, TrelloLabel,
  TrelloChecklist, TrelloChecklistItem, TrelloCardComment,
  TrelloCardAttachment, TrelloCardAssignee, Profile,
} from '@/lib/types'

interface ListWithCards extends TrelloList {
  cards: TrelloCard[]
}

interface CardDetail extends TrelloCard {
  checklists: TrelloChecklist[]
  labels: TrelloLabel[]
  comments: (TrelloCardComment & { profile?: Pick<Profile, 'full_name' | 'avatar_url'> })[]
  attachments: TrelloCardAttachment[]
  assignees: (TrelloCardAssignee & { profile?: Pick<Profile, 'full_name' | 'avatar_url'> })[]
}

function buildPlaceholderDetail(card: TrelloCard): CardDetail {
  return {
    ...card,
    checklists: [],
    labels: [],
    comments: [],
    attachments: [],
    assignees: [],
  }
}

interface TrelloUser {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
}

// ─── Helpers ───────────────────────────────────────────────────

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const hasBody = opts?.body != null
  const res = await fetch(url, {
    credentials: 'include',
    ...opts,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...opts?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' })) as {
      error?: string
      hint?: string
      details?: string
      code?: string
    }
    const parts = [err.error, err.hint, err.details].filter(Boolean)
    throw new Error(parts.join(' — ') || `HTTP ${res.status}`)
  }
  return res.json()
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function priorityLabel(p: number | null) {
  if (!p) return null
  const map: Record<number, string> = { 5: 'Mínima', 6: 'Baixa', 7: 'Normal', 8: 'Alta', 9: 'Urgente', 10: 'Crítica' }
  return map[p] || `P${p}`
}

function priorityColor(p: number | null) {
  if (!p) return 'default' as const
  if (p >= 10) return 'danger' as const
  if (p >= 9) return 'danger' as const
  if (p >= 8) return 'warning' as const
  if (p >= 7) return 'info' as const
  return 'default' as const
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Main Page ─────────────────────────────────────────────────

export default function TrelloPage() {
  const [boards, setBoards] = useState<TrelloBoard[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [lists, setLists] = useState<ListWithCards[]>([])
  const [boardLabels, setBoardLabels] = useState<TrelloLabel[]>([])
  const [users, setUsers] = useState<TrelloUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLists, setLoadingLists] = useState(false)

  const [showNewBoard, setShowNewBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creatingBoard, setCreatingBoard] = useState(false)

  const [addingCardToList, setAddingCardToList] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')

  const [showAddList, setShowAddList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')

  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null)
  const [cardModalOpen, setCardModalOpen] = useState(false)

  const [boardMenuOpen, setBoardMenuOpen] = useState(false)
  const [listMenuOpen, setListMenuOpen] = useState<string | null>(null)

  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [dragOverListId, setDragOverListId] = useState<string | null>(null)
  const [cardDetailLoading, setCardDetailLoading] = useState(false)

  const boardSelectRef = useRef<HTMLDivElement>(null)
  /** Evita setState a cada dragOver (centenas de eventos/segundo). */
  const dragOverListIdRef = useRef<string | null>(null)

  // ─── Load boards (só no mount — não recarregar ao trocar de quadro) ──

  const loadLists = useCallback(async (boardId: string) => {
    setLoadingLists(true)
    try {
      const data = await api<ListWithCards[]>(`/api/trello/boards/${boardId}/lists`)
      setLists(data)
    } catch {
      toast.error('Erro ao carregar listas')
    } finally {
      setLoadingLists(false)
    }
  }, [])

  const loadLabels = useCallback(async (boardId: string) => {
    try {
      const data = await api<TrelloLabel[]>(`/api/trello/boards/${boardId}/labels`)
      setBoardLabels(data)
    } catch { /* silent */ }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const data = await api<TrelloUser[]>('/api/trello/users')
      setUsers(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api<TrelloBoard[]>('/api/trello/boards')
        if (cancelled) return
        setBoards(data)
        setSelectedBoardId((prev) => prev ?? data[0]?.id ?? null)
      } catch {
        toast.error('Erro ao carregar quadros')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    loadUsers()
    return () => {
      cancelled = true
    }
  }, [loadUsers])

  useEffect(() => {
    if (selectedBoardId) {
      loadLists(selectedBoardId)
      loadLabels(selectedBoardId)
    }
  }, [selectedBoardId, loadLists, loadLabels])

  // ─── Board CRUD ───────────────────────────────────────────

  async function createBoard() {
    if (!newBoardName.trim()) return
    setCreatingBoard(true)
    try {
      const board = await api<TrelloBoard>('/api/trello/boards', {
        method: 'POST',
        body: JSON.stringify({ name: newBoardName.trim() }),
      })
      setBoards(prev => [...prev, board])
      setSelectedBoardId(board.id)
      setNewBoardName('')
      setShowNewBoard(false)
      toast.success('Quadro criado')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreatingBoard(false)
    }
  }

  async function deleteBoard() {
    if (!selectedBoardId) return
    if (!confirm('Excluir este quadro e todos os seus dados?')) return
    try {
      await api(`/api/trello/boards/${selectedBoardId}`, { method: 'DELETE' })
      setBoards(prev => prev.filter(b => b.id !== selectedBoardId))
      setSelectedBoardId(boards.find(b => b.id !== selectedBoardId)?.id || null)
      setLists([])
      toast.success('Quadro excluído')
    } catch (e: any) {
      toast.error(e.message)
    }
    setBoardMenuOpen(false)
  }

  // ─── List CRUD ────────────────────────────────────────────

  async function createList() {
    if (!newListTitle.trim() || !selectedBoardId) return
    try {
      const list = await api<TrelloList>(`/api/trello/boards/${selectedBoardId}/lists`, {
        method: 'POST',
        body: JSON.stringify({ title: newListTitle.trim(), position: lists.length }),
      })
      setLists(prev => [...prev, { ...list, cards: [] }])
      setNewListTitle('')
      setShowAddList(false)
      toast.success('Lista criada')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function deleteList(listId: string) {
    if (!confirm('Excluir esta lista e todos os cartões?')) return
    try {
      await api(`/api/trello/lists/${listId}`, { method: 'DELETE' })
      setLists(prev => prev.filter(l => l.id !== listId))
      toast.success('Lista excluída')
    } catch (e: any) {
      toast.error(e.message)
    }
    setListMenuOpen(null)
  }

  // ─── Card CRUD ────────────────────────────────────────────

  async function createCard(listId: string) {
    if (!newCardTitle.trim()) return
    try {
      const card = await api<TrelloCard>(`/api/trello/lists/${listId}/cards`, {
        method: 'POST',
        body: JSON.stringify({ title: newCardTitle.trim() }),
      })
      setLists(prev => prev.map(l =>
        l.id === listId ? { ...l, cards: [...l.cards, card] } : l
      ))
      setNewCardTitle('')
      setAddingCardToList(null)
      toast.success('Cartão criado')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const openCardDetail = useCallback(async (card: TrelloCard) => {
    setSelectedCard(buildPlaceholderDetail(card))
    setCardModalOpen(true)
    setCardDetailLoading(true)
    try {
      const detail = await api<CardDetail>(`/api/trello/cards/${card.id}`)
      setSelectedCard(detail)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao abrir cartão'
      toast.error(msg)
      setCardModalOpen(false)
      setSelectedCard(null)
    } finally {
      setCardDetailLoading(false)
    }
  }, [])

  async function updateCard(cardId: string, data: Partial<TrelloCard>) {
    try {
      const updated = await api<TrelloCard>(`/api/trello/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      setLists(prev => prev.map(l => ({
        ...l,
        cards: l.cards.map(c => c.id === cardId ? { ...c, ...updated } : c),
      })))
      if (selectedCard?.id === cardId) {
        setSelectedCard(prev => prev ? { ...prev, ...updated } : prev)
      }
      return updated
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function deleteCard(cardId: string) {
    if (!confirm('Excluir este cartão?')) return
    try {
      await api(`/api/trello/cards/${cardId}`, { method: 'DELETE' })
      setLists(prev => prev.map(l => ({
        ...l,
        cards: l.cards.filter(c => c.id !== cardId),
      })))
      setCardModalOpen(false)
      setSelectedCard(null)
      toast.success('Cartão excluído')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ─── Drag & Drop ──────────────────────────────────────────

  const handleDragStart = useCallback((e: DragEvent, cardId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', cardId)
    setDraggedCardId(cardId)
  }, [])

  const handleDragOver = useCallback((e: DragEvent, listId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverListIdRef.current !== listId) {
      dragOverListIdRef.current = listId
      setDragOverListId(listId)
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    dragOverListIdRef.current = null
    setDragOverListId(null)
  }, [])

  const handleDrop = useCallback(async (e: DragEvent, targetListId: string) => {
    e.preventDefault()
    dragOverListIdRef.current = null
    setDragOverListId(null)
    const cardId = e.dataTransfer.getData('text/plain')
    if (!cardId) return

    const sourceList = lists.find(l => l.cards.some(c => c.id === cardId))
    if (!sourceList) return
    if (sourceList.id === targetListId) { setDraggedCardId(null); return }

    const card = sourceList.cards.find(c => c.id === cardId)
    if (!card) return

    const targetList = lists.find(l => l.id === targetListId)
    const newPosition = targetList ? targetList.cards.length : 0

    setLists(prev => prev.map(l => {
      if (l.id === sourceList.id) return { ...l, cards: l.cards.filter(c => c.id !== cardId) }
      if (l.id === targetListId) return { ...l, cards: [...l.cards, { ...card, list_id: targetListId, position: newPosition }] }
      return l
    }))

    setDraggedCardId(null)

    try {
      await api(`/api/trello/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify({ list_id: targetListId, position: newPosition }),
      })
    } catch {
      if (selectedBoardId) loadLists(selectedBoardId)
      toast.error('Erro ao mover cartão')
    }
  }, [lists, selectedBoardId, loadLists])

  // ─── Render ───────────────────────────────────────────────

  const selectedBoard = boards.find(b => b.id === selectedBoardId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-4rem)]">
      <PageHeader
        title="Trello"
        description="Gerencie tarefas e projetos com quadros Kanban"
        action={
          <Button onClick={() => setShowNewBoard(true)} size="sm">
            <Plus size={16} /> Novo Quadro
          </Button>
        }
      />

      {/* Board selector */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative" ref={boardSelectRef}>
          <button
            onClick={() => setBoardMenuOpen(!boardMenuOpen)}
            className={cn(
              'flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm',
              'hover:bg-surface-3 transition-colors min-w-[200px]'
            )}
          >
            <Columns3 size={16} className="text-brand-500 shrink-0" />
            <span className="truncate">{selectedBoard?.name || 'Selecionar quadro'}</span>
            <ChevronDown size={14} className="ml-auto shrink-0 text-text-muted" />
          </button>
          {boardMenuOpen && (
            <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-border bg-surface-2 shadow-xl">
              <div className="max-h-60 overflow-y-auto p-1">
                {boards.map(board => (
                  <button
                    key={board.id}
                    onClick={() => { setSelectedBoardId(board.id); setBoardMenuOpen(false) }}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                      board.id === selectedBoardId
                        ? 'bg-gold-400/10 text-gold-400'
                        : 'text-text-primary hover:bg-surface-3'
                    )}
                  >
                    {board.name}
                  </button>
                ))}
                {boards.length === 0 && (
                  <p className="px-3 py-2 text-sm text-text-muted">Nenhum quadro</p>
                )}
              </div>
              {selectedBoard && (
                <div className="border-t border-border p-1">
                  <button
                    onClick={deleteBoard}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} className="mr-2 inline" />
                    Excluir quadro
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New board modal */}
      <Modal open={showNewBoard} onClose={() => setShowNewBoard(false)} title="Novo Quadro">
        <div className="space-y-4">
          <Input
            label="Nome do quadro"
            value={newBoardName}
            onChange={e => setNewBoardName(e.target.value)}
            placeholder="Ex: Sprint 12"
            onKeyDown={e => e.key === 'Enter' && createBoard()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNewBoard(false)}>Cancelar</Button>
            <Button size="sm" loading={creatingBoard} onClick={createBoard}>Criar</Button>
          </div>
        </div>
      </Modal>

      {/* Board content */}
      {!selectedBoardId ? (
        <EmptyState
          icon={Columns3}
          title="Nenhum quadro selecionado"
          description="Crie um novo quadro para começar a organizar suas tarefas"
          action={<Button onClick={() => setShowNewBoard(true)} size="sm"><Plus size={16} /> Criar Quadro</Button>}
        />
      ) : loadingLists ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-4 h-full items-start min-w-max px-0.5">
            {lists.map(list => (
              <KanbanList
                key={list.id}
                list={list}
                onOpenCard={openCardDetail}
                onCreateCard={createCard}
                onDeleteList={deleteList}
                addingCardToList={addingCardToList}
                setAddingCardToList={setAddingCardToList}
                newCardTitle={newCardTitle}
                setNewCardTitle={setNewCardTitle}
                listMenuOpen={listMenuOpen}
                setListMenuOpen={setListMenuOpen}
                draggedCardId={draggedCardId}
                dragOverListId={dragOverListId}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            ))}

            {/* Add list */}
            <div className="w-72 shrink-0">
              {showAddList ? (
                <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-2">
                  <Input
                    value={newListTitle}
                    onChange={e => setNewListTitle(e.target.value)}
                    placeholder="Nome da lista"
                    onKeyDown={e => e.key === 'Enter' && createList()}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={createList}>Criar</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowAddList(false); setNewListTitle('') }}>
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddList(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2/50 px-4 py-3 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary hover:border-gold-400/50 transition-colors"
                >
                  <Plus size={16} /> Adicionar lista
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card detail modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          open={cardModalOpen}
          detailLoading={cardDetailLoading}
          onClose={() => { setCardModalOpen(false); setSelectedCard(null); setCardDetailLoading(false) }}
          boardLabels={boardLabels}
          users={users}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onRefresh={() => selectedCard && openCardDetail(selectedCard)}
          boardId={selectedBoardId!}
          onLabelsChange={() => selectedBoardId && loadLabels(selectedBoardId)}
        />
      )}
    </div>
  )
}

// ─── KanbanList ────────────────────────────────────────────────

interface KanbanListProps {
  list: ListWithCards
  onOpenCard: (card: TrelloCard) => void
  onCreateCard: (listId: string) => void
  onDeleteList: (listId: string) => void
  addingCardToList: string | null
  setAddingCardToList: (id: string | null) => void
  newCardTitle: string
  setNewCardTitle: (v: string) => void
  listMenuOpen: string | null
  setListMenuOpen: (id: string | null) => void
  draggedCardId: string | null
  dragOverListId: string | null
  onDragStart: (e: DragEvent, cardId: string) => void
  onDragOver: (e: DragEvent, listId: string) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent, listId: string) => void
}

const KanbanList = memo(function KanbanList({
  list, onOpenCard, onCreateCard, onDeleteList,
  addingCardToList, setAddingCardToList, newCardTitle, setNewCardTitle,
  listMenuOpen, setListMenuOpen,
  draggedCardId, dragOverListId,
  onDragStart, onDragOver, onDragLeave, onDrop,
}: KanbanListProps) {
  const isAdding = addingCardToList === list.id
  const isDragOver = dragOverListId === list.id

  const sortedCards = useMemo(
    () => [...list.cards].sort((a, b) => a.position - b.position),
    [list.cards]
  )

  return (
    <div
      className={cn(
        'w-72 shrink-0 flex flex-col rounded-xl border bg-surface-2 transition-colors max-h-full',
        isDragOver ? 'border-gold-400 bg-gold-400/5' : 'border-border'
      )}
      onDragOver={e => onDragOver(e, list.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, list.id)}
    >
      {/* List header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
        {list.color && (
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
        )}
        <h3 className="text-sm font-semibold text-text-primary truncate flex-1">{list.title}</h3>
        <span className="text-xs text-text-muted">{list.cards.length}</span>
        <div className="relative">
          <button
            onClick={() => setListMenuOpen(listMenuOpen === list.id ? null : list.id)}
            className="rounded p-1 text-text-muted hover:bg-surface-3 hover:text-text-primary transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          {listMenuOpen === list.id && (
            <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-border bg-surface-2 shadow-xl p-1">
              <button
                onClick={() => onDeleteList(list.id)}
                className="w-full rounded-md px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} className="mr-2 inline" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[2rem] touch-pan-y">
        {sortedCards.map(card => (
          <KanbanCard
            key={card.id}
            card={card}
            onOpen={() => onOpenCard(card)}
            onDragStart={onDragStart}
            isDragging={draggedCardId === card.id}
          />
        ))}
      </div>

      {/* Add card form */}
      <div className="p-2 pt-0">
        {isAdding ? (
          <div className="space-y-2">
            <textarea
              value={newCardTitle}
              onChange={e => setNewCardTitle(e.target.value)}
              placeholder="Título do cartão..."
              className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50 resize-none"
              rows={2}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCreateCard(list.id) }
                if (e.key === 'Escape') { setAddingCardToList(null); setNewCardTitle('') }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onCreateCard(list.id)}>Criar</Button>
              <Button variant="ghost" size="sm" onClick={() => { setAddingCardToList(null); setNewCardTitle('') }}>
                <X size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAddingCardToList(list.id); setNewCardTitle('') }}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-text-muted hover:bg-surface-3 hover:text-text-secondary transition-colors"
          >
            <Plus size={14} /> Adicionar cartão
          </button>
        )}
      </div>
    </div>
  )
})

// ─── KanbanCard ────────────────────────────────────────────────

interface KanbanCardProps {
  card: TrelloCard
  onOpen: () => void
  onDragStart: (e: DragEvent, cardId: string) => void
  isDragging: boolean
}

const KanbanCard = memo(function KanbanCard({ card, onOpen, onDragStart, isDragging }: KanbanCardProps) {
  const isOverdue = card.due_date && new Date(card.due_date) < new Date() && !card.is_completed
  const suppressClickRef = useRef(false)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onDragEnd={() => {
        suppressClickRef.current = true
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 150)
      }}
      onClick={() => {
        if (suppressClickRef.current) return
        onOpen()
      }}
      className={cn(
        'rounded-lg border border-border bg-surface-3 p-3 cursor-grab active:cursor-grabbing select-none',
        'hover:border-border-light transition-[opacity,box-shadow] duration-150',
        isDragging && 'opacity-50 shadow-md',
        card.is_completed && 'opacity-60'
      )}
    >
      {card.cover_color && (
        <div className="h-1.5 -mx-3 -mt-3 mb-2 rounded-t-lg" style={{ backgroundColor: card.cover_color }} />
      )}

      <p className={cn(
        'text-sm font-medium text-text-primary leading-snug',
        card.is_completed && 'line-through'
      )}>
        {card.title}
      </p>

      {/* Card metadata row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {card.is_completed && (
          <Badge variant="success" className="text-[10px] px-1.5 py-0">
            <Check size={10} className="mr-0.5" /> Concluído
          </Badge>
        )}

        {card.priority && (
          <Badge variant={priorityColor(card.priority)} className="text-[10px] px-1.5 py-0">
            {priorityLabel(card.priority)}
          </Badge>
        )}

        {card.due_date && (
          <span className={cn(
            'inline-flex items-center gap-1 text-[10px]',
            isOverdue ? 'text-red-400' : 'text-text-muted'
          )}>
            <Calendar size={10} />
            {format(new Date(card.due_date), 'dd/MM', { locale: ptBR })}
          </span>
        )}

        {card.progress > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
            <CircleDot size={10} />
            {card.progress}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {card.progress > 0 && (
        <div className="mt-2 h-1 rounded-full bg-surface-4 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              card.progress === 100 ? 'bg-green-500' : 'bg-gold-400'
            )}
            style={{ width: `${card.progress}%` }}
          />
        </div>
      )}
    </div>
  )
})

// ─── CardDetailModal ───────────────────────────────────────────

interface CardDetailModalProps {
  card: CardDetail
  open: boolean
  detailLoading?: boolean
  onClose: () => void
  boardLabels: TrelloLabel[]
  users: TrelloUser[]
  onUpdate: (cardId: string, data: Partial<TrelloCard>) => Promise<TrelloCard | undefined>
  onDelete: (cardId: string) => void
  onRefresh: () => void
  boardId: string
  onLabelsChange: () => void
}

function CardDetailModal({
  card, open, detailLoading, onClose, boardLabels, users,
  onUpdate, onDelete, onRefresh, boardId, onLabelsChange,
}: CardDetailModalProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [editingDesc, setEditingDesc] = useState(false)

  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [newItemText, setNewItemText] = useState<Record<string, string>>({})
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null)

  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<'details' | 'checklists' | 'comments' | 'attachments'>('details')

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description || '')
  }, [card.title, card.description])

  async function saveTitle() {
    if (title.trim() && title !== card.title) {
      await onUpdate(card.id, { title: title.trim() })
    }
    setEditingTitle(false)
  }

  async function saveDescription() {
    if (description !== (card.description || '')) {
      await onUpdate(card.id, { description: description || null })
    }
    setEditingDesc(false)
  }

  async function toggleComplete() {
    await onUpdate(card.id, { is_completed: !card.is_completed })
    onRefresh()
  }

  // Labels
  async function toggleLabel(labelId: string) {
    const hasLabel = card.labels.some(l => l.id === labelId)
    try {
      if (hasLabel) {
        await api(`/api/trello/cards/${card.id}/labels?label_id=${labelId}`, { method: 'DELETE' })
      } else {
        await api(`/api/trello/cards/${card.id}/labels`, {
          method: 'POST',
          body: JSON.stringify({ label_id: labelId }),
        })
      }
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Assignees
  async function toggleAssignee(userId: string) {
    const isAssigned = card.assignees.some(a => a.user_id === userId)
    try {
      if (isAssigned) {
        await api(`/api/trello/cards/${card.id}/assignees?user_id=${userId}`, { method: 'DELETE' })
      } else {
        await api(`/api/trello/cards/${card.id}/assignees`, {
          method: 'POST',
          body: JSON.stringify({ user_id: userId }),
        })
      }
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Checklists
  async function createChecklist() {
    if (!newChecklistTitle.trim()) return
    try {
      await api(`/api/trello/cards/${card.id}/checklists`, {
        method: 'POST',
        body: JSON.stringify({ title: newChecklistTitle.trim() }),
      })
      setNewChecklistTitle('')
      setAddingChecklist(false)
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function deleteChecklist(clId: string) {
    try {
      await api(`/api/trello/checklists/${clId}`, { method: 'DELETE' })
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function createChecklistItem(clId: string) {
    const text = newItemText[clId]?.trim()
    if (!text) return
    try {
      await api(`/api/trello/checklists/${clId}/items`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      setNewItemText(prev => ({ ...prev, [clId]: '' }))
      setAddingItemTo(null)
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function toggleChecklistItem(item: TrelloChecklistItem) {
    try {
      await api(`/api/trello/checklist-items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_checked: !item.is_checked }),
      })
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function deleteChecklistItem(itemId: string) {
    try {
      await api(`/api/trello/checklist-items/${itemId}`, { method: 'DELETE' })
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Comments
  async function addComment() {
    if (!newComment.trim()) return
    setSubmittingComment(true)
    try {
      await api(`/api/trello/cards/${card.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: newComment.trim() }),
      })
      setNewComment('')
      onRefresh()
      toast.success('Comentário adicionado')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmittingComment(false)
    }
  }

  // Attachments
  async function uploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const supabase = createClient()
      const path = `cards/${card.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('trello-attachments')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('trello-attachments')
        .getPublicUrl(path)

      await api(`/api/trello/cards/${card.id}/attachments`, {
        method: 'POST',
        body: JSON.stringify({
          file_name: file.name,
          file_path: path,
          file_url: urlData.publicUrl,
          file_size: file.size,
        }),
      })
      onRefresh()
      toast.success('Anexo adicionado')
    } catch (e: any) {
      toast.error(e.message || 'Erro no upload')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function deleteAttachment(attId: string) {
    try {
      await api(`/api/trello/cards/${card.id}/attachments/${attId}`, { method: 'DELETE' })
      onRefresh()
      toast.success('Anexo removido')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const totalCheckItems = card.checklists.reduce((sum, cl) => sum + (cl.items?.length || 0), 0)
  const checkedItems = card.checklists.reduce(
    (sum, cl) => sum + (cl.items?.filter(i => i.is_checked).length || 0), 0
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col sm:max-w-2xl w-full"
    >
      <div className="flex items-start justify-between border-b border-border px-5 py-4 shrink-0">
        <div className="flex-1 min-w-0 mr-3">
          {editingTitle ? (
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => e.key === 'Enter' && saveTitle()}
              className="w-full bg-transparent text-lg font-semibold text-text-primary border-b border-gold-500 focus:outline-none pb-0.5"
              autoFocus
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className={cn(
                'text-lg font-semibold cursor-pointer hover:text-gold-400 transition-colors truncate',
                card.is_completed && 'line-through text-text-secondary'
              )}
            >
              {card.title}
            </h2>
          )}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {card.labels.map(label => (
                <span
                  key={label.id}
                  className="inline-block rounded px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-3 hover:text-text-primary transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-border px-5 shrink-0">
        {([
          { key: 'details' as const, label: 'Detalhes', icon: Edit3 },
          { key: 'checklists' as const, label: 'Checklists', icon: CheckSquare, count: totalCheckItems > 0 ? `${checkedItems}/${totalCheckItems}` : undefined },
          { key: 'comments' as const, label: 'Comentários', icon: MessageSquare, count: card.comments.length > 0 ? String(card.comments.length) : undefined },
          { key: 'attachments' as const, label: 'Anexos', icon: Paperclip, count: card.attachments.length > 0 ? String(card.attachments.length) : undefined },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            )}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count && (
              <span className="rounded-full bg-surface-4 px-1.5 py-0.5 text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="relative flex-1 overflow-y-auto p-5 space-y-5">
        {detailLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-2/70 backdrop-blur-[1px] rounded-b-xl">
            <Loader2 className="h-8 w-8 animate-spin text-gold-400" aria-label="Carregando" />
          </div>
        )}
        {activeTab === 'details' && (
          <>
            {/* Actions row */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={card.is_completed ? 'secondary' : 'primary'}
                size="sm"
                onClick={toggleComplete}
              >
                <Check size={14} />
                {card.is_completed ? 'Reabrir' : 'Concluir'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowLabelPicker(!showLabelPicker)}>
                <Tag size={14} /> Etiquetas
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAssigneePicker(!showAssigneePicker)}>
                <Users size={14} /> Responsáveis
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDatePicker(!showDatePicker)}>
                <Calendar size={14} /> Data
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(card.id)} className="ml-auto">
                <Trash2 size={14} /> Excluir
              </Button>
            </div>

            {/* Label picker */}
            {showLabelPicker && (
              <div className="rounded-lg border border-border bg-surface-3 p-3">
                <p className="text-xs font-medium text-text-secondary mb-2">Etiquetas do quadro</p>
                {boardLabels.length === 0 ? (
                  <p className="text-xs text-text-muted">Nenhuma etiqueta criada</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {boardLabels.map(label => {
                      const isActive = card.labels.some(l => l.id === label.id)
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className={cn(
                            'rounded px-3 py-1 text-xs font-medium text-white transition-all',
                            isActive ? 'ring-2 ring-white/40 scale-105' : 'opacity-60 hover:opacity-100'
                          )}
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Assignee picker */}
            {showAssigneePicker && (
              <div className="rounded-lg border border-border bg-surface-3 p-3">
                <p className="text-xs font-medium text-text-secondary mb-2">Atribuir responsáveis</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {users.map(user => {
                    const isAssigned = card.assignees.some(a => a.user_id === user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleAssignee(user.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                          isAssigned ? 'bg-gold-400/10 text-gold-400' : 'text-text-primary hover:bg-surface-4'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                          isAssigned ? 'bg-gold-400 text-brand-900' : 'bg-surface-4 text-text-secondary'
                        )}>
                          {getInitials(user.full_name)}
                        </div>
                        <span className="truncate">{user.full_name}</span>
                        {isAssigned && <Check size={14} className="ml-auto shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Date picker */}
            {showDatePicker && (
              <div className="rounded-lg border border-border bg-surface-3 p-3">
                <p className="text-xs font-medium text-text-secondary mb-2">Data de vencimento</p>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={card.due_date ? format(new Date(card.due_date), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={e => onUpdate(card.id, { due_date: e.target.value ? new Date(e.target.value).toISOString() : null }).then(() => onRefresh())}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                  />
                  {card.due_date && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdate(card.id, { due_date: null }).then(() => onRefresh())}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Descrição</p>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50 resize-y"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveDescription}>Salvar</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setDescription(card.description || ''); setEditingDesc(false) }}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className="min-h-[3rem] cursor-pointer rounded-lg border border-transparent px-3 py-2 text-sm text-text-secondary hover:border-border hover:bg-surface-3 transition-colors whitespace-pre-wrap"
                >
                  {card.description || 'Clique para adicionar uma descrição...'}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Prioridade</p>
              <div className="flex gap-1.5 flex-wrap">
                {[5, 6, 7, 8, 9, 10].map(p => (
                  <button
                    key={p}
                    onClick={() => onUpdate(card.id, { priority: card.priority === p ? null : p }).then(() => onRefresh())}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors border',
                      card.priority === p
                        ? 'border-gold-400 bg-gold-400/10 text-gold-400'
                        : 'border-border text-text-muted hover:bg-surface-3 hover:text-text-secondary'
                    )}
                  >
                    {priorityLabel(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">
                Progresso: <span className="text-text-primary">{card.progress}%</span>
              </p>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={card.progress}
                onChange={e => onUpdate(card.id, { progress: Number(e.target.value) })}
                className="w-full accent-gold-400"
              />
            </div>

            {/* Assignees display */}
            {card.assignees.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-secondary mb-1.5">Responsáveis</p>
                <div className="flex flex-wrap gap-2">
                  {card.assignees.map(a => (
                    <div key={a.user_id} className="flex items-center gap-1.5 rounded-full bg-surface-3 pl-1 pr-2.5 py-0.5">
                      <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-[9px] font-bold text-white">
                        {getInitials(a.profile?.full_name)}
                      </div>
                      <span className="text-xs text-text-primary">{a.profile?.full_name || 'Usuário'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta info */}
            <div className="text-[11px] text-text-muted space-y-0.5 pt-2 border-t border-border">
              <p>Criado {formatDistanceToNow(new Date(card.created_at), { addSuffix: true, locale: ptBR })}</p>
              {card.completed_at && (
                <p>Concluído {formatDistanceToNow(new Date(card.completed_at), { addSuffix: true, locale: ptBR })}</p>
              )}
            </div>
          </>
        )}

        {activeTab === 'checklists' && (
          <>
            {card.checklists.map(cl => {
              const items = cl.items || []
              const done = items.filter(i => i.is_checked).length
              const total = items.length
              const pct = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <div key={cl.id} className="rounded-lg border border-border bg-surface-3 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-brand-500" />
                      <span className="text-sm font-medium">{cl.title}</span>
                      {total > 0 && (
                        <span className="text-[10px] text-text-muted">{done}/{total}</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteChecklist(cl.id)}
                      className="rounded p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {total > 0 && (
                    <div className="h-1 rounded-full bg-surface-4 mb-2 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-gold-400')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    {items.sort((a, b) => a.position - b.position).map(item => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => toggleChecklistItem(item)}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            item.is_checked
                              ? 'bg-gold-400 border-gold-400'
                              : 'border-border hover:border-gold-400'
                          )}
                        >
                          {item.is_checked && <Check size={10} className="text-white" />}
                        </button>
                        <span className={cn(
                          'text-sm flex-1',
                          item.is_checked && 'line-through text-text-muted'
                        )}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => deleteChecklistItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-text-muted hover:text-red-400 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {addingItemTo === cl.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={newItemText[cl.id] || ''}
                        onChange={e => setNewItemText(prev => ({ ...prev, [cl.id]: e.target.value }))}
                        placeholder="Novo item..."
                        className="flex-1 rounded border border-border bg-surface-2 px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-gold-400/50"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') createChecklistItem(cl.id)
                          if (e.key === 'Escape') setAddingItemTo(null)
                        }}
                      />
                      <Button size="sm" onClick={() => createChecklistItem(cl.id)}>
                        <Plus size={14} />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingItemTo(cl.id)}
                      className="mt-2 flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
                    >
                      <Plus size={12} /> Adicionar item
                    </button>
                  )}
                </div>
              )
            })}

            {addingChecklist ? (
              <div className="flex gap-2">
                <Input
                  value={newChecklistTitle}
                  onChange={e => setNewChecklistTitle(e.target.value)}
                  placeholder="Título do checklist"
                  onKeyDown={e => {
                    if (e.key === 'Enter') createChecklist()
                    if (e.key === 'Escape') setAddingChecklist(false)
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={createChecklist}><Plus size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => setAddingChecklist(false)}><X size={14} /></Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAddingChecklist(true)}>
                <Plus size={14} /> Novo checklist
              </Button>
            )}
          </>
        )}

        {activeTab === 'comments' && (
          <>
            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                rows={3}
                className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold-400/50 resize-none"
              />
              <Button size="sm" onClick={addComment} loading={submittingComment} disabled={!newComment.trim()}>
                Comentar
              </Button>
            </div>

            <div className="space-y-3 mt-4">
              {card.comments.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">Nenhum comentário</p>
              ) : (
                card.comments
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(comment => (
                    <div key={comment.id} className="rounded-lg border border-border bg-surface-3 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-surface-4 flex items-center justify-center text-[10px] font-bold text-text-secondary">
                          {getInitials(comment.profile?.full_name)}
                        </div>
                        <span className="text-xs font-medium text-text-primary">{comment.profile?.full_name || 'Usuário'}</span>
                        <span className="text-[10px] text-text-muted ml-auto">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))
              )}
            </div>
          </>
        )}

        {activeTab === 'attachments' && (
          <>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={uploadAttachment}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploadingFile}
              >
                <Upload size={14} /> Enviar arquivo
              </Button>
            </div>

            <div className="space-y-2 mt-3">
              {card.attachments.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">Nenhum anexo</p>
              ) : (
                card.attachments
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(att => (
                    <div key={att.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-3 p-3 group">
                      <div className="w-8 h-8 rounded bg-surface-4 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-text-primary hover:text-gold-400 transition-colors truncate block"
                        >
                          {att.file_name}
                        </a>
                        <p className="text-[10px] text-text-muted">
                          {formatFileSize(att.file_size)} · {formatDistanceToNow(new Date(att.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAttachment(att.id)}
                        className="opacity-0 group-hover:opacity-100 rounded p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
