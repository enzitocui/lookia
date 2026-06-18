import React, { useEffect, useRef, useState } from 'react';

export default function Loader({ minDuration = 5000, onFinish }: { minDuration?: number; onFinish?: () => void }) {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const minPromise = new Promise<void>((res) => setTimeout(res, minDuration));

    const loadPromise = ((): Promise<void> => {
      if (typeof document === 'undefined') return Promise.resolve();
      if (document.readyState === 'complete') return Promise.resolve();
      return new Promise((res) => window.addEventListener('load', () => res(), { once: true }));
    })();

    Promise.all([minPromise, loadPromise]).then(() => {
      if (cancelled) return;
      // trigger fade-out
      setVisible(false);
      // give time for fade animation before unmount
      setTimeout(() => onFinish && onFinish(), 600);
    });

    return () => {
      cancelled = true;
    };
  }, [minDuration, onFinish]);

  return (
    <div
      aria-hidden={!visible}
      className={`app-loader ${visible ? 'app-loader--visible' : 'app-loader--hidden'}`}
    >
      <video
        ref={videoRef}
        src="/loader.mp4"
        autoPlay
        muted
        playsInline
        className="app-loader-video"
      />
    </div>
  );
}
