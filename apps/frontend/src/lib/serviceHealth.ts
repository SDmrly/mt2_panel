// Health rozeti gösterimi: Docker healthcheck'i olmayan container'lar (ör. haproxy, ch1, ch99)
// health='none' döndürür — "none" yerine container'ın gerçek çalışma durumunu (running vb.) göster.
export type BadgeVariant = 'success' | 'destructive' | 'warning' | 'outline';

const HEALTH_VARIANT: Record<string, BadgeVariant> = {
  healthy: 'success', unhealthy: 'destructive', starting: 'warning', none: 'outline',
};
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  running: 'success', restarting: 'warning', exited: 'outline', stopped: 'outline',
};

export function healthDisplay(health: string, status: string): { label: string; variant: BadgeVariant } {
  if (health && health !== 'none') {
    return { label: health, variant: HEALTH_VARIANT[health] ?? 'outline' };
  }
  // healthcheck yok → çalışma durumunu göster (none yazma)
  return { label: status, variant: STATUS_VARIANT[status] ?? 'outline' };
}
