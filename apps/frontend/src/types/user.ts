export type PanelStatus = 'pending' | 'active' | 'disabled';
export type PanelRole = 'admin' | 'operator' | 'viewer';
export interface PanelUser {
  id: string; username: string; email: string | null;
  status: PanelStatus; role: PanelRole; createdAt: string; lastLogin: string | null;
}
