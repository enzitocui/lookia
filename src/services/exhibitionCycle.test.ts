import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createExhibitionCycle, type ExhibitionScheduler } from './exhibitionCycle.ts';

class FakeScheduler implements ExhibitionScheduler {
  private nextId = 1;
  readonly frames = new Map<number, FrameRequestCallback>();
  readonly timers = new Map<ReturnType<typeof setTimeout>, { callback: () => void; delay: number }>();

  requestFrame(callback: FrameRequestCallback) {
    const id = this.nextId++;
    this.frames.set(id, callback);
    return id;
  }

  cancelFrame(id: number) {
    this.frames.delete(id);
  }

  setTimeout(callback: () => void, delay: number) {
    const id = setTimeout(() => {}, 0);
    clearTimeout(id);
    this.timers.set(id, { callback, delay });
    return id;
  }

  clearTimeout(id: ReturnType<typeof setTimeout>) {
    this.timers.delete(id);
  }

  runFrame(timestamp: number) {
    const [id, callback] = this.frames.entries().next().value ?? [];
    if (id === undefined || !callback) return;
    this.frames.delete(id);
    callback(timestamp);
  }

  runTimer() {
    const [id, timer] = this.timers.entries().next().value ?? [];
    if (id === undefined || !timer) return;
    this.timers.delete(id);
    timer.callback();
  }
}

test('changes category after the configured display duration and skips empty categories', async () => {
  const scheduler = new FakeScheduler();
  const categories: string[] = [];
  let themeToggles = 0;
  let scrollTop = 0;
  let maxScroll = 24;
  const cycle = createExhibitionCycle({
    categories: ['Boho', 'Empty', 'AURA'],
    getScrollTop: () => scrollTop,
    getMaxScroll: () => maxScroll,
    setCategory: category => {
      categories.push(category);
      maxScroll = category === 'AURA' ? 0 : 24;
    },
    setScrollTop: value => { scrollTop = value; },
    waitForContent: async category => category !== 'Empty',
    onCategoryStart: () => { themeToggles += 1; },
    onStop: () => {},
    pixelsPerSecond: 24,
    categoryDurationMs: 20000,
    scheduler,
  });

  cycle.start();
  await Promise.resolve();
  assert.equal(categories[0], 'Boho');
  assert.equal(themeToggles, 1);
  assert.equal([...scheduler.timers.values()][0]?.delay, 20000);
  scheduler.runFrame(0);
  scheduler.runFrame(1000);
  assert.equal(scrollTop, 24);
  assert.equal(scheduler.timers.size, 1);
  scheduler.runTimer();
  await Promise.resolve();
  assert.equal(categories.at(-1), 'Empty');
  scheduler.runTimer();
  await Promise.resolve();
  assert.equal(categories.at(-1), 'AURA');
  assert.equal(themeToggles, 2);
  cycle.stop();
});

test('advances after the category timer without waiting for the scroll to reach the bottom', async () => {
  const scheduler = new FakeScheduler();
  const shown: string[] = [];
  const cycle = createExhibitionCycle({
    categories: ['Boho', 'AURA'],
    getScrollTop: () => 0,
    getMaxScroll: () => 10000,
    setCategory: category => shown.push(category),
    setScrollTop: () => {},
    waitForContent: async () => true,
    onCategoryStart: () => {},
    onStop: () => {},
    categoryDurationMs: 20000,
    scheduler,
  });

  cycle.start();
  await Promise.resolve();
  assert.equal(scheduler.frames.size, 1);
  scheduler.runTimer();
  await Promise.resolve();
  assert.deepEqual(shown, ['Boho', 'AURA']);
  assert.equal(scheduler.frames.size, 1);
  cycle.stop();
  assert.equal(scheduler.frames.size, 0);
});

test('STOP cancels the scroll frame and pending category timer and restores theme once', async () => {
  const scheduler = new FakeScheduler();
  let restoredTheme = '';
  let restoreCount = 0;
  let toggles = 0;
  let resolveContent: ((hasContent: boolean) => void) | undefined;
  const cycle = createExhibitionCycle({
    categories: ['Boho', 'AURA'],
    getScrollTop: () => 0,
    getMaxScroll: () => 100,
    setCategory: () => {},
    setScrollTop: () => {},
    waitForContent: () => new Promise(resolve => { resolveContent = resolve; }),
    onCategoryStart: () => { toggles += 1; },
    onStop: () => { restoredTheme = 'dark'; restoreCount += 1; },
    scheduler,
  });

  cycle.start();
  assert.ok(resolveContent);
  cycle.stop();
  resolveContent?.(true);
  await Promise.resolve();
  assert.equal(cycle.isRunning(), false);
  assert.equal(scheduler.frames.size, 0);
  assert.equal(scheduler.timers.size, 0);
  assert.equal(toggles, 0);
  assert.equal(restoredTheme, 'dark');
  cycle.stop();
  assert.equal(restoreCount, 1);
});

test('STOP clears the active pause timer and prevents the next category from starting', async () => {
  const scheduler = new FakeScheduler();
  const shown: string[] = [];
  const cycle = createExhibitionCycle({
    categories: ['Boho', 'AURA'],
    getScrollTop: () => 0,
    getMaxScroll: () => 0,
    setCategory: category => shown.push(category),
    setScrollTop: () => {},
    waitForContent: async () => true,
    onCategoryStart: () => {},
    onStop: () => {},
    scheduler,
  });

  cycle.start();
  await Promise.resolve();
  scheduler.runFrame(0);
  assert.equal(scheduler.timers.size, 1);
  cycle.stop();
  scheduler.runTimer();
  await Promise.resolve();
  assert.deepEqual(shown, ['Boho']);
});
