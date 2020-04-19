import { Repository } from 'typeorm';
import Category from '../models/Category';

interface Request {
  title: string;
}

class GetOrCreateCategory {
  private categoryRepository: Repository<Category>;

  constructor(categoryRepository: Repository<Category>) {
    this.categoryRepository = categoryRepository;
  }

  public async execute({ title }: Request): Promise<Category> {
    let category = await this.categoryRepository.findOne({
      where: { title },
    });

    if (!category) {
      const newCategory = this.categoryRepository.create({
        title,
      });

      category = await this.categoryRepository.save(newCategory);
    }

    return category;
  }
}

export default GetOrCreateCategory;
