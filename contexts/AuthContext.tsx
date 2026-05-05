import React, { createContext, useState, ReactNode } from 'react';
import { UserRole } from '@/constants/mockData';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  address?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (data: Partial<AuthUser> & { password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (email: string, password: string, role: UserRole) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockUser: AuthUser = {
      id: 'u_' + Date.now(),
      name: role === 'customer' ? 'Adaeze Okonkwo' : role === 'vendor' ? 'Chinedu Restaurant' : role === 'rider' ? 'Emeka Rider' : 'Admin User',
      email,
      phone: '+234 801 234 5678',
      role,
      address: '12 Allen Avenue, Ikeja, Lagos',
    };
    setUser(mockUser);
  };

  const register = async (data: Partial<AuthUser> & { password: string }) => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const newUser: AuthUser = {
      id: 'u_' + Date.now(),
      name: data.name || 'New User',
      email: data.email || '',
      phone: data.phone || '',
      role: data.role || 'customer',
      address: data.address,
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (data: Partial<AuthUser>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
