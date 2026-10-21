import { Router } from 'express';
import { createEventGalleryController } from '../controllers/event-gallery.controller.js';
import type { EventGalleryService } from '../event-gallery/event-gallery.types.js';

export function createEventGalleryRouter(service: EventGalleryService): Router {
  const router = Router();
  router.get('/event-gallery', createEventGalleryController(service).listPublished);
  return router;
}
