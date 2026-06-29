// apps/backend/src/deploy/types.ts
export type DeployStatus = 'running' | 'success' | 'failed' | 'rolled_back';
export interface TagInfo { name: string; deployable: boolean; } // deployable: hem game hem db image'ı var
export interface DeployEvent {
  type: 'log' | 'step' | 'done' | 'failed' | 'rollback';
  step?: string;          // 'write-env' | 'compose-up' | 'healthcheck' | ...
  status?: 'start' | 'ok' | 'error';
  line?: string;          // log satırı (compose çıktısı)
  error?: string;
}
