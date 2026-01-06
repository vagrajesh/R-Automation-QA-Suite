import { IProject } from '../../core/types';

export class Project implements IProject {
  constructor(
    public id: string,
    public name: string,
    public baseUrl: string,
    public config: {
      diffThreshold: number;
      aiEnabled: boolean;
    },
    public createdAt: Date,
    public updatedAt: Date,
    public isActive: boolean = true
  ) {}

  static create(data: {
    id: string;
    name: string;
    baseUrl: string;
    diffThreshold?: number;
    aiEnabled?: boolean;
  }): Project {
    const now = new Date();
    return new Project(
      data.id,
      data.name,
      data.baseUrl,
      {
        diffThreshold: data.diffThreshold ?? 95,
        aiEnabled: data.aiEnabled ?? true,
      },
      now,
      now
    );
  }

  update(data: Partial<Pick<IProject, 'name' | 'baseUrl' | 'config'>>): void {
    if (data.name) this.name = data.name;
    if (data.baseUrl) this.baseUrl = data.baseUrl;
    if (data.config) this.config = { ...this.config, ...data.config };
    this.updatedAt = new Date();
  }
}