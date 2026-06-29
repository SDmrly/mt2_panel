// apps/backend/src/containers/containers.service.spec.ts
import { ContainersService } from './containers.service';

function fakeDocker() {
  const list = [
    { Id: 'a', Names: ['/metin2-svfiles-metin2_auth-1'], Image: 'img', State: 'running', Status: 'Up 7 hours (healthy)',
      Ports: [{ PrivatePort: 30001, Type: 'tcp' }],
      Labels: { 'com.docker.compose.project': 'metin2-svfiles', 'com.docker.compose.service': 'metin2_auth' } },
    { Id: 'b', Names: ['/other-app-1'], Image: 'x', State: 'running', Status: 'Up', Ports: [],
      Labels: { 'com.docker.compose.project': 'other-app', 'com.docker.compose.service': 'x' } },
  ];
  const inspectFor: Record<string, any> = {
    a: { Config: { Env: ['MT2_ROLE=auth', 'CHANNEL=1'], Image: 'metin2-game:latest' },
         State: { Health: { Status: 'healthy', FailingStreak: 0, Log: [] }, ExitCode: 0, StartedAt: '', FinishedAt: '' } },
    b: { Config: { Env: [], Image: 'x:latest' },
         State: { Health: { Status: 'healthy', FailingStreak: 0, Log: [] }, ExitCode: 0, StartedAt: '', FinishedAt: '' } },
  };
  return {
    listContainers: jest.fn().mockResolvedValue(list),
    getContainer: (id: string) => ({ inspect: jest.fn().mockResolvedValue(inspectFor[id]) }),
  } as any;
}

describe('ContainersService.discoverServices', () => {
  it('sadece MT2_PROJECT containerlarını döner, rol/kanal çözer', async () => {
    const svc = new ContainersService(fakeDocker(), 'metin2-svfiles');
    const cards = await svc.discoverServices();
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('metin2_auth');
    expect(cards[0].role).toBe('auth');
    expect(cards[0].channel).toBeUndefined();
    expect(cards[0].health).toBe('healthy');
  });

  it('5 saniye TTL cache: ikinci çağrı listContainers çağırmaz', async () => {
    const docker = fakeDocker();
    const svc = new ContainersService(docker, 'metin2-svfiles');
    await svc.discoverServices();
    await svc.discoverServices();
    expect(docker.listContainers).toHaveBeenCalledTimes(1);
  });

  it('other-app projesi filtrelenir (metin2-svfiles containerı gelmez)', async () => {
    const svc = new ContainersService(fakeDocker(), 'other-app');
    const cards = await svc.discoverServices();
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('x');
  });
});

describe('ContainersService.getStats', () => {
  it('CPU/mem/network hesaplamalarını doğru yapar', async () => {
    const statsMock = {
      cpu_stats: { cpu_usage: { total_usage: 2000000 }, system_cpu_usage: 10000000, online_cpus: 2 },
      precpu_stats: { cpu_usage: { total_usage: 1000000 }, system_cpu_usage: 5000000 },
      memory_stats: { usage: 104857600, limit: 1073741824 }, // 100MB used, 1024MB limit
      networks: {
        eth0: { rx_bytes: 1048576, tx_bytes: 2097152 }, // 1MB rx, 2MB tx
      },
    };
    const docker = {
      listContainers: jest.fn().mockResolvedValue([
        { Id: 'c1', Labels: { 'com.docker.compose.project': 'proj', 'com.docker.compose.service': 'myservice' } }
      ]),
      getContainer: (_id: string) => ({
        inspect: jest.fn(),
        stats: jest.fn().mockResolvedValue(statsMock),
      }),
    } as any;
    const svc = new ContainersService(docker, 'proj');
    const stats = await svc.getStats('myservice');
    // cpuDelta=1000000, sysDelta=5000000, cpus=2 → (1000000/5000000)*2*100 = 40.00
    expect(stats.cpuPercent).toBe(40);
    expect(stats.memUsedMb).toBe(100);
    expect(stats.memLimitMb).toBe(1024);
    expect(stats.networkRxMb).toBe(1);
    expect(stats.networkTxMb).toBe(2);
  });
});

describe('ContainersService.getHealth', () => {
  it('health durumunu ve log\'u döner', async () => {
    const inspectResult = {
      State: {
        Health: { Status: 'unhealthy', FailingStreak: 3, Log: [{ Output: 'fail1' }, { Output: 'fail2' }, { Output: 'fail3' }, { Output: 'fail4' }] },
        ExitCode: 1,
        FinishedAt: '2024-01-01T00:00:00Z',
      },
    };
    const docker = {
      listContainers: jest.fn().mockResolvedValue([
        { Id: 'd1', Labels: { 'com.docker.compose.project': 'proj', 'com.docker.compose.service': 'svc' } }
      ]),
      getContainer: (_id: string) => ({
        inspect: jest.fn().mockResolvedValue(inspectResult),
      }),
    } as any;
    const svc = new ContainersService(docker, 'proj');
    const health = await svc.getHealth('svc');
    expect(health.status).toBe('unhealthy');
    expect(health.failingStreak).toBe(3);
    expect(health.log).toHaveLength(3); // last 3
    expect(health.exitCode).toBe(1);
    expect(health.finishedAt).toBe('2024-01-01T00:00:00Z');
  });
});
