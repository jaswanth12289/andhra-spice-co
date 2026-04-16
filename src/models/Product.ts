export interface IOption {
  weight: string;
  price: number;
  stock: number;
}

export interface IProduct {
  id?: string;
  name: string;
  description: string;
  options: IOption[];
  category: 'Whole Spices' | 'Powdered Spices' | 'Blended Masalas';
  imageUrl?: string; // Fallback for old products
  images?: string[]; // Array of image URLs
  createdAt?: string;
  updatedAt?: string;
}
