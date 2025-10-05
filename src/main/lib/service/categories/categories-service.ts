import { categoriesRepo, Category } from './categories-repo'

export class CategoriesService {
  getCategories() {
    return categoriesRepo.getAllCategories()
  }

  getCategoryByName(name: string, excludeId?: string) {
    return categoriesRepo.checkCategoryNameExists(name, excludeId)
  }

  addCategory(category: Category): string | null {
    return categoriesRepo.insertCategory(category)
  }

  updateCategory(category: Category): boolean {
    return categoriesRepo.updateCategory(category)
  }

  deleteCategory(id: string): boolean {
    return categoriesRepo.deleteCategory(id)
  }
}