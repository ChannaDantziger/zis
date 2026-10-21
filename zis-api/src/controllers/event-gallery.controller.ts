import type { Request, Response } from 'express';
import type { EventGalleryService } from '../event-gallery/event-gallery.types.js';

export function createEventGalleryController(service: EventGalleryService) {
  return {
    async listPublished(_request: Request, response: Response): Promise<void> {
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({ data: await service.listPublished() });
    },
  };
}
