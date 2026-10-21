export interface EventGalleryImage {
  imageId: string;
  url: string;
  altText: string;
  sortOrder: number;
  isFeatured: boolean;
}

export interface EventGalleryResponse {
  data: EventGalleryImage[];
}
