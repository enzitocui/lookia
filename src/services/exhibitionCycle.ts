export type ExhibitionScheduler = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frameId: number) => void;
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (timerId: ReturnType<typeof setTimeout>) => void;
};

export type ExhibitionCycleOptions<Category> = {
  categories: readonly Category[];
  getScrollTop: () => number;
  getMaxScroll: () => number;
  setCategory: (category: Category) => void;
  setScrollTop: (scrollTop: number) => void;
  waitForContent: (category: Category, signal: AbortSignal) => Promise<boolean>;
  onCategoryStart: () => void;
  onStop: () => void;
  pixelsPerSecond?: number;
  categoryDurationMs?: number;
  scrollDurationForCategory?: (category: Category) => number | undefined;
  scheduler?: ExhibitionScheduler;
};

const browserScheduler: ExhibitionScheduler = {
  requestFrame: callback => requestAnimationFrame(callback),
  cancelFrame: frameId => cancelAnimationFrame(frameId),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: timerId => clearTimeout(timerId),
};

export const createExhibitionCycle = <Category,>({
  categories,
  getScrollTop,
  getMaxScroll,
  setCategory,
  setScrollTop,
  waitForContent,
  onCategoryStart,
  onStop,
  pixelsPerSecond = 24,
  categoryDurationMs = 20000,
  scrollDurationForCategory,
  scheduler = browserScheduler,
}: ExhibitionCycleOptions<Category>) => {
  let running = false;
  let frameId: number | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingContent: AbortController | null = null;
  let currentIndex = 0;

  const scheduleCategory = (index: number, delay: number) => {
    timerId = scheduler.setTimeout(() => {
      timerId = null;
      void showCategory(index);
    }, delay);
  };

  const scrollCategory = (category: Category) => {
    const durationMs = scrollDurationForCategory?.(category);
    if (durationMs !== undefined) {
      let startTimestamp: number | null = null;
      const startPosition = getScrollTop();
      const animate = (timestamp: number) => {
        if (!running) return;
        if (startTimestamp === null) startTimestamp = timestamp;
        const progress = Math.min(1, Math.max(0, (timestamp - startTimestamp) / Math.max(1, durationMs)));
        const maxScroll = Math.max(0, getMaxScroll());
        setScrollTop(startPosition + (maxScroll - startPosition) * progress);
        if (progress < 1) {
          frameId = scheduler.requestFrame(animate);
        } else {
          frameId = null;
        }
      };
      frameId = scheduler.requestFrame(animate);
      return;
    }

    let lastTimestamp: number | null = null;
    let position = getScrollTop();
    const animate = (timestamp: number) => {
      if (!running) return;
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const elapsedSeconds = Math.max(0, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      const maxScroll = Math.max(0, getMaxScroll());
      position = Math.min(maxScroll, position + elapsedSeconds * pixelsPerSecond);
      setScrollTop(position);
      if (position < maxScroll) {
        frameId = scheduler.requestFrame(animate);
      } else {
        frameId = null;
      }
    };
    frameId = scheduler.requestFrame(animate);
  };

  const showCategory = async (index: number) => {
    if (!running || !categories.length) return;
    if (frameId !== null) scheduler.cancelFrame(frameId);
    frameId = null;
    currentIndex = index;
    const category = categories[index];
    setCategory(category);
    setScrollTop(0);
    pendingContent = new AbortController();
    let hasContent = false;
    try {
      hasContent = await waitForContent(category, pendingContent.signal);
    } catch (error) {
      if (!pendingContent.signal.aborted) throw error;
    } finally {
      pendingContent = null;
    }
    if (!running) return;
    if (!hasContent) {
      scheduleCategory((index + 1) % categories.length, 100);
      return;
    }
    onCategoryStart();
    scheduleCategory((index + 1) % categories.length, categoryDurationMs);
    scrollCategory(category);
  };

  return {
    start() {
      if (running || !categories.length) return;
      running = true;
      void showCategory(0);
    },
    stop() {
      if (!running) return;
      running = false;
      if (frameId !== null) scheduler.cancelFrame(frameId);
      if (timerId !== null) scheduler.clearTimeout(timerId);
      pendingContent?.abort();
      frameId = null;
      timerId = null;
      pendingContent = null;
      onStop();
    },
    isRunning: () => running,
  };
};
