import {
  listBooksResponseSchema,
  editionLookupResponseSchema,
  type ListBooksResponse,
  type EditionLookupResponse,
} from '@dream-library/shared';
import { api } from '../lib/api';

export async function listBooks(): Promise<ListBooksResponse> {
  const data = await api<unknown>('/api/v1/books');
  return listBooksResponseSchema.parse(data);
}

export async function findEditionByIsbn(isbn: string): Promise<EditionLookupResponse> {
  const data = await api<unknown>(`/api/v1/books/by-isbn/${encodeURIComponent(isbn)}`);
  return editionLookupResponseSchema.parse(data);
}
