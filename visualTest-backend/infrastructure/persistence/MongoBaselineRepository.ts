import { Collection } from 'mongodb';
import { Baseline } from '../../domain/models/Baseline';
import { IBaselineRepository } from '../../domain/repositories/IBaselineRepository';
import { getDb } from './mongoClient';

export class MongoBaselineRepository implements IBaselineRepository {
  private get collection(): Collection {
    return getDb().collection('baselines');
  }

  async create(baseline: Baseline): Promise<Baseline> {
    await this.collection.insertOne(baseline);
    return baseline;
  }

  async findById(id: string): Promise<Baseline | null> {
    const doc = await this.collection.findOne({ id });
    return doc ? this.toBaseline(doc) : null;
  }

  async findByProjectId(projectId: string): Promise<Baseline[]> {
    const docs = await this.collection
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(doc => this.toBaseline(doc));
  }

  async findActiveByProjectAndName(projectId: string, name: string): Promise<Baseline | null> {
    const doc = await this.collection.findOne(
      { projectId, name, isActive: true },
      { sort: { version: -1 } }
    );
    return doc ? this.toBaseline(doc) : null;
  }

  async update(id: string, updates: Partial<Baseline>): Promise<Baseline | null> {
    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? this.toBaseline(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  private toBaseline(doc: any): Baseline {
    return new Baseline(
      doc.id,
      doc.projectId,
      doc.name,
      doc.image,
      doc.metadata,
      doc.version,
      doc.isActive,
      doc.createdAt,
      doc.updatedAt,
      doc.domSnapshot,
      doc.tags
    );
  }
}