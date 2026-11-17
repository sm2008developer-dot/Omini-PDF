import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateVignetteNavigation,
  MONETAG_DIRECT_LINK_URL,
  MONETAG_VIGNETTE_ZONE,
  VIGNETTE_NAV_THRESHOLD,
} from './monetag.js';

test('Monetag Direct Link and Vignette constants match requested configuration', () => {
  assert.equal(MONETAG_DIRECT_LINK_URL, 'https://uplcm.com/4/12282565');
  assert.equal(MONETAG_VIGNETTE_ZONE, '12282581');
  assert.equal(VIGNETTE_NAV_THRESHOLD, 3);
});

test('Vignette script does NOT trigger on initial page load or duplicate same-route hits', () => {
  const initial = evaluateVignetteNavigation({
    previousPath: null,
    nextPath: '/',
    currentCount: 0,
    alreadyInjected: false,
  });
  assert.equal(initial.nextCount, 0);
  assert.equal(initial.shouldInjectVignette, false);

  const sameRoute = evaluateVignetteNavigation({
    previousPath: '/merge-pdf',
    nextPath: '/merge-pdf/',
    currentCount: 2,
    alreadyInjected: false,
  });
  assert.equal(sameRoute.nextCount, 2);
  assert.equal(sameRoute.shouldInjectVignette, false);
});

test('Vignette script triggers only after reaching 3 page transitions and never duplicates', () => {
  const step1 = evaluateVignetteNavigation({
    previousPath: '/',
    nextPath: '/merge-pdf',
    currentCount: 0,
    alreadyInjected: false,
  });
  assert.equal(step1.nextCount, 1);
  assert.equal(step1.shouldInjectVignette, false);

  const step2 = evaluateVignetteNavigation({
    previousPath: '/merge-pdf',
    nextPath: '/compress-pdf',
    currentCount: step1.nextCount,
    alreadyInjected: false,
  });
  assert.equal(step2.nextCount, 2);
  assert.equal(step2.shouldInjectVignette, false);

  const step3 = evaluateVignetteNavigation({
    previousPath: '/compress-pdf',
    nextPath: '/history',
    currentCount: step2.nextCount,
    alreadyInjected: false,
  });
  assert.equal(step3.nextCount, 3);
  assert.equal(step3.shouldInjectVignette, true);

  const step4 = evaluateVignetteNavigation({
    previousPath: '/history',
    nextPath: '/split-pdf',
    currentCount: step3.nextCount,
    alreadyInjected: true,
  });
  assert.equal(step4.nextCount, 4);
  assert.equal(step4.shouldInjectVignette, false);
});

test('Vignette script does not inject on /admin even if threshold is reached', () => {
  const adminNav = evaluateVignetteNavigation({
    previousPath: '/history',
    nextPath: '/admin',
    currentCount: 5,
    alreadyInjected: false,
  });
  assert.equal(adminNav.shouldInjectVignette, false);
});
