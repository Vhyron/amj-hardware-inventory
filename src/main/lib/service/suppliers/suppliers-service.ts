import { Supplier, SuppliersRepository } from './suppliers-repo'

export class SuppliersService {
  constructor(private repo: SuppliersRepository) {}

  async getAll(): Promise<Supplier[]> {
    return this.repo.getAll()
  }

  async getById(id: string): Promise<Supplier | null> {
    return this.repo.getById(id)
  }

  async create(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; supplierId?: string; message?: string }> {
    return this.repo.create(supplier)
  }

  async update(id: string, supplier: Partial<Supplier>): Promise<boolean> {
    return this.repo.update(id, supplier)
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id)
  }
}