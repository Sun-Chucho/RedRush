export type WorkflowRole = 'customer' | 'vendor' | 'rider' | 'admin';
export type WorkflowStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

const NEXT_STATUS: Record<WorkflowStatus, WorkflowStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrder(role: WorkflowRole, from: WorkflowStatus, to: WorkflowStatus) {
  if (from === to) return true;
  if (!NEXT_STATUS[from].includes(to)) return false;
  if (role === 'admin') return true;
  if (role === 'customer') return to === 'cancelled' && (from === 'pending' || from === 'accepted');
  if (role === 'vendor') {
    return (
      (from === 'pending' && to === 'accepted') ||
      (from === 'accepted' && to === 'preparing') ||
      (from === 'preparing' && to === 'ready') ||
      (to === 'cancelled' && ['pending', 'accepted', 'preparing', 'ready'].includes(from))
    );
  }
  return (
    (from === 'ready' && to === 'assigned') ||
    (from === 'assigned' && to === 'picked_up') ||
    (from === 'picked_up' && to === 'delivered')
  );
}

export function assertOrderTransition(role: WorkflowRole, from: WorkflowStatus, to: WorkflowStatus) {
  if (!canTransitionOrder(role, from, to)) {
    throw new Error(`Invalid order transition for ${role}: ${from} → ${to}. Refresh the order and try again.`);
  }
}
