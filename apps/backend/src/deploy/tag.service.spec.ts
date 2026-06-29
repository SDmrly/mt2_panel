// apps/backend/src/deploy/tag.service.spec.ts
import { TagService } from './tag.service';

function fakeDocker() {
  return {
    listImages: jest.fn().mockResolvedValue([
      { RepoTags: ['ghcr.io/changeme/metin2-game:latest', 'ghcr.io/changeme/metin2-game:v1'] },
      { RepoTags: ['ghcr.io/changeme/metin2-db:latest', 'ghcr.io/changeme/metin2-db:v1'] },
      { RepoTags: ['mariadb:10.4'] },
    ]),
    listContainers: jest.fn().mockResolvedValue([
      { Id: 'abc123', Image: 'sha256:deadbeef', Labels: { 'com.docker.compose.project': 'metin2-svfiles', 'com.docker.compose.service': 'metin2_ch1' } },
    ]),
    getContainer: jest.fn().mockReturnValue({
      inspect: jest.fn().mockResolvedValue({ Config: { Image: 'ghcr.io/changeme/metin2-game:latest' } }),
    }),
  } as any;
}
const cfg = { gameRepo: 'ghcr.io/changeme/metin2-game', dbRepo: 'ghcr.io/changeme/metin2-db' } as any;

describe('TagService.listTags', () => {
  it('game tag\'lerini listeler (db eşi varsa deployable), current=çalışan tag', async () => {
    const svc = new TagService(fakeDocker(), cfg, 'metin2-svfiles');
    const { tags, current } = await svc.listTags();
    expect(current).toBe('latest');
    expect(tags.find((t) => t.name === 'v1')?.deployable).toBe(true);
    expect(tags.find((t) => t.name === 'latest')?.deployable).toBe(true);
  });
});
