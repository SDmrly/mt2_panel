# Spec 1 — Faz 0 + Faz 1: Foundation & Read-Only İzleme

> **Tarih:** 2026-06-28
> **Kapsam:** Monorepo iskeleti + Auth (Postgres panel users) + gerçek MT2 container'larının dinamik keşfi, izleme, health, stats, restart.
> **Kuzey yıldızı:** [mt2-panel-mimari.md](./mt2-panel-mimari.md)
> **Teslim hedefi:** İlk *gerçekten kullanılabilir* panel — giriş yap, çalışan MT2 servislerini canlı gör, yönet.

---

## 0. Bağlam & Gerçek Durum Bulguları

Mimari doküman v1.1 kapsamlı ama bazı varsayımları gerçek çalışan kurulumla uyuşmuyor. Bu spec gerçeğe göre düzeltir:

| Doküman varsayımı | Gerçek durum (Docker Desktop) | Karar |
|---|---|---|
| Container adı `metin2_auth` | `metin2-svfiles-metin2_auth-1` (compose prefix'li) | Keşif `com.docker.compose.service` label'ı + proje filtresiyle yapılır |
| `MT2_ROLE` label'da (`parseEnv(c.Labels)`) | `MT2_ROLE` **env'de** (`Config.Env`) | `inspect` ile `Config.Env` okunur; `listContainers` Env döndürmez |
| Tek compose, plain isimler | Proje: `metin2-svfiles`; servisler: `metin2_auth`, `metin2_ch1`, `metin2_ch99`, `metin2_db`, `quest-compiler`, `haproxy`, `metin2_database` | `MT2_PROJECT` .env'de configurable |
| Şifre SHA-256 | Panel kullanıcıları oyundan ayrı | **bcrypt** (SHA-256 sadece oyun DB uyumu içindi) |

**Doğrulanan gerçek env örnekleri:**
- `metin2_ch1`: `MT2_ROLE=core`, `CHANNEL=1`, `PORT=30003`, `MT2_BIN=game`
- `metin2_auth`: `MT2_ROLE=auth`, `CHANNEL=1`, `PORT=30001`
- `metin2_db`: `MT2_ROLE=db`, `MT2_BIN=db`
- `quest-compiler`: `Exited (0)` (init container)
- `metin2_database`: `mariadb:10.4`, healthy, `127.0.0.1:3306`
- `haproxy`: `haproxy:2.9`, `30001/30003/30005` host'a açık

**Çalışma ortamı:** Şu an Docker Desktop (Windows) üzerinde geliştirme; ileride kiralık Ubuntu sunucuda Docker + dışarıdan erişim. Path'ler ve proje adı `.env` ile yönetilir (taşınabilirlik).

---

## 1. Genel Yaklaşım

Tüm mimari doküman tek spec/plan'a sığmaz. Dokümanın fazları ayrı uygulama spec'lerine bölünür:

- **Spec 1 (bu doküman) = Faz 0 + Faz 1** → Foundation + read-only izleme + temel write (restart/stop).
- Spec 2 = Faz 2 (log streaming) · Spec 3 = Faz 3 (build/deploy/write + Bull queue) · Spec 4 = Faz 4 (audit/alerting).

Her spec'in kendi plan → implementasyon döngüsü vardır.

**Dev / Prod ayrımı:**
- **Dev (şimdi):** Backend `start:dev` (watch) + Frontend Vite (host hot-reload). Sadece `postgres + redis + socket-proxy` Docker'da. Traefik/TLS YOK.
- **Prod (ileride):** Frontend+backend image'a build, Traefik TLS + rate-limit önünde. Compose baştan hazır yazılır, ileride açılır.

---

## 2. Monorepo Yapısı

```
mt2-panel/
├── package.json                 # npm workspaces root
├── .env.example
├── .env                         # commit'lenmez
├── .gitignore
├── apps/
│   ├── backend/                 # NestJS 10
│   └── frontend/                # React 18 + Vite 5
├── infra/
│   ├── docker-compose.dev.yml   # postgres + redis + socket-proxy
│   ├── docker-compose.prod.yml  # + traefik/TLS + panel image'ları
│   ├── traefik/                 # prod için hazır (dev'de kullanılmaz)
│   │   ├── traefik.yml
│   │   └── dynamic/middlewares.yml
│   └── socket-proxy/
└── docs/
    └── plan/
        ├── mt2-panel-mimari.md
        └── 2026-06-28-faz0-1-foundation-design.md   # bu dosya
```

- **Araç:** npm workspaces (Turbo/pnpm değil — sadelik; ileride eklenebilir).
- **Tek kök `.env`** (doküman §11). Tüm servisler okur.

---

## 3. Auth & Güvenlik (Faz 0)

### 3.1 Panel kullanıcıları (Postgres)
Tablo `panel_users`:
| kolon | tip | not |
|---|---|---|
| id | uuid pk | |
| username | varchar unique | |
| password_hash | varchar | **bcrypt** |
| role | enum | `admin` / `operator` / `viewer` |
| totp_secret | varchar null | Faz 0 sonu |
| totp_enabled | bool default false | |
| created_at | timestamptz | |
| last_login | timestamptz null | |

**Roller:**
- `admin` — her şey (deploy/rollback dahil, Faz 3).
- `operator` — read + restart/stop; deploy/rollback yok.
- `viewer` — sadece read.

### 3.2 JWT akışı (doküman §4.4, §13)
- Access token 15dk; refresh token 7gün, Redis'te (TTL).
- Logout → JTI Redis blacklist; her istekte kontrol.
- Token **in-memory** (Zustand), `localStorage` YASAK. `Authorization: Bearer`. URL'de token yok.
- Guard'lar: `JwtAuthGuard` + `RolesGuard` (`@Roles('admin')`).

### 3.3 İlk admin seed
Migration sonrası `.env`'deki `PANEL_ADMIN_USER` / `PANEL_ADMIN_PASS` ile (yoksa) tek admin oluşturulur. Sıfırdan giriş mümkün.

### 3.4 2FA (TOTP)
Şema baştan hazır (`totp_secret`, `totp_enabled`). Aktivasyon Faz 0 **sonunda opsiyonel** — önce çalışan login.

### 3.5 Dev sadeleştirmeleri
- CORS dev'de `http://localhost:5173`; prod'da sadece panel domain.
- Rate-limit dev'de kapalı; prod Traefik'te (doküman §6.3).
- Log sanitizer (doküman §12): `password/token/secret/authorization` maskelenir.

---

## 4. Servis Keşfi & İzleme (Faz 1)

### 4.1 Keşif algoritması (gerçeğe uyarlanmış)
```
discoverServices():
  1. listContainers({all:true})
     → filtre: Labels["com.docker.compose.project"] == env.MT2_PROJECT
  2. her container: getContainer(id).inspect()
     → Config.Env'den MT2_ROLE, CHANNEL, PORT oku
  3. displayName = Labels["com.docker.compose.service"]
  4. resolveRole(displayName, env.MT2_ROLE):
       name içeriyor "database"        → database
       name içeriyor "quest-compiler"  → quest-compiler
       name içeriyor "haproxy"         → proxy
       MT2_ROLE == "db"                → db-process
       MT2_ROLE == "auth"             → auth
       MT2_ROLE == "core"             → channel
       fallback                        → channel
  5. channel ise: channel = parseInt(env.CHANNEL ?? '0')
```
- `.env`: `MT2_PROJECT=metin2-svfiles`.
- **Performans:** inspect maliyetli → backend'de 5sn TTL cache. Stats ayrı çağrı (`stats({stream:false})`), detay sayfasında 2sn poll.

### 4.2 Endpoints
```
GET  /services                       # dinamik liste (ServiceCard[])
GET  /services/:name                 # tek servis detay
GET  /services/:name/stats           # cpu/mem/net anlık
GET  /services/:name/healthcheck     # State.Health (log -3, exitCode, finishedAt)
POST /services/:name/restart         # graceful (--time=30) — operator+
POST /services/:name/stop            # graceful (--time=30) — operator+
```
> Faz 1'de restart/stop **direkt** çalışır (Bull queue Faz 3). Onay modalı zorunlu. `:name` = compose service adı; backend proje+servis label'ıyla gerçek container'ı bulur.

### 4.3 ServiceCard veri modeli
Doküman §5.2 ile aynı (`name`, `role`, `channel?`, `status`, `health`, `uptime`, `image{name,tag}`, `ports[]`, `stats{}`, quest-compiler için `exitCode?`/`finishedAt?`).

### 4.4 Healthcheck (doküman §7.2 — sadece okuma)
`State.Health.Status / FailingStreak / Log(-3)`; quest-compiler için `ExitCode` + `FinishedAt`.

---

## 5. Frontend (Faz 1)

- **Sayfalar:** `/login`, `/dashboard`, `/services`, `/services/:name`.
- **Dashboard:** healthcheck zinciri (database→db→auth→ch*→haproxy) görseli; quest-compiler `exitCode != 0` ise kalıcı uyarı banner'ı; haproxy durumu.
- **Services:** dinamik kartlar, rol bazlı ikonlar; yeni kanal eklenince yeniden başlatmadan görünür.
- **Detay:** Recharts CPU/RAM, health log, env, portlar; restart/stop (onay modalı).
- **Stack:** TanStack Query (5sn/2sn poll), Zustand (auth in-memory), Shadcn UI, React Router 6, axios interceptor (token + 401→/login).

---

## 6. Altyapı (Docker)

### 6.1 `docker-compose.dev.yml`
- `postgres:16-alpine` (panel_db), `redis:7-alpine`, `tecnativa/docker-socket-proxy`.
- socket-proxy env: `CONTAINERS=1 IMAGES=1 INFO=1 NETWORKS=1 POST=1 EXEC=0 BUILD=0`.
- Docker Desktop'ta `/var/run/docker.sock:/var/run/docker.sock:ro` mount (WSL2 backend üzerinden çalışır).
- Backend `DOCKER_HOST=tcp://localhost:2375` (socket-proxy publish) — dev'de host'tan erişim.

### 6.2 `docker-compose.prod.yml` (hazır, ileride)
- Traefik v3 (TLS, rate-limit middlewares hazır), panel-frontend/backend image'ları, postgres, redis, socket-proxy. Doküman §7.1 + §6 ile uyumlu.

### 6.3 `.env.example`
Doküman §11 temel alınır; eklenen/değişen anahtarlar:
```
MT2_PROJECT=metin2-svfiles          # compose proje adı (keşif filtresi)
PANEL_ADMIN_USER=admin              # ilk seed
PANEL_ADMIN_PASS=REPLACE_ME
DOCKER_HOST=tcp://localhost:2375    # dev (prod: tcp://socket-proxy:2375)
# JWT, REDIS, POSTGRES, LOG_LEVEL → doküman §11 ile aynı
```

---

## 7. Test & Teslim Kriteri

- **Backend:** Jest unit (`resolveRole`, bcrypt hash/verify, RolesGuard) + e2e (login → /services 401/200). Dockerode mocklanır.
- **Frontend:** Vitest + RTL (login formu validasyon, ServiceCard render rol/health).
- **Faz 0 done:** `npm run dev` ile login çalışır; admin seed'le giriş; JWT + refresh; 401→login redirect.
- **Faz 1 done:** Giriş sonrası `/services`'te 7 gerçek MT2 container'ı doğru rol + health ile görünür; bir servis restart edilebilir; dashboard healthcheck zincirini ve quest-compiler exitCode'unu gösterir; yeni `metin2_ch*` eklenince kod değişmeden listelenir.

---

## 8. Kapsam Dışı (sonraki spec'ler)

- Log streaming / WebSocket (Faz 2).
- Build (`build.sh`) + Bull queue + deploy/rollback (Faz 3).
- Audit log + alerting + topoloji haritası (Faz 4).
- 2FA tam akışı (Faz 0 sonunda opsiyonel başlatılır, zorunlu değil).
