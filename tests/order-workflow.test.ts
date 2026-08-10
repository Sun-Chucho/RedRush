import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionOrder } from '../services/orderWorkflow.ts';

test('customer to vendor to rider completes the full order lifecycle', () => {
  assert.equal(canTransitionOrder('vendor', 'pending', 'accepted'), true);
  assert.equal(canTransitionOrder('vendor', 'accepted', 'preparing'), true);
  assert.equal(canTransitionOrder('vendor', 'preparing', 'ready'), true);
  assert.equal(canTransitionOrder('rider', 'ready', 'assigned'), true);
  assert.equal(canTransitionOrder('rider', 'assigned', 'picked_up'), true);
  assert.equal(canTransitionOrder('rider', 'picked_up', 'delivered'), true);
});

test('customers can only cancel early orders', () => {
  assert.equal(canTransitionOrder('customer', 'pending', 'cancelled'), true);
  assert.equal(canTransitionOrder('customer', 'accepted', 'cancelled'), true);
  assert.equal(canTransitionOrder('customer', 'preparing', 'cancelled'), false);
  assert.equal(canTransitionOrder('customer', 'picked_up', 'delivered'), false);
});

test('terminal and skipped states are rejected', () => {
  assert.equal(canTransitionOrder('vendor', 'pending', 'ready'), false);
  assert.equal(canTransitionOrder('rider', 'ready', 'delivered'), false);
  assert.equal(canTransitionOrder('admin', 'delivered', 'cancelled'), false);
  assert.equal(canTransitionOrder('admin', 'cancelled', 'pending'), false);
});

test('same-state metadata updates remain valid', () => {
  assert.equal(canTransitionOrder('vendor', 'preparing', 'preparing'), true);
  assert.equal(canTransitionOrder('rider', 'picked_up', 'picked_up'), true);
});
