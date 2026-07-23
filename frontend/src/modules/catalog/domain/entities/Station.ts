import { Machine } from './Machine';

export class Station {
  constructor(
    public readonly id: string,
    public readonly areaId: string,
    public readonly name: string,
    public readonly status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE',
    public readonly capabilities: string[] = [],
    public readonly machines: Machine[] = []
  ) {}
}
