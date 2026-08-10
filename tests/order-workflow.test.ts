import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionOrder } from '../services/orderWorkflow.ts';
import { marketForCoordinates, marketForCountry } from '../constants/locationTiers.ts';
import { currencyForCoordinates, currencyForCountry } from '../constants/currency.ts';

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

test('Tanzanian locale and GPS values always select TZS', () => {
  assert.equal(marketForCountry('Tanzania'), 'TZ');
  assert.equal(marketForCountry('United Republic of Tanzania'), 'TZ');
  assert.equal(marketForCountry('TZ'), 'TZ');
  assert.equal(marketForCountry('TZA'), 'TZ');
  assert.equal(currencyForCountry('TZ'), 'TZS');
  assert.equal(currencyForCoordinates(-6.7924, 39.2083), 'TZS'); // Dar es Salaam
  assert.equal(currencyForCoordinates(-3.3869, 36.6830), 'TZS'); // Arusha
  assert.equal(currencyForCoordinates(-2.5164, 32.9175), 'TZS'); // Mwanza
});

test('southern Kenyan locations remain KES', () => {
  assert.equal(marketForCoordinates(-1.2864, 36.8172), 'KE'); // Nairobi
  assert.equal(currencyForCoordinates(-4.0435, 39.6682), 'KES'); // Mombasa
});
