// apps/backend/src/deploy/recreate.ts
import Docker from 'dockerode';

export async function recreateWithImage(
  docker: Docker, containerId: string, newImage: string, onLog: (l: string) => void,
): Promise<string> {
  const c = docker.getContainer(containerId);
  const info: any = await c.inspect();
  const name = (info.Name ?? '').replace(/^\//, '');
  onLog(`recreate ${name}: ${info.Config?.Image} -> ${newImage}`);

  try { await c.stop({ t: 30 }); } catch { /* zaten durmuş olabilir */ }
  await c.remove();

  const { Volumes: _volumes, Image: _image, ...configFields } = info.Config ?? {};
  const createOpts: any = {
    name,
    ...configFields,               // Env, Cmd, Entrypoint, Labels, ExposedPorts, WorkingDir, User, Hostname...
    Image: newImage,               // override (Volumes stripped to prevent shadowing HostConfig.Binds)
    HostConfig: info.HostConfig,
    NetworkingConfig: { EndpointsConfig: info.NetworkSettings?.Networks ?? {} },
  };
  const nc = await docker.createContainer(createOpts);
  await nc.start();
  onLog(`recreate ${name}: started ${nc.id}`);
  return nc.id;
}
