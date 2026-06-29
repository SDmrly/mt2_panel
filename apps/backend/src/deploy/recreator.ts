// apps/backend/src/deploy/recreator.ts
import Docker from 'dockerode';
import { ContainersService } from '../containers/containers.service';
import { recreateWithImage } from './recreate';

export const RECREATOR = 'RECREATOR';
export interface Recreator {
  recreate(serviceName: string, newImage: string, onLog: (l: string) => void): Promise<void>;
}
export class DockerRecreator implements Recreator {
  constructor(private readonly docker: Docker, private readonly containers: ContainersService) {}
  async recreate(serviceName: string, newImage: string, onLog: (l: string) => void): Promise<void> {
    const c = await this.containers.findContainerByService(serviceName);
    await recreateWithImage(this.docker, c.id, newImage, onLog);
  }
}
