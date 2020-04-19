import { getCustomRepository, getRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import AppError from '../errors/AppError';

import TransactionRepository from '../repositories/TransactionsRepository';

import GetOrCreateCategory from './GetOrCreateCategory';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  categoryTitle: string;
  verifyBalance?: boolean;
}

class CreateTransactionService {
  private categoryRepository: Repository<Category>;

  private transactionRepository: TransactionRepository;

  constructor(
    categoryRepository: Repository<Category>,
    transactionRepository: TransactionRepository,
  ) {
    this.categoryRepository = categoryRepository;
    this.transactionRepository = transactionRepository;
  }

  public async execute({
    title,
    value,
    type,
    categoryTitle,
    verifyBalance = true,
  }: Request): Promise<Transaction> {
    const getOrCreateCategory = new GetOrCreateCategory(
      this.categoryRepository,
    );

    const category = await getOrCreateCategory.execute({
      title: categoryTitle,
    });

    if (verifyBalance && type === 'outcome') {
      const { total } = await this.transactionRepository.getBalance();

      if (total < value) {
        throw new AppError(
          'Insufficient balance to complete the transaction.',
          400,
        );
      }
    }

    const transaction = this.transactionRepository.create({
      title,
      value,
      type,
      category_id: category.id,
      category,
    });

    await this.transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
