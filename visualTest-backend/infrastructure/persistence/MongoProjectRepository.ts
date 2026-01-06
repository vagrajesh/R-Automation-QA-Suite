import { Collection } from 'mongodb';
import { Project } from '../../domain/models/Project';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { getDb } from './mongoClient';

export class MongoProjectRepository implements IProjectRepository {
  private get collection(): Collection {
    return getDb().collection('projects');
  }

  async create(project: Project): Promise<Project> {
    await this.collection.insertOne(project);
    return project;
  }

  async findById(id: string): Promise<Project | null> {
    const doc = await this.collection.findOne({ id, isActive: true });
    return doc ? this.toProject(doc) : null;
  }

  async findAll(): Promise<Project[]> {
    const docs = await this.collection.find({ isActive: true }).toArray();
    return docs.map(doc => this.toProject(doc));
  }

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const result = await this.collection.findOneAndUpdate(
      { id, isActive: true },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? this.toProject(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { id, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async findByName(name: string): Promise<Project | null> {
    const doc = await this.collection.findOne({ name, isActive: true });
    return doc ? this.toProject(doc) : null;
  }

  private toProject(doc: any): Project {
    return new Project(
      doc.id,
      doc.name,
      doc.baseUrl,
      doc.config,
      doc.createdAt,
      doc.updatedAt,
      doc.isActive
    );
  }
}