import { useContext } from 'react';
import { CustomerDataContext } from '@/contexts/CustomerDataContext';

export function useCustomerData() {
  const context = useContext(CustomerDataContext);

  if (!context) {
    throw new Error('useCustomerData must be used within CustomerDataProvider');
  }

  return context;
}
