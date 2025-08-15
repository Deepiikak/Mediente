export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  position: string;
  address: string;
  bio: string;
  isActive: boolean;
  hireDate: string;
  salary: number;
  skills: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  position: string;
  address: string;
  bio: string;
  isActive: boolean;
  hireDate: string;
  salary: number;
  skills: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface UpdateUserData extends Partial<CreateUserData> {
  id: string;
}

