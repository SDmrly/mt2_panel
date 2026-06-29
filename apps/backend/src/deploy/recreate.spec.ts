// apps/backend/src/deploy/recreate.spec.ts
import { recreateWithImage } from './recreate';

function fakeDocker() {
  const calls: string[] = [];
  const oldContainer = {
    inspect: jest.fn().mockResolvedValue({
      Name: '/metin2-svfiles-metin2_ch1-1',
      Config: { Image: 'ghcr.io/changeme/metin2-game:latest', Env: ['A=1'], Cmd: ['game'], Labels: { 'com.docker.compose.service': 'metin2_ch1' }, Volumes: { '/data': {} } },
      HostConfig: { Binds: ['v:/data'], RestartPolicy: { Name: 'unless-stopped' } },
      NetworkSettings: { Networks: { mt2net: { Aliases: ['metin2_ch1'] } } },
    }),
    stop: jest.fn().mockImplementation(async () => { calls.push('stop'); }),
    remove: jest.fn().mockImplementation(async () => { calls.push('remove'); }),
  };
  let created: any;
  const docker = {
    getContainer: jest.fn().mockReturnValue(oldContainer),
    createContainer: jest.fn().mockImplementation(async (opts: any) => {
      calls.push('create'); created = opts;
      return { id: 'newid', start: jest.fn().mockImplementation(async () => { calls.push('start'); }) };
    }),
  };
  return { docker: docker as any, calls, getCreated: () => created };
}

describe('recreateWithImage', () => {
  it('inspect→stop→remove→create(yeni image)→start sırasıyla çalışır, config/network kopyalar', async () => {
    const { docker, calls, getCreated } = fakeDocker();
    const id = await recreateWithImage(docker, 'oldid', 'ghcr.io/changeme/metin2-game:v1', () => {});
    expect(id).toBe('newid');
    expect(calls).toEqual(['stop', 'remove', 'create', 'start']);
    const opts = getCreated();
    expect(opts.name).toBe('metin2-svfiles-metin2_ch1-1');   // baştaki / temizlenmiş
    expect(opts.Image).toBe('ghcr.io/changeme/metin2-game:v1'); // override
    expect(opts.Env).toEqual(['A=1']);                          // Config kopyalandı
    expect(opts.HostConfig.Binds).toEqual(['v:/data']);         // HostConfig kopyalandı
    expect(opts.NetworkingConfig.EndpointsConfig.mt2net.Aliases).toContain('metin2_ch1'); // network
    expect(opts.Volumes).toBeUndefined(); // Volumes stripped — must not shadow HostConfig.Binds
  });
  it('stop zaten durmuşsa hata yutar', async () => {
    const { docker } = fakeDocker();
    docker.getContainer().stop.mockRejectedValueOnce(new Error('not running'));
    await expect(recreateWithImage(docker, 'oldid', 'img:v1', () => {})).resolves.toBe('newid');
  });
});
