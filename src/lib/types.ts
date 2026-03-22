export type UserRole = "admin" | "gerente" | "employee";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

// ── Trello ──

export interface TrelloBoard {
  id: string;
  name: string;
  department_id: string;
  created_by: string;
  visibility: "all" | "department" | "owner" | "specific";
  visible_to_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrelloList {
  id: string;
  board_id: string;
  title: string;
  position: number;
  color: string | null;
  created_at: string;
}

export interface TrelloCard {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  cover_color: string | null;
  progress: number;
  priority: number | null;
  assigned_to: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrelloChecklist {
  id: string;
  card_id: string;
  title: string;
  position: number;
  created_at: string;
  items?: TrelloChecklistItem[];
}

export interface TrelloChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  position: number;
  is_checked: boolean;
  created_at: string;
}

export interface TrelloLabel {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TrelloCardComment {
  id: string;
  card_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: Pick<Profile, "full_name" | "avatar_url">;
}

export interface TrelloCardAttachment {
  id: string;
  card_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface TrelloCardAssignee {
  card_id: string;
  user_id: string;
  created_at: string;
  profile?: Pick<Profile, "full_name" | "avatar_url">;
}

// ── Bar-specific ──

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  category: string;
  notes: string | null;
  created_at: string;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_qty: number;
  min_qty: number;
  supplier_id: string | null;
  cost_per_unit: number | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseListLine {
  id: string;
  /** Se preenchido, linha vinculada a item existente; se null, item novo (criado ao registrar compra). */
  stock_item_id: string | null;
  quantity: number;
  note: string | null;
  created_at: string;
  /** Preenchidos quando `stock_item_id` é null (cadastro igual ao estoque). */
  name?: string | null;
  category?: string | null;
  unit?: string | null;
  min_qty?: number | null;
  supplier_id?: string | null;
  cost_per_unit?: number | null;
  /** Relação PostgREST ao adicionar `stock_items (...)` no select */
  stock_items?: Pick<StockItem, "id" | "name" | "unit" | "current_qty"> | null;
}

export type FinancePaymentMethod =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "transferencia"
  | "boleto"
  | "nao_informado"
  | "outros";

export type FinanceEntryStatus = "confirmed" | "pending" | "cancelled";

export interface FinanceEntry {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  created_by: string;
  created_at: string;
  payment_method: FinancePaymentMethod;
  status: FinanceEntryStatus;
  supplier_id: string | null;
  notes: string | null;
  reference_code: string | null;
  /** PDF ou XML da NF-e / nota fiscal (Storage público) */
  invoice_file_url: string | null;
  /** Populado em joins opcionais */
  supplier?: Pick<Supplier, "id" | "name"> | null;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  status: "pending" | "ok" | "expired" | "attention";
  expiry_date: string | null;
  notes: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  category: string;
  notes: string | null;
  created_at: string;
}

// ── Cardápio / pedidos mesa ──

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type MenuOrderStatus = "novo" | "em_preparo" | "entregue" | "cancelado";

export interface MenuOrderLine {
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface MenuOrder {
  id: string;
  table_label: string;
  customer_note: string | null;
  status: MenuOrderStatus;
  items: MenuOrderLine[];
  total: number;
  created_at: string;
  updated_at: string;
}
