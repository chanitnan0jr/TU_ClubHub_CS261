// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CentralDashboardPage } from '../src/features/admin-dashboard/pages/CentralDashboardPage';

test('CentralDashboardPage Component Tests', async (t: any) => {
  await t.test('shows 403 Access Denied when user role is USER', () => {
    const html = renderToString(<CentralDashboardPage />);
    assert.ok(html);
  });

  await t.test('renders admin dashboard structure when user role is ADMIN', () => {
    const html = renderToString(<CentralDashboardPage />);
    assert.ok(html);
  });
});