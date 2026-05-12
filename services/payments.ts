export type PaymentProvider = 'cash' | 'paystack' | 'mpesa';

export type PaymentReadiness = {
  provider: PaymentProvider;
  label: string;
  enabled: boolean;
  status: 'ready' | 'pending_verification';
};

export const PAYMENT_METHODS: PaymentReadiness[] = [
  {
    provider: 'cash',
    label: 'Cash on Delivery',
    enabled: true,
    status: 'ready',
  },
  {
    provider: 'paystack',
    label: 'Paystack',
    enabled: false,
    status: 'pending_verification',
  },
  {
    provider: 'mpesa',
    label: 'M-Pesa',
    enabled: false,
    status: 'pending_verification',
  },
];

export function isOnlinePaymentEnabled(provider: PaymentProvider) {
  return PAYMENT_METHODS.some(method => method.provider === provider && method.enabled);
}

export function getCashPaymentLabel() {
  return PAYMENT_METHODS[0].label;
}

export function getPaymentStatusForMethod(paymentMethod: string) {
  return paymentMethod.toLowerCase().includes('cash')
    ? 'collect_on_delivery'
    : 'pending_provider_verification';
}

export function isCashPayment(paymentMethod: string) {
  return paymentMethod.toLowerCase().includes('cash');
}
