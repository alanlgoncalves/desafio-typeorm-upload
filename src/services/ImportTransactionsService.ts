import { Repository } from 'typeorm';
import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';
import AppError from '../errors/AppError';
import Category from '../models/Category';

import TransactionRepository from '../repositories/TransactionsRepository';
import GetOrCreateCategory from './GetOrCreateCategory';

interface Request {
  file: Express.Multer.File;
}

interface TransactionDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  private categoryRepository: Repository<Category>;

  private transactionRepository: TransactionRepository;

  constructor(
    categoryRepository: Repository<Category>,
    transactionRepository: TransactionRepository,
  ) {
    this.categoryRepository = categoryRepository;
    this.transactionRepository = transactionRepository;
  }

  public async execute({ file }: Request): Promise<Transaction[]> {
    // Convert the file to objects
    const transactionDTOList = this.getTransactionsFromFile({ file });

    // Create all categories
    await this.createCategories(transactionDTOList);

    // Create transactions
    const transactions = await this.createTransactions(transactionDTOList);

    return transactions;
  }

  private getTransactionsFromFile({ file }: Request): TransactionDTO[] {
    return file.buffer
      .toString()
      .split('\n')
      .filter((line, i) => i > 0 && line.trim() !== '')
      .map(
        (line): TransactionDTO => {
          const [title, type, value, category] = line
            .split(',')
            .map(element => element.trim());

          if (type !== 'income' && type !== 'outcome') {
            throw new AppError('Invalid category on CSV file.', 422);
          }

          return {
            title: title.trim(),
            type,
            value: Number(value),
            category: category.trim(),
          };
        },
      );
  }

  private async createCategories(
    transactionDTOList: TransactionDTO[],
  ): Promise<void> {
    const getOrCreateCategory = new GetOrCreateCategory(
      this.categoryRepository,
    );

    const categoriesTitle = transactionDTOList.map(
      transactions => transactions.category,
    );

    const distinctCategoriesDistinct = [
      ...Array.from(new Set(categoriesTitle)),
    ];

    const categoriesPromisse = distinctCategoriesDistinct.map(title =>
      getOrCreateCategory.execute({ title }),
    );

    await Promise.all(categoriesPromisse);
  }

  private async createTransactions(
    transactionDTOList: TransactionDTO[],
  ): Promise<Transaction[]> {
    const createTransactionService = new CreateTransactionService(
      this.categoryRepository,
      this.transactionRepository,
    );

    const promisses = transactionDTOList.map(transactionDTO =>
      createTransactionService.execute({
        title: transactionDTO.title,
        type: transactionDTO.type,
        value: transactionDTO.value,
        categoryTitle: transactionDTO.category,
        verifyBalance: false,
      }),
    );

    const transactions = await Promise.all(promisses);

    return transactions;
  }
}

export default ImportTransactionsService;
