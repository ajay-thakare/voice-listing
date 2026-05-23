// {
//     "title": "Elegant Red Silk Saree for Wedding Season",
//     "description": "...",
//     "hashtags": ["#SilkSaree", ...],
//     "productType": "saree",
//     "variant": { "color": "red", "size": null },
//     "price": { "amount": 2500, "currency": "INR" },
//     "occasion": "wedding",
//     "language": "en",
//     "imagePrompts": ["...", ...]
// }

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
