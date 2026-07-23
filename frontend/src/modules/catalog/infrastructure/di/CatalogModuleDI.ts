import { InMemoryCatalogRepository } from '../repositories/InMemoryCatalogRepository';
import { CatalogUseCaseFacadeImpl } from '../facades/CatalogUseCaseFacadeImpl';

export const catalogRepository = new InMemoryCatalogRepository();
export const catalogFacade = new CatalogUseCaseFacadeImpl(catalogRepository);
