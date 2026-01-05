import { Baseline } from '../models/Baseline';

export interface IBaselineRepository {
  create(baseline: Baseline): Promise<Baseline>;
  findById(id: string): Promise<Baseline | null>;
  findByProjectId(projectId: string): Promise<Baseline[]>;
  findActiveByProjectAndName(projectId: string, name: string): Promise<Baseline | null>;
  update(id: string, baseline: Partial<Baseline>): Promise<Baseline | null>;
  delete(id: string): Promise<boolean>;
}