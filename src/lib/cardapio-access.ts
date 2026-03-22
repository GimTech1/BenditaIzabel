/** Quem pode cadastrar, editar, ativar/desativar e excluir itens do cardápio. */
export const MENU_ITEM_MANAGE_ROLES = ["admin", "gerente", "employee"] as const;

export type MenuItemManageRole = (typeof MENU_ITEM_MANAGE_ROLES)[number];

export function canManageMenuItems(role: string | null | undefined): boolean {
  return (
    !!role &&
    MENU_ITEM_MANAGE_ROLES.includes(role as MenuItemManageRole)
  );
}
