import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  isbnSchema,
  listBooksResponseSchema,
  editionLookupResponseSchema,
  errorResponseSchema,
} from '@dream-library/shared';
import { booksService } from '../services/books.service.js';

const isbnParams = z.object({ isbn: isbnSchema });

export const bookRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/books', {
    schema: {
      tags: ['books'],
      summary: 'List books in the catalog',
      response: { 200: listBooksResponseSchema },
    },
    handler: async () => {
      const books = await booksService.listCatalog();
      return { books };
    },
  });

  app.get('/books/by-isbn/:isbn', {
    schema: {
      tags: ['books'],
      summary: 'Look up a book edition by ISBN-10 or ISBN-13',
      params: isbnParams,
      response: {
        200: editionLookupResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: async (req) => {
      return booksService.findEditionByIsbn(req.params.isbn);
    },
  });
};
