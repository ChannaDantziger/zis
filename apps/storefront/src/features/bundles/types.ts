export interface BundleImage { imageId: string; url: string; altText: string; isPrimary: boolean; sortOrder: number }
export interface BundleProduct { productId: string; categoryId: string; name: string; pricePerUnit: string; availableItems: number; image: { url: string; altText: string } | null }
export interface Bundle { bundleId: string; categoryId: string; categoryName: string; categorySlug: string; name: string; description: string | null; unitCount: number; images: BundleImage[] }
export interface BundleResponse { bundles: Bundle[]; products: BundleProduct[] }
export type Selection = Record<string, number>;
