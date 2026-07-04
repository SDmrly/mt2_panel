// apps/backend/src/deploy/types.ts
export type DeployStatus = 'running' | 'success' | 'failed' | 'rolled_back';
export type DeployKind = 'game' | 'db';
export interface TagInfo {
  name: string;
  createdAt: string;   // ISO string, image.Created (unix sn) üzerinden
  sizeMb: number;      // image.Size byte -> MB
  isRunning: boolean;  // bu repo için şu an çalışan container'ın image tag'i mi
  deployable: boolean; // !isRunning — çalışmayan tag'ler deploy edilebilir
  note: string | null; // bu tag için release notu (varsa)
}
export interface DeployEvent {
  type: 'log' | 'step' | 'done' | 'failed' | 'rollback';
  step?: string;          // 'write-env' | 'compose-up' | 'healthcheck' | ...
  status?: 'start' | 'ok' | 'error';
  line?: string;          // log satırı (compose çıktısı)
  error?: string;
}
