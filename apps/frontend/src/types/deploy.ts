// apps/frontend/src/types/deploy.ts
export interface TagInfo { name: string; deployable: boolean; }
export type DeployStatus = 'running' | 'success' | 'failed' | 'rolled_back';
export interface DeployEvent {
  type: 'log' | 'step' | 'done' | 'failed' | 'rollback';
  step?: string; status?: 'start' | 'ok' | 'error'; line?: string; error?: string;
}
export interface Deployment {
  id: string; serviceScope: string; fromTag: string | null; toTag: string;
  status: DeployStatus; step: string | null; error: string | null;
  userId: string; startedAt: string; finishedAt: string | null;
}
