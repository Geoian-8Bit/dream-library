import type { Book, BookEdition, EditionLookupResponse } from '@dream-library/shared';
import {
  booksRepository,
  type BookRow,
  type BookEditionRow,
} from '../repositories/books.repository.js';
import { NotFound } from '../lib/errors.js';

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function toWireBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    seriesId: row.seriesId,
    seriesIndex: row.seriesIndex,
    description: row.description,
    language: row.language,
    expectedReleaseDate: toIso(row.expectedReleaseDate),
  };
}

function toWireEdition(row: BookEditionRow): BookEdition {
  return {
    id: row.id,
    bookId: row.bookId,
    isbn10: row.isbn10,
    isbn13: row.isbn13,
    publisher: row.publisher,
    publishedAt: toIso(row.publishedAt),
    pageCount: row.pageCount,
    coverUrl: row.coverUrl,
    format: row.format,
  };
}

export const booksService = {
  async listCatalog(): Promise<Book[]> {
    const rows = await booksRepository.listCatalog();
    return rows.map(toWireBook);
  },

  async findEditionByIsbn(isbn: string): Promise<EditionLookupResponse> {
    const row = await booksRepository.findEditionByIsbn(isbn);
    if (!row) throw NotFound('edition', isbn);
    return {
      edition: toWireEdition(row),
      book: toWireBook(row.book),
    };
  },
};
