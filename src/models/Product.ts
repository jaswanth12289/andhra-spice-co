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
  imageUrl: string;
  createdAt?: string;
  updatedAt?: string;
}
