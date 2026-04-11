export interface IUser {
  id?: string;
  name: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}
