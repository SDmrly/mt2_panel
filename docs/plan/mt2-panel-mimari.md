# Metin2 Docker Yönetim Paneli — Mimari & Teknik Yol Haritası

> **Revizyon:** v1.1 — 2026-06-28  
> **Kapsam:** Mevcut Docker altyapısı üzerine inşa edilecek React tabanlı yönetim paneli  
> **Varsayım:** Sunucu healthcheck, container orchestration ve volume yönetimi Docker Compose seviyesinde tamamlanmış durumda.

---

## İçindekiler

1. [Mimari Genel Bakış](#1-mimari-genel-bakış)
2. [Tech Stack](#2-tech-stack)
3. [Proje Dizin Yapısı](#3-proje-dizin-yapısı)
4. [Backend Mimarisi (NestJS)](#4-backend-mimarisi-nestjs)
5. [Frontend Mimarisi (React)](#5-frontend-mimarisi-react)
6. [Güvenlik Katmanı](#6-güvenlik-katmanı)
7. [Docker Entegrasyonu](#7-docker-entegrasyonu)
8. [WebSocket & Log Streaming](#8-websocket--log-streaming)
9. [Deployment & Rollback Sistemi](#9-deployment--rollback-sistemi)
10. [Geliştirme Yol Haritası](#10-geliştirme-yol-haritası)
11. [Ortam Değişkenleri & .env Yapısı](#11-ortam-değişkenleri--env-yapısı)
12. [Şifre Hashing — SHA-256 Politikası](#12-şifre-hashing--sha-256-politikası)
13. [Token-Only URL Politikası](#13-token-only-url-politikası)

---

## 1. Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ERİŞİM KATMANI                              │
│               VPN / Cloudflare Access / 2FA                         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────────┐
│                     TRAEFİK (Reverse Proxy)                          │
│          TLS Termination · Rate Limiting · Access Logs              │
└─────────────┬───────────────────────────┬───────────────────────────┘
              │                           │
┌─────────────▼──────────┐  ┌─────────────▼──────────────────────────┐
│    REACT FRONTEND      │  │        NESTJS BACKEND (API)            │
│    Vite + Tailwind     │◄►│    REST + WebSocket Gateway            │
│    Shadcn UI           │  │    JWT Auth · Command Whitelist        │
│    TanStack Query      │  │    Dockerode · Redis Bull Queue        │
└────────────────────────┘  └─────────────┬──────────────────────────┘
                                           │
                ┌──────────────────────────▼──────────────────────────┐
                │            DOCKER SOCKET PROXY                      │
                │          (Read-Only · Whitelisted Endpoints)        │
                └──────────────────────────┬──────────────────────────┘
                                           │
┌──────────────────────────────────────────▼──────────────────────────┐
│                    DOCKER ENGINE  (network: mt2net)                  │
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────────────────────────────┐ │
│  │  metin2_database│   │           metin2-game image              │ │
│  │  mariadb:10.4   │   │  (multi-role: auth · ch1 · ch99 · qc)   │ │
│  │  :3306 (local)  │   ├──────────┬──────────┬────────────────────┤ │
│  └────────┬────────┘   │metin2_db │metin2_auth│metin2_ch1/ch99    │ │
│           │            │:30000    │:30001/2   │:30003-30006        │ │
│           └────────────┴──────────┴──────────┴────────────────────┘ │
│                                                                      │
│  ┌──────────────────┐   ┌──────────────────────────────────────────┐ │
│  │    haproxy:2.9   │   │          quest-compiler                  │ │
│  │  :30001/:30003   │   │  (restart:no — tek seferlik)             │ │
│  │  :30005 → host   │   └──────────────────────────────────────────┘ │
│  └──────────────────┘                                                │
│                                                                      │
│  Volumes: metin2-database-data · mark · ./state/* · ./content/*     │
└──────────────────────────────────────────────────────────────────────┘
```

**Temel Prensipler:**

- Panel, Docker socket'e doğrudan erişmez — tüm Docker iletişimi `docker-socket-proxy` üzerinden geçer.
- Write operasyonları (restart, build, rollback) bir **Command Queue** üzerinden asenkron işlenir; kullanıcı arayüzü WebSocket üzerinden ilerlemeyi takip eder.
- Mevcut Docker healthcheck zinciri korunur ve panelde görselleştirilir: `metin2_database` → `metin2_db` → `metin2_auth` → `metin2_ch*`.
- **Kanal sayısı dinamiktir.** Panel sabit bir kanal listesi tutmaz; çalışan konteynerleri Docker API'den okur ve `MT2_ROLE=core` olan tüm servisleri otomatik kanal olarak tanır. ch1, ch2, ch5 eklenirse panel yeniden başlatılmadan görünür.
- `quest-compiler` (`restart: no`) her stack başlangıcında questleri derler; log çıktıları kritiktir — hata varsa auth/channel servisleri başlamaz. Panel bu servisi özel kategoride izler.
- `haproxy` dış dünyaya açılan tek kapıdır; panel haproxy sağlığını ayrıca izler.

---

## 2. Tech Stack

### Frontend
| Paket | Versiyon | Amaç |
|-------|----------|-------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Utility styling |
| Shadcn UI | latest | Component library |
| TanStack Query | 5.x | Server state yönetimi |
| TanStack Table | 8.x | Konteyner / log tabloları |
| Recharts | 2.x | CPU/RAM grafikleri |
| Zustand | 4.x | Client state (auth token, UI prefs) |
| React Router | 6.x | Sayfa yönlendirme |

### Backend
| Paket | Versiyon | Amaç |
|-------|----------|-------|
| NestJS | 10.x | API framework |
| Dockerode | 4.x | Docker API istemcisi |
| `@nestjs/websockets` | 10.x | WebSocket Gateway |
| `@nestjs/jwt` | 10.x | JWT auth |
| `@nestjs/bull` | 10.x | Redis tabanlı job queue |
| Passport.js | 0.6.x | Auth stratejileri |
| class-validator | 0.14.x | DTO validasyonu |

### Infrastructure
| Bileşen | Amaç |
|---------|-------|
| Docker Compose | Servis orchestration |
| Traefik v3 | Reverse proxy, TLS, rate limit |
| docker-socket-proxy | Docker API izolasyonu |
| Redis | Bull queue + session store |
| PostgreSQL | Audit log + deployment history |

---

## 3. Proje Dizin Yapısı

```
mt2-panel/
├── apps/
│   ├── frontend/                    # React (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── containers/      # Konteyner listesi, durum kartları
│   │   │   │   ├── logs/            # Log viewer, filtre bar
│   │   │   │   ├── deploy/          # Deploy modal, rollback UI
│   │   │   │   └── ui/              # Shadcn bileşenleri
│   │   │   ├── hooks/
│   │   │   │   ├── useContainers.ts
│   │   │   │   ├── useLogStream.ts  # WebSocket hook
│   │   │   │   └── useDeployment.ts
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Containers.tsx
│   │   │   │   ├── Logs.tsx
│   │   │   │   ├── Deployments.tsx
│   │   │   │   └── Login.tsx
│   │   │   ├── store/               # Zustand store
│   │   │   └── lib/
│   │   │       ├── api.ts           # TanStack Query client
│   │   │       └── ws.ts            # WebSocket bağlantısı
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── backend/                     # NestJS
│       ├── src/
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   └── guards/          # JwtAuthGuard, RolesGuard
│       │   ├── containers/
│       │   │   ├── containers.module.ts
│       │   │   ├── containers.service.ts   # Dockerode wrapper
│       │   │   └── containers.controller.ts
│       │   ├── logs/
│       │   │   ├── logs.module.ts
│       │   │   ├── logs.gateway.ts         # WebSocket Gateway
│       │   │   └── log-parser.service.ts   # Regex + ring buffer
│       │   ├── deploy/
│       │   │   ├── deploy.module.ts
│       │   │   ├── deploy.service.ts
│       │   │   ├── deploy.processor.ts     # Bull job processor
│       │   │   └── command-whitelist.ts    # İzin verilen komutlar
│       │   ├── audit/
│       │   │   ├── audit.module.ts
│       │   │   └── audit.service.ts        # Her işlem loglanır
│       │   └── app.module.ts
│       └── package.json
│
├── infra/
│   ├── docker-compose.yml           # Panel servisleri
│   ├── docker-compose.override.yml  # Geliştirme ortamı
│   ├── traefik/
│   │   ├── traefik.yml
│   │   └── dynamic/
│   │       └── middlewares.yml
│   └── socket-proxy/
│       └── docker-compose.yml
│
└── docs/
    ├── api.md                       # API endpoint referansı
    ├── deployment-runbook.md        # Deploy adım adım kılavuz
    └── security.md                  # Güvenlik konfigürasyonu
```

---

## 4. Backend Mimarisi (NestJS)

### 4.1 API Endpoint Referansı

```
Authentication
  POST   /auth/login                        # JWT token al
  POST   /auth/logout                       # Token blacklist'e ekle
  GET    /auth/me                           # Oturum bilgisi

Containers (Read-Only)
  GET    /containers                        # Tüm servis listesi
  GET    /containers/:name                  # Tek servis detayı
  GET    /containers/:name/stats            # CPU/RAM/Network anlık
  GET    /containers/:name/healthcheck      # Son healthcheck sonuçları

Containers (Write — Queue'ya gönderilir)
  POST   /containers/:name/restart          # Graceful restart (--time=30)
  POST   /containers/:name/stop             # Graceful stop (--time=30)
  POST   /containers/quest-compiler/run     # quest-compiler'ı manuel tetikle

Logs
  GET    /logs/:name                        # Son N satır (REST)
  WS     /logs/:name/stream                 # Canlı log akışı

Build
  POST   /build                             # { image, mode } → build tetikle
  WS     /build/stream                      # Build log akışı
  GET    /build/history                     # Geçmiş build listesi

Deploy
  GET    /deployments                       # Deployment history
  GET    /deployments/tags/:image           # Local image tag listesi
  POST   /deployments/rollback              # { service, tag } → önceki tag'e dön

Backup
  POST   /backup/snapshot                   # mysqldump al
  GET    /backup/list                       # Mevcut yedek listesi

Audit
  GET    /audit                             # Tüm işlem geçmişi
  GET    /audit?user=admin                  # Kullanıcıya göre filtre
```

### 4.2 Command Whitelist

```typescript
// src/deploy/command-whitelist.ts

type AllowedCommand = (...args: string[]) => string[];

export const ALLOWED_COMMANDS: Record<string, AllowedCommand> = {
  'container:stop': (id: string) =>
    ['docker', 'stop', '--time', '30', id],

  'container:restart': (id: string) =>
    ['docker', 'restart', id],

  'image:pull': (repository: string, tag: string) =>
    ['docker', 'pull', `${repository}:${tag}`],

  'backup:mysqldump': (containerId: string, dbName: string) =>
    ['docker', 'exec', containerId, 'mysqldump', '--single-transaction', dbName],

  'compose:up': (service: string) =>
    ['docker', 'compose', 'up', '-d', '--no-deps', service],
};

// KURAL: Argümanlar asla tek string olarak birleştirilmez.
// child_process.spawn(cmd[0], cmd.slice(1)) şeklinde çalıştırılır.
// Shell injection önleme: 'sh -c "..."' formatı YASAKTIR.
```

### 4.3 Deploy Job Queue (Bull)

```typescript
// Kullanıcı "Update" butonuna basar
// → POST /deployments/pull
// → Job queue'ya eklenir
// → Frontend WebSocket üzerinden ilerlemeyi takip eder
// → İşlem tamamlanınca audit log'a yazılır

interface DeployJob {
  service: string;
  targetTag: string;
  requestedBy: string;
  timestamp: Date;
  snapshotBefore: boolean; // Varsayılan: true
}

// Adımlar:
// 1. mysqldump snapshot (snapshotBefore: true ise)
// 2. docker pull <image>:<tag>
// 3. docker compose up -d --no-deps <service>
// 4. Healthcheck bekle (max 60s)
// 5. Audit log yaz
```

### 4.4 Auth Yapısı

```typescript
// JWT tabanlı stateless auth
// Refresh token: Redis'te saklanır (TTL: 7 gün)
// Access token: 15 dakika geçerli

// Korunan route örneği:
@UseGuards(JwtAuthGuard)
@Roles('admin')
@Post('deployments/rollback')
async rollback(@Body() dto: RollbackDto) { ... }

// Token blacklist: logout sonrası Redis'e JTI eklenir
// Her istekte blacklist kontrolü yapılır
```

---

## 5. Frontend Mimarisi (React)

### 5.1 Sayfa Yapısı

```
/login              → Login formu
/dashboard          → Genel durum özeti; healthcheck zinciri,
                      haproxy durumu, son build/deploy,
                      quest-compiler son çalışma sonucu
/services           → Tüm servislerin kart listesi — Docker API'den dinamik okunur
                      Sabit servisler:
                        metin2_database  — mariadb
                        metin2_db        — metin2-db image
                        metin2_auth      — metin2-game (role:auth)
                        haproxy          — dış kapı
                      Dinamik servisler (MT2_ROLE=core olan her konteyner):
                        metin2_ch1, metin2_ch2, ... metin2_chN  ← otomatik keşif
                      Özel kategori:
                        quest-compiler   — init container, log önem taşır
/services/:name     → Tek servis detay (stats, healthcheck log, env, portlar)
/logs               → Canlı log viewer
                      Servis seçici: tüm servisler + quest-compiler ayrı sekme
                      quest-compiler sekmesi: tam log çıktısı, hata vurgulaması
/build              → Build tetikleme (metin2-game / metin2-db, dev/release)
/deployments        → Rollback UI + deployment history
/audit              → Audit log tablosu
```

### 5.2 Konteyner Durum Kartı — Veri Modeli

```typescript
type ServiceRole =
  | 'database'        // metin2_database — mariadb
  | 'db-process'      // metin2_db       — metin2-db image
  | 'auth'            // metin2_auth     — metin2-game image, MT2_ROLE=auth
  | 'channel'         // metin2_chN      — metin2-game image, MT2_ROLE=core (dinamik)
  | 'proxy'           // haproxy
  | 'quest-compiler'; // restart:no, log çıktısı kritik

interface ServiceCard {
  name: string;         // metin2_auth, metin2_ch1, metin2_ch2 ... metin2_chN
  role: ServiceRole;
  channel?: number;     // MT2_ROLE=core ise CHANNEL env'den parse edilir (1, 2, 99 ...)
  status: 'running' | 'stopped' | 'restarting' | 'exited';
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  uptime: string;
  image: {
    name: string;       // metin2-game | metin2-db | mariadb | haproxy
    tag: string;        // latest | v2026.06.28-r1
  };
  ports: string[];      // ["30001/tcp", "30003/tcp"]
  stats: {
    cpuPercent: number;
    memUsedMb: number;
    memLimitMb: number;
    networkRxMb: number;
    networkTxMb: number;
  };
  // quest-compiler'a özel
  exitCode?: number;
  finishedAt?: string;
  questLogAvailable?: boolean;
}
```

#### Dinamik Kanal Keşfi

Panel sabit kanal listesi tutmaz. Her polling döngüsünde Docker API'den tüm
konteynerler çekilir, `MT2_ROLE` env değişkenine göre sınıflandırılır:

```typescript
// containers.service.ts
async discoverServices(): Promise<ServiceCard[]> {
  const containers = await this.docker.listContainers({ all: true });

  return containers.map((c) => {
    const env    = parseEnv(c.Labels);      // docker inspect env alanı
    const role   = resolveRole(c.Names[0], env['MT2_ROLE']);
    const channel = role === 'channel'
      ? parseInt(env['CHANNEL'] ?? '0', 10)
      : undefined;

    return { name: c.Names[0].replace('/', ''), role, channel, ... };
  });
}

function resolveRole(name: string, mt2Role?: string): ServiceRole {
  if (name.includes('metin2_database')) return 'database';
  if (name.includes('quest-compiler'))  return 'quest-compiler';
  if (name.includes('haproxy'))         return 'proxy';
  if (mt2Role === 'db')                 return 'db-process';
  if (mt2Role === 'auth')               return 'auth';
  if (mt2Role === 'core')               return 'channel';
  return 'channel'; // bilinmeyen MT2 servisleri için fallback
}
```

Yeni bir `metin2_ch3` eklendiğinde docker-compose.yml'e servis eklenir,
panel otomatik olarak onu `channel` rolüyle listeler — panel koduna dokunulmaz.

### 5.3 TanStack Query — Veri Çekme Stratejisi

```typescript
// Konteyner listesi: 5 saniyede bir yenile
const { data: containers } = useQuery({
  queryKey: ['containers'],
  queryFn: fetchContainers,
  refetchInterval: 5000,
  staleTime: 3000,
});

// Tek konteyner stats: 2 saniyede bir (detay sayfasında)
const { data: stats } = useQuery({
  queryKey: ['container-stats', id],
  queryFn: () => fetchContainerStats(id),
  refetchInterval: 2000,
  enabled: !!id,
});

// Deploy mutations: optimistic update + rollback on error
const deployMutation = useMutation({
  mutationFn: triggerDeploy,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['deployments'] });
    queryClient.invalidateQueries({ queryKey: ['containers'] });
  },
});
```

### 5.4 Log Renk Kodlama

```typescript
// Log satırı öncelik seviyesi belirleme
const LOG_PATTERNS = {
  fatal:    /\b(FATAL|CRITICAL)\b/i,
  error:    /\b(ERROR|ERR)\b/i,
  warning:  /\b(WARNING|WARN)\b/i,
  info:     /\b(INFO)\b/i,
  debug:    /\b(DEBUG|TRACE)\b/i,
} as const;

const LOG_COLORS = {
  fatal:   'text-red-500 bg-red-950 font-bold',
  error:   'text-red-400',
  warning: 'text-yellow-400',
  info:    'text-blue-300',
  debug:   'text-gray-500',
  default: 'text-gray-300',
};

// Not: Renklendirme frontend'de yapılır.
// Backend sadece parse edilmiş satırları gönderir (level field ile birlikte).
```

---

## 6. Güvenlik Katmanı

### 6.1 Erişim Hiyerarşisi

```
İnternet
    │
    ▼
Cloudflare Access (Zero Trust) / VPN
    │  — Kimlik doğrulanmamış her istek burada düşer
    ▼
Traefik (Rate Limiting: 20 req/s per IP)
    │
    ▼
NestJS (JWT Auth + Role Guard)
    │
    ▼
docker-socket-proxy (whitelist: containers, images, info)
    │
    ▼
Docker Engine
```

### 6.2 docker-socket-proxy Konfigürasyonu

```yaml
# infra/socket-proxy/docker-compose.yml
services:
  socket-proxy:
    image: tecnativa/docker-socket-proxy:latest
    environment:
      # Read-Only izinler
      CONTAINERS: 1
      IMAGES: 1
      INFO: 1
      NETWORKS: 1
      SERVICES: 1
      TASKS: 1
      VOLUMES: 1
      # Write izinleri — sadece ihtiyaç duyulanlar
      POST: 1          # Restart/stop için gerekli
      EXEC: 0          # KAPALI — exec hiçbir zaman açılmaz
      BUILD: 0
      SWARM: 0
      AUTH: 0
      SECRETS: 0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - socket-proxy-net
    restart: unless-stopped
```

### 6.3 Traefik Rate Limiting

```yaml
# infra/traefik/dynamic/middlewares.yml
http:
  middlewares:
    panel-ratelimit:
      rateLimit:
        average: 20
        burst: 50
        period: 1s

    panel-auth-ratelimit:
      rateLimit:
        average: 5
        burst: 10
        period: 60s     # Login endpoint: dakikada 5 deneme
```

### 6.4 Güvenlik Kontrol Listesi

- [ ] Panel portu (3000/8080) asla public network'e açılmaz
- [ ] Tüm JWT secret'lar `docker secret` veya `.env` dosyasında, kod içinde asla yok
- [ ] CORS: sadece panel domain'ine izin verilir
- [ ] HTTP → HTTPS redirect Traefik'te zorunlu
- [ ] `EXEC: 0` — docker exec soketi asla açılmaz
- [ ] 2FA login akışı (TOTP — Google Authenticator uyumlu)
- [ ] Session timeout: 8 saat hareketsizlik sonrası otomatik logout

---

## 7. Docker Entegrasyonu

### 7.1 Panel docker-compose.yml

```yaml
# infra/docker-compose.yml
services:
  panel-frontend:
    image: mt2-panel-frontend:${PANEL_VERSION:-latest}
    networks:
      - traefik-net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.panel-fe.rule=Host(`panel.mt2.example.com`)"
      - "traefik.http.routers.panel-fe.tls=true"
    restart: unless-stopped

  panel-backend:
    image: mt2-panel-backend:${PANEL_VERSION:-latest}
    environment:
      - DOCKER_HOST=tcp://socket-proxy:2375
      - REDIS_URL=redis://redis:6379
      - DB_URL=postgresql://panel:${DB_PASSWORD}@postgres:5432/panel_db
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - traefik-net
      - socket-proxy-net
      - redis-net
      - postgres-net
    depends_on:
      - redis
      - postgres
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    networks:
      - redis-net
    volumes:
      - redis-data:/data
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: panel_db
      POSTGRES_USER: panel
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    networks:
      - postgres-net
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

networks:
  traefik-net:    external: true
  socket-proxy-net: external: true
  redis-net:      {}
  postgres-net:   {}

volumes:
  redis-data:
  postgres-data:
```

### 7.2 Healthcheck Entegrasyonu

Panel, mevcut Docker healthcheck mekanizmasına dokunmaz. Sadece okur:

Panel mevcut healthcheck zincirini okur, değiştirmez:

```
metin2_database  healthy?
      │ depends_on (service_healthy)
      ▼
metin2_db        healthy?
      │ depends_on (service_healthy)
      ▼
metin2_auth      healthy?   ←── quest-compiler tamamlandı mı?
      │ depends_on (service_healthy + service_completed_successfully)
      ▼
metin2_ch1       running
metin2_ch99      running
      │ depends_on (service_started)
      ▼
haproxy          running
```

```typescript
// containers.service.ts

// Sabit listesi YOK — discoverServices() ile dinamik keşfedilir
async getServiceHealth(name: string): Promise<HealthStatus> {
  const info = await this.docker.getContainer(name).inspect();
  return {
    status:        info.State.Health?.Status ?? 'none',
    failingStreak: info.State.Health?.FailingStreak ?? 0,
    log:           info.State.Health?.Log?.slice(-3) ?? [],
    exitCode:      info.State.ExitCode,
    finishedAt:    info.State.FinishedAt,
  };
}

// quest-compiler log'unu ayrıca oku (restart:no olduğu için sadece docker logs)
async getQuestCompilerLog(): Promise<string> {
  const stream = await this.docker
    .getContainer('quest-compiler')
    .logs({ stdout: true, stderr: true, tail: 200 });
  return stream.toString('utf8');
}
```

**Healthcheck özeti:**

| Servis | Healthcheck | Panel gösterimi |
|--------|-------------|-----------------|
| `metin2_database` | `healthcheck.sh --connect --innodb_initialized` | healthy / unhealthy |
| `metin2_db` | `/dev/tcp/127.0.0.1/30000` | healthy / unhealthy |
| `metin2_auth` | `/dev/tcp/$$(hostname)/30001` | healthy / unhealthy |
| `metin2_chN` | yok | running / stopped |
| `haproxy` | yok | running / stopped |
| `quest-compiler` | yok (`restart:no`) | exitCode 0=✓ / non-zero=✗ |

`metin2_chN` satırı kanal sayısından bağımsız — her `MT2_ROLE=core` servisi aynı kuralla gösterilir.

---

## 8. WebSocket & Log Streaming

### 8.1 Mimari

```
Docker Container
    │ docker logs --follow --tail=100
    ▼
LogParserService (Backend)
    │ Ring Buffer (500 satır)
    │ Regex parse (level, timestamp, message)
    │ Debounce: 100ms batch
    ▼
WebSocket Gateway (NestJS)
    │ Oda: "logs:{containerId}"
    ▼
Frontend useLogStream hook
    │ Sanal liste (react-window)
    ▼
Log Viewer (yalnızca görünen satırları render eder)
```

### 8.2 Log Mesaj Formatı

```typescript
interface LogMessage {
  containerId: string;
  containerName: string;
  timestamp: string;      // ISO 8601
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' | 'unknown';
  message: string;        // Parse edilmiş, temizlenmiş satır
  raw: string;            // Orijinal ham satır
}
```

### 8.3 Backpressure Stratejisi

```typescript
// log-parser.service.ts

// Ring buffer — son 500 satır tutulur
// Yeni istemci bağlandığında buffer'daki son satırlar gönderilir
const RING_BUFFER_SIZE = 500;

// Batch gönderim — her 100ms'de bir flush
// Aynı anda 50+ satır gelirse toplu gönderilir, DOM thrash önlenir
const BATCH_INTERVAL_MS = 100;

// Filtre: Backend sadece seçili level ve üstünü gönderir
// (varsayılan: info ve üstü, debug opsiyonel)
```

---

## 9. Deployment & Rollback Sistemi

### 9.1 Image Tag Formatı

```
metin2-game:<tag>   → metin2_auth · metin2_ch1 · metin2_ch99 · quest-compiler
metin2-db:<tag>     → metin2_db

Tag formatları:
  latest              → dev modu (panel "Build Dev" butonu)
  v2026.06.28-r1      → release modu (panel "Build Release" butonu)
  v2026.06.28-r2      → aynı gün 2. release build

metin2_database (mariadb:10.4) build sistemi dışındadır — dış image.
haproxy (haproxy:2.9)          build sistemi dışındadır — dış image.
```

### 9.2 Deploy Akışı

```
1. Kullanıcı panelden rollback hedefi seçer (tarihli tag listesi)
        │
2. POST /deployments/rollback { service, tag }
        │  service: metin2_auth | metin2_ch1 | metin2_ch99 | metin2_db
        │  tag:     v2026.06.28-r1 (latest rollback hedefi olamaz)
        │
3. Job queue'ya eklenir (Bull/Redis)
        │
4. WebSocket → Frontend: "job:queued" { jobId }
        │
5. Worker çalışır:
        ├─ 5a. mysqldump snapshot (metin2_database konteyneri üzerinden)
        ├─ 5b. docker compose stop --timeout 30 <service>
        ├─ 5c. docker compose up -d --no-deps <service>
        │       (IMAGE_TAG env değişkeni hedef tag olarak set edilir)
        └─ 5d. Healthcheck beklenir (servis tipine göre start_period uygulanır)
                metin2_db:   retries:15, start_period:20s
                metin2_auth: retries:15, start_period:20s
                metin2_ch*:  healthcheck yok → running durumu yeterli
        │
6. WebSocket → Frontend: her adımda "job:progress" { step, status }
        │
7. Başarı → "job:done"  |  Hata → "job:failed" { reason }
        │
8. Audit log: kim, ne zaman, hangi servis, hangi tag → hangi tag
```

> **Not:** `metin2_database` (mariadb) ve `haproxy` rollback hedefi değildir;
> bunlar dış image kullandığından versiyon yönetimi docker-compose.yml üzerinden yapılır.

### 9.3 Rollback Akışı

```
1. Kullanıcı panelden rollback hedefi seçer
   (metin2-game veya metin2-db image'larının tarihli tag listesi)
        │
2. UYARI MODALI:
   "metin2_auth → v2026.06.15-r1 sürümüne dönülecek.
    DB snapshot alınacak. Devam edilsin mi?"
        │
3. Onay → Rollback deploy akışı çalışır (bkz. 9.2 adım 5)
        │
4. Eğer healthcheck başarısız olursa:
        └─ "job:failed" event'i gelir
           Otomatik DB restore YAPILMAZ (veri kaybı riski)
           Panel operatöre uyarı gösterir: "Manuel müdahale gerekiyor"
           Alınan snapshot yolu ekranda gösterilir
```

**Kanal bazlı rollback:** `metin2_ch1` ve `metin2_ch99` bağımsız rollback
yapılabilir — her ikisi de `metin2-game` image kullanır ama ayrı konteynerdir.
`metin2_auth` ise her zaman kanallarla aynı image tag'inde olmalıdır; panel
bu uyumsuzluğu tespit ederse uyarı gösterir.

### 9.4 Deployment History — Veri Modeli

```typescript
interface DeploymentRecord {
  id: string;
  service: string;          // metin2_auth | metin2_ch1 | metin2_ch99 | metin2_db
  fromTag: string;          // Önceki versiyon
  toTag: string;            // Yeni versiyon
  type: 'deploy' | 'rollback';
  status: 'success' | 'failed' | 'in-progress';
  requestedBy: string;      // Admin kullanıcı
  startedAt: Date;
  completedAt?: Date;
  snapshotPath?: string;    // mysqldump dosya yolu
  errorMessage?: string;
}
```

---

## 10. Geliştirme Yol Haritası

### Faz 0 — Auth & Altyapı Kurulumu

> Süre: ~1 hafta | Önkoşul: Panel repo'su oluşturulmuş

- [ ] NestJS proje iskeleti + modül yapısı
- [ ] JWT auth (login/logout/refresh) + 2FA (TOTP)
- [ ] Redis + PostgreSQL Docker servisleri
- [ ] Traefik konfigürasyonu (TLS, rate limiting)
- [ ] docker-socket-proxy kurulumu ve test

### Faz 1 — Read-Only İzleme

> Süre: ~1-2 hafta | Önkoşul: Faz 0 tamamlandı

- [ ] `GET /services` — Dockerode ile dinamik servis keşfi (sabit liste yok)
- [ ] `GET /services/:name/stats` — CPU/RAM/Network
- [ ] `GET /services/:name/healthcheck` — Healthcheck log okuma
- [ ] React: Dashboard, Services sayfası
- [ ] Servis kartları: role bazlı ikonlar (database/auth/channel/proxy/quest-compiler)
- [ ] Yeni kanal eklendiğinde panel yeniden başlatılmadan otomatik görünür
- [ ] Healthcheck zinciri görselleştirme (database→db→auth→ch1/ch99→haproxy)
- [ ] `quest-compiler` ayrı "init container" kategorisinde gösterim
- [ ] Recharts ile CPU/RAM grafikleri

### Faz 2 — Log Streaming

> Süre: ~1 hafta | Önkoşul: Faz 1 tamamlandı

- [ ] WebSocket Gateway (NestJS) + `docker logs --follow`
- [ ] LogParserService (ring buffer, regex, batch)
- [ ] `useLogStream` React hook
- [ ] Log Viewer sayfası — servis seçici (7 servis), level filtresi
- [ ] syserr/syslog formatı tanıma (Metin2 log formatı: `[tarih] [seviye] mesaj`)
- [ ] quest-compiler için ayrı log sekmesi — tam çıktı, hata satırları kırmızı
- [ ] quest-compiler exitCode != 0 ise dashboard'da kalıcı uyarı banner'ı
- [ ] Frontend renk kodlaması (SYSERR → kırmızı, WARNING → sarı)

### Faz 3 — Deployment & Write Operasyonlar

> Süre: ~2 hafta | Önkoşul: Faz 1 tamamlandı
>
> **KAPSAM DÜZELTMESİ (2026-06-28):** Image **oluşturma** panelin kapsamı dışındadır.
> Panel yalnızca önceden oluşturulmuş image'ları ayağa kaldırır ve container yönetir.
> Bu fazdan `build.sh`, `POST /build`, build log stream ve dev/release build modları ÇIKARILIR.
> Korunan: container start/stop/restart, mevcut image tag'lerine deploy/rollback, mysqldump snapshot.
> Aşağıdaki "build" maddeleri ve "Build Sistemi" bölümü artık geçersizdir.

- [ ] Command Whitelist servisi + `build.sh` entegrasyonu
- [ ] Bull queue + Build/Deploy processor
- [ ] `POST /build` — dev/release mod, metin2-game/metin2-db seçimi
- [ ] Build WebSocket log stream (terminal görünümü)
- [ ] Build sonrası otomatik servis restart zinciri
- [ ] `POST /services/:name/restart` + `stop` (graceful, --time=30)
- [ ] `POST /services/quest-compiler/run` — manuel quest derleme
- [ ] `POST /deployments/rollback` — tarihli tag'e geri dön
- [ ] `POST /backup/snapshot` — mysqldump (metin2_database üzerinden)
- [ ] Frontend: Build sayfası, rollback UI, progress bar (WebSocket)
- [ ] Deployment History sayfası

### Faz 4 — Audit & Alerting (Opsiyonel)

> Süre: ~1 hafta | Önkoşul: Faz 3 tamamlandı

- [ ] Audit log tablosu (kim, ne, ne zaman)
- [ ] E-posta / webhook bildirimi (FATAL log yakalandığında)
- [ ] Servis topoloji haritası (hangi game server hangi DB'ye bağlı)
- [ ] Haftalık deployment raporu (otomatik e-posta özeti)

---

## 11. Ortam Değişkenleri & .env Yapısı

### Yapı: Root'ta tek `.env`, tek `.env.example`

Tüm servisler (backend, frontend, postgres, redis) proje kök dizinindeki tek `.env` dosyasını okur. Yönetmesi kolay, servisler arası değer tutarsızlığı olmaz.

```
mt2-panel/
├── .env              ← Gerçek değerler — commit'lenmez
├── .env.example      ← Şablon — commit'lenir
├── .gitignore
├── apps/
├── infra/
└── ...
```

### .gitignore Kuralı

```gitignore
# .gitignore
.env

# .env.example her zaman commit'lenir — saklanmaz
```

---

### `docker-compose.yml` — env_file referansı

Compose dosyasına `environment:` bloğuyla değer yazılmaz. Her servis root `.env`'i okur:

```yaml
# infra/docker-compose.yml — Panel servisleri
# MT2 servisleri (metin2-svfiles compose) ayrı dosyada; panel onlara dokunmaz.
services:
  panel-backend:
    env_file: [../.env]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # socket-proxy üzerinden
      - ${PROJECT_ROOT}:/workspace:ro              # build.sh için

  panel-frontend:
    env_file: [../.env]

  postgres:
    env_file: [../.env]

  redis:
    env_file: [../.env]

  socket-proxy:
    image: tecnativa/docker-socket-proxy:latest
    environment:
      CONTAINERS: 1
      IMAGES: 1
      INFO: 1
      NETWORKS: 1
      POST: 1
      EXEC: 0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

> **Not:** MT2 servisleri (`metin2_database`, `metin2_db`, `metin2_auth`,
> `metin2_ch1`, `metin2_ch99`, `haproxy`, `quest-compiler`) kendi
> `docker-compose.yml` dosyalarında kalır. Panel bu compose dosyasına
> dokunmaz; Dockerode API üzerinden container'ları isim bazlı yönetir.

---

### `.env.example` (root — tek dosya)

```bash
# ═══════════════════════════════════════════════════════
#  MT2 Panel — Ortam Değişkenleri
#  Kurulum: cp .env.example .env
#  Gerçek değerleri .env içine yaz, asla commit'leme.
# ═══════════════════════════════════════════════════════

# ── Uygulama ────────────────────────────────────────────
NODE_ENV=production
BACKEND_PORT=3001

# ── Panel URL'leri ──────────────────────────────────────
VITE_API_URL=https://panel.mt2.example.com/api
VITE_WS_URL=wss://panel.mt2.example.com/ws

# ── JWT ─────────────────────────────────────────────────
# Üretmek için: openssl rand -hex 64
JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
JWT_ACCESS_TTL=900          # 15 dakika (saniye)
JWT_REFRESH_TTL=604800      # 7 gün (saniye)

# ── 2FA (TOTP) ───────────────────────────────────────────
TOTP_ISSUER=MT2Panel

# ── Docker Socket Proxy ──────────────────────────────────
DOCKER_HOST=tcp://socket-proxy:2375

# ── Redis ────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=REPLACE_WITH_REDIS_PASSWORD

# ── PostgreSQL ───────────────────────────────────────────
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=panel_db
POSTGRES_USER=panel
POSTGRES_PASSWORD=REPLACE_WITH_DB_PASSWORD

# ── Yedekleme ────────────────────────────────────────────
BACKUP_PATH=/home/user/metin2-svfiles/backups
BACKUP_RETENTION_DAYS=7

# ── Build ───────────────────────────────────────────────
PROJECT_ROOT=/home/user/mt2-panel   # build.sh'ın bulunduğu dizin
MT2_COMPOSE_DIR=/home/user/metin2-svfiles   # MT2 docker-compose.yml dizini

# ── MT2 Sunucu (docker-compose değişkenleri — aynı .env okunur) ──────────
MT2_SQL_USER=metin2
MT2_SQL_PASS=REPLACE_WITH_MT2_SQL_PASS
MARIADB_ROOT_PASSWORD=REPLACE_WITH_MARIADB_ROOT_PASSWORD
PROXY_IP=REPLACE_WITH_SERVER_PUBLIC_IP
LOCALE=turkey
IMAGE_TAG=latest
REGISTRY=ghcr.io/changeme

# ── Loglama ──────────────────────────────────────────────
LOG_LEVEL=info              # debug | info | warn | error
```

---

### İlk Kurulum

```bash
# 1. Şablonu kopyala
cp .env.example .env

# 2. JWT Secret üret ve .env'e yapıştır
openssl rand -hex 64

# 3. .env içindeki REPLACE_WITH_* değerlerini doldur
#    JWT_SECRET, REDIS_PASSWORD, POSTGRES_PASSWORD

# 4. Servisleri başlat
docker compose -f infra/docker-compose.yml up -d
```

---

## 12. Şifre Hashing — SHA-256 Politikası

### Neden SHA-256?

Metin2 oyun sunucusu veritabanındaki hesap tablosu (`account.account`) tarihsel olarak SHA-256 (veya MD5) ile hash'lenmiş şifreleri saklar. Panel kullanıcıları bu tabloyla **aynı formatı** kullandığı için tutarlılık ve mevcut auth sunucusuyla uyum açısından SHA-256 korunur.

> **Not:** Panel yönetici hesapları için (oyun hesabından ayrı, panel-only kullanıcılar) Argon2id veya bcrypt tercih edilebilir. Bu belge, oyun DB entegrasyonunu kapsayan SHA-256 politikasını tanımlar.

---

### Kayıt Akışı

```
Kullanıcı → POST /auth/register { username, password }
                │
                ▼
        Input Validasyonu
        (min 8 karakter, özel karakter zorunlu)
                │
                ▼
        SHA-256 Hash (hex, uppercase)
        crypto.createHash('sha256')
               .update(password)
               .digest('hex')
               .toUpperCase()
                │
                ▼
        Veritabanına Yaz
        INSERT INTO account (login, password, ...)
        VALUES ('sinan', 'A3F9D2...', ...)
                │
                ▼
        Şifre plain-text olarak hiçbir yerde saklanmaz
        Response: { message: 'Kayıt başarılı' }  ← şifre dönmez
```

---

### NestJS Implementasyonu

```typescript
// src/auth/hash.service.ts
import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HashService {
  /**
   * Şifreyi SHA-256 ile hash'ler.
   * Metin2 auth sunucusuyla uyumluluk için uppercase hex döner.
   */
  hashPassword(plain: string): string {
    return createHash('sha256')
      .update(plain, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Gelen şifreyi hash'leyip DB'deki hash ile karşılaştırır.
   * timing-safe comparison için crypto.timingSafeEqual kullanılır.
   */
  verify(plain: string, storedHash: string): boolean {
    const inputHash = Buffer.from(this.hashPassword(plain));
    const dbHash    = Buffer.from(storedHash);

    if (inputHash.length !== dbHash.length) return false;

    // Timing attack önleme — karakter sayısından bağımsız sabit süre
    return require('crypto').timingSafeEqual(inputHash, dbHash);
  }
}
```

---

### Login Akışı

```typescript
// src/auth/auth.service.ts
async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await this.usersService.findByUsername(dto.username);

  // Kullanıcı bulunamazsa da aynı hata — username enumeration önleme
  if (!user || !this.hashService.verify(dto.password, user.password)) {
    throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı');
  }

  const payload = { sub: user.id, username: user.username, role: user.role };

  return {
    accessToken:  this.jwtService.sign(payload, { expiresIn: '15m' }),
    refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
  };
  // ← Response'ta şifre veya hash asla yer almaz
}
```

---

### Güvenlik Kuralları

| Kural | Açıklama |
|-------|----------|
| Hash her zaman backend'de yapılır | Frontend asla hash hesaplamaz; plain şifre HTTPS üzerinden gelir |
| `timingSafeEqual` zorunlu | `===` ile karşılaştırma timing attack'a açıktır |
| Şifre response'a yazılmaz | Login, register veya `/auth/me` endpoint'i şifre/hash döndürmez |
| Log'a şifre yazılmaz | `Logger.debug(dto)` gibi tüm request logları şifre alanını mask'ler |
| DB'de plain şifre bulunmaz | Migration sırasında mevcut plain şifreler hash'lenerek güncellenir |

---

### Şifre Alanı Maskeleme (Log)

```typescript
// src/common/interceptors/log-sanitize.interceptor.ts
// Request body'deki hassas alanları loglamadan önce maskeler

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization'];

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_FIELDS.includes(k.toLowerCase()) ? '***' : v,
    ])
  );
}
```

---

## 13. Token-Only URL Politikası

### Kural: URL'de Kimlik Bilgisi Bulunmaz

Query string veya path parametresinde `username`, `password`, `token`, `key` gibi kimlik bilgisi taşımak yasaktır. Bunlar tarayıcı geçmişine, server access log'larına ve Traefik access log'larına düşer.

---

### Yasak ve İzin Verilen Formatlar

```
# YASAK — credentials URL'de görünür
GET /auth/login?username=admin&password=1234
GET /containers?token=eyJhbG...
GET /deployments?key=secret123

# DOĞRU — credentials sadece HTTP header veya body'de
POST /auth/login
  Body: { "username": "admin", "password": "1234" }

GET /containers
  Header: Authorization: Bearer eyJhbG...

GET /deployments
  Header: Authorization: Bearer eyJhbG...
```

---

### Frontend — Token Taşıma Stratejisi

Token, `Authorization` header'ında taşınır. Zustand store'da in-memory tutulur; `localStorage`'a yazılmaz (XSS saldırısında çalınır).

```typescript
// src/lib/api.ts — TanStack Query default headers
import { useAuthStore } from '@/store/auth';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Her istekte token otomatik eklenir
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Token yoksa veya 401 gelirse login sayfasına yönlendir
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearToken();
      window.location.href = '/login';  // URL'de token yok
    }
    return Promise.reject(err);
  }
);
```

---

### WebSocket Token Taşıma

WebSocket bağlantısında token query string'e yazılmaz. Bağlantı kurulduktan hemen sonra `auth` event'iyle gönderilir:

```typescript
// src/lib/ws.ts
const socket = io(import.meta.env.VITE_WS_URL, {
  // YASAK: { auth: { token } } yerine transports kısıtlanır
  // YASAK: query: { token: accessToken }  ← URL'e düşer
  transports: ['websocket'],   // polling kapalı (URL param önleme)
  autoConnect: false,
});

// Bağlantı kurulunca token gönderilir
socket.on('connect', () => {
  const token = useAuthStore.getState().accessToken;
  socket.emit('auth', { token });  // URL'de görünmez
});
```

```typescript
// Backend: logs.gateway.ts — WebSocket token doğrulama
@WebSocketGateway()
export class LogsGateway {
  @SubscribeMessage('auth')
  async handleAuth(
    @MessageBody() data: { token: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const payload = this.jwtService.verify(data.token);
      client.data.user = payload;   // Sonraki mesajlarda kullanılır
      client.emit('auth:success');
    } catch {
      client.emit('auth:error', { message: 'Geçersiz token' });
      client.disconnect();
    }
  }
}
```

---

### Refresh Token Akışı

```
Access token süresi dolduğunda (401):
    │
    ▼
POST /auth/refresh
  Body: { "refreshToken": "eyJ..." }   ← Header veya body'de, URL'de değil
    │
    ▼
Backend doğrular → yeni access token döner
    │
    ▼
Zustand store güncellenir
    │
    ▼
Başarısız istek otomatik tekrarlanır
```

---

### Güvenlik Kuralları

| Kural | Açıklama |
|-------|----------|
| Token asla URL'de olmaz | Query string, path param yasak |
| `localStorage` yasak | Token in-memory (Zustand) tutulur |
| WebSocket token event'le gönderilir | `?token=` query param yasak |
| HTTPS/WSS zorunlu | Plain HTTP/WS bağlantısı Traefik'te reddedilir |
| Token log'lara yazılmaz | `Authorization` header log sanitizer'dan geçer |



---

## Ek Notlar

### Mevcut Docker Altyapısıyla Uyum

Panel, sunucu üzerinde zaten çalışan Docker healthcheck, volume binding ve container orchestration sistemine **dokunmaz**. Sadece Docker API üzerinden okuma yapar ve onaylı write komutlarını whitelist üzerinden iletir. Mevcut `docker-compose.yml` dosyaları değiştirilmez; panel kendi ayrı compose dosyasıyla deploy edilir.

### Geliştirme Ortamı

```bash
# Panel backend geliştirme
cd apps/backend
npm run start:dev

# Panel frontend geliştirme
cd apps/frontend
npm run dev

# Tüm servisleri ayağa kaldır
docker compose -f infra/docker-compose.yml -f infra/docker-compose.override.yml up -d
```

### Build Sistemi — Panel Üzerinden Yönetim

> **⚠️ GEÇERSİZ (2026-06-28):** Bu bölüm artık kapsam dışıdır. Image oluşturma panelin
> görevi değildir; panel yalnızca hazır image'ları çalıştırır ve container yönetir.
> Bölüm tarihsel referans olarak bırakılmıştır.

Build işlemi terminal yerine doğrudan React panelinden tetiklenir. Backend, `build.sh` scriptini çalıştırır ve çıktıyı WebSocket üzerinden canlı olarak panele aktarır.

#### Build Modları

| Mod | Tag | Ne zaman |
|-----|-----|----------|
| `dev` | `latest` | Geliştirme — hızlı iterasyon, sayaç tutulmaz |
| `release` | `v2026.06.28-r1` | Versiyonlamak istediğinde, rollback destekli |

#### Panel UI Akışı

```
Build sayfası
    │
    ├─ [metin2-game] kartı
    │   Kullanır: metin2_auth · metin2_ch1 · metin2_ch99 · quest-compiler
    │       ├─ 🔵 Build Dev      → latest tag
    │       └─ 🟢 Build Release  → v2026.06.28-r1 + latest
    │
    └─ [metin2-db] kartı
        Kullanır: metin2_db
            ├─ 🔵 Build Dev
            └─ 🟢 Build Release

Build tetiklendiğinde:
  1. Modal: "metin2-game dev build başlatılsın mı?"
  2. Onay → POST /build { image: "metin2-game", mode: "dev" }
  3. Build log'u WebSocket üzerinden terminal görünümünde akar
  4. Build başarılı → ilgili konteynerler otomatik yeniden başlar:
       metin2-game build → metin2_auth + tüm channel'lar (MT2_ROLE=core) restart
                           (ch1, ch2, ch3 ... kaç kanal varsa — dinamik keşif)
       metin2-db build   → sadece metin2_db restart
  5. quest-compiler her restart zinciri öncesinde çalışır;
     log çıktısı panelde ayrı pencerede gösterilir — hata varsa zincir durur
```

#### `build.sh` (proje root — backend tarafından çağrılır)

```bash
#!/usr/bin/env bash
set -euo pipefail

IMAGE=${1:?"IMAGE gerekli: metin2-game | metin2-db"}
MODE=${2:-dev}   # dev | release

if [[ "$MODE" == "release" ]]; then
  BUILD_DATE=$(date +%Y.%m.%d)
  COUNTER_FILE=".build-counter-${IMAGE}"
  BUILD_N=$(cat "${COUNTER_FILE}" 2>/dev/null || echo 0)
  BUILD_N=$((BUILD_N + 1))
  echo "$BUILD_N" > "${COUNTER_FILE}"
  TAG="v${BUILD_DATE}-r${BUILD_N}"

  docker build -t "${IMAGE}:${TAG}" .
  docker tag "${IMAGE}:${TAG}" "${IMAGE}:latest"
  echo "✓ ${IMAGE}:${TAG} ve ${IMAGE}:latest hazır"
else
  docker build -t "${IMAGE}:latest" .
  echo "✓ ${IMAGE}:latest hazır"
fi
```

#### Backend — Build Endpoint

```typescript
// src/build/build.service.ts
// POST /build { image: "metin2-game" | "metin2-db", mode: "dev" | "release" }

async triggerBuild(image: string, mode: string, clientSocket: Socket) {
  const ALLOWED_IMAGES = ['metin2-game', 'metin2-db'];
  const ALLOWED_MODES  = ['dev', 'release'];

  if (!ALLOWED_IMAGES.includes(image)) throw new BadRequestException('Geçersiz image');
  if (!ALLOWED_MODES.includes(mode))   throw new BadRequestException('Geçersiz mod');

  const proc = spawn('bash', ['build.sh', image, mode], {
    cwd: process.env.PROJECT_ROOT,  // .env'den okunur
  });

  // Build çıktısını satır satır WebSocket'e gönder
  proc.stdout.on('data', (data) => {
    clientSocket.emit('build:log', { line: data.toString() });
  });
  proc.stderr.on('data', (data) => {
    clientSocket.emit('build:log', { line: data.toString(), isError: true });
  });

  proc.on('close', (code) => {
    if (code === 0) {
      clientSocket.emit('build:done', { image, mode });
      // Build başarılıysa ilgili konteynerleri sırayla yeniden başlat
      // metin2-game → auth önce, sonra tüm MT2_ROLE=core servisler (dinamik)
      //               kanal sayısı değişse bile bu kod değişmez
      // metin2-db   → sadece metin2_db
      await this.containerService.restartByImage(image);
    } else {
      clientSocket.emit('build:failed', { code });
    }
  });
}
```

#### `.env` Eklentisi

```bash
# Build
PROJECT_ROOT=/home/sinan/mt2-panel   # build.sh'ın bulunduğu dizin
```

#### Rollback Kuralı

```
latest tag  → rollback hedefi olamaz (hangi kod olduğu belirsiz)
tarihli tag → rollback hedefi olabilir (sadece release build'lardan)
```

---

*Son güncelleme: 2026-06-28 — v1.1 | Belge sahibi: Sinan*