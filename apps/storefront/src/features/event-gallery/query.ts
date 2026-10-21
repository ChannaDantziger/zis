import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../shared/api/http-client';
import type { GalleryImage } from '../product-gallery/ImageGallery';

export interface EventImage extends GalleryImage { sortOrder: number; isFeatured: boolean }

export function useEventGalleryQuery() {
  return useQuery({
    queryKey: ['event-gallery'],
    queryFn: ({ signal }) => apiRequest<{ data: EventImage[] }>('/event-gallery', { signal }),
    refetchInterval: 10 * 60 * 1000,
  });
}
