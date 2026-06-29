// apps/backend/src/containers/docker.provider.ts
import Docker from 'dockerode';
export const DOCKER = 'DOCKER';
export const dockerProvider = {
  provide: DOCKER,
  useFactory: (): Docker => {
    const host = process.env.DOCKER_HOST ?? 'tcp://localhost:2375';
    const url = new URL(host);
    return new Docker({ host: url.hostname, port: Number(url.port) });
  },
};
