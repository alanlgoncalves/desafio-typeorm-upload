import { Router } from 'express';
import { getCustomRepository, getRepository } from 'typeorm';
import multer from 'multer';

import uploadConfig from '../config/upload';

import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();

const upload = multer(uploadConfig);

transactionsRouter.get('/', async (request, response) => {
  const transactionRepository = getCustomRepository(TransactionsRepository);

  const transactions = await transactionRepository.find({
    relations: ['category'],
  });

  const balance = await transactionRepository.getBalance();

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;

  const categoryRepository = getRepository(Category);
  const transactionRepository = getCustomRepository(TransactionsRepository);

  const createTransactionService = new CreateTransactionService(
    categoryRepository,
    transactionRepository,
  );

  const transaction = await createTransactionService.execute({
    title,
    value,
    type,
    categoryTitle: category,
  });

  response.status(201).json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;

  const deleteTransactionService = new DeleteTransactionService();

  await deleteTransactionService.execute(id);

  response.status(204).send();
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const categoryRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const importTransactionService = new ImportTransactionsService(
      categoryRepository,
      transactionRepository,
    );

    const { file } = request;

    const transactions = await importTransactionService.execute({ file });

    return response.json(transactions);
  },
);

export default transactionsRouter;
