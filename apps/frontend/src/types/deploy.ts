// apps/frontend/src/types/deploy.ts
export type DeployKind = 'game' | 'db';
export interface TagInfo {
  name: string;
  createdAt: string;
  sizeMb: number;
  isRunning: boolean;
  deployable: boolean;
  note: string | null;
}
export interface DeployTags {
  game: TagInfo[];
  db: TagInfo[];
  currentGame: string | null;
  currentDb: string | null;
}
export type DeployStatus = 'running' | 'success' | 'failed' | 'rolled_back';
export interface DeployEvent {
  type: 'log' | 'step' | 'done' | 'failed' | 'rollback';
  step?: string; status?: 'start' | 'ok' | 'error'; line?: string; error?: string;
}
export interface Deployment {
  id: string; kind: DeployKind; serviceScope: string; fromTag: string | null; toTag: string;
  status: DeployStatus; step: string | null; error: string | null;
  userId: string; startedAt: string; finishedAt: string | null;
}
