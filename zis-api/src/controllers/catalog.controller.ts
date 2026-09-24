import type { Request, Response } from 'express';
import { parseCatalogQuery } from '../contracts/validation.js';
import { ApiError } from '../http/api-error.js';
import type { CatalogService } from '../catalog/catalog.types.js';

export function createCatalogController(service: CatalogService) {
  return {
    listCategories: async (_request: Request, response: Response): Promise<void> => {
      response.status(200).json({ data: await service.listCategories() });
    },
    listProducts: async (request: Request, response: Response): Promise<void> => {
      const query = parseCatalogQuery(request.query as Record<string, unknown>);
      const result = await service.listProducts(query);
      const totalPages = Math.ceil(result.totalItems / query.pageSize);
      response.status(200).json({
        data: result.data,
        page: { ...query, totalItems: result.totalItems, totalPages },
      });
    },
    getProduct: async (request: Request, response: Response): Promise<void> => {
      const productId = request.params.productId;
      if (typeof productId !== 'string' || !isUuid(productId)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'productId must be a UUID', { productId: 'invalid UUID' });
      }
      const product = await service.getProduct(productId);
      if (!product) {
        throw new ApiError(404, 'NOT_FOUND', 'Product not found');
      }
      response.status(200).json(product);
    },
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
