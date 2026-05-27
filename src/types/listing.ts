export interface ProductVariant {
  color: string | null;
  size: string | null;
}

export interface ProductPrice {
  amount: number | null;
  currency: string | null;
}

export interface ListingGenerationResult {
  title: string;
  description: string;
  hashtags: string[];
  productType: string;
  variant: ProductVariant;
  price: ProductPrice;
  occasion: string | null;
  language: string;
  imagePrompts: string[];
}
