import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import type { BundlePreviewService } from '../catalog/bundle-preview.service.js';

export function createBundlePreviewController(service: BundlePreviewService) {
  return async (request: Request, response: Response) => {
    const categoryId = request.query.categoryId;
    if (categoryId !== undefined && (typeof categoryId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId))) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid category identifier');
    }
    response.setHeader('Cache-Control', 'no-store');
    response.json(await service.list(categoryId));
  };
}
