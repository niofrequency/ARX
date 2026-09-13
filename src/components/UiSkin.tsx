import { useEffect } from 'react';

export default function UiSkin() {
  useEffect(() => {
    const root = document.documentElement;
    const move = (e: PointerEvent) => {
      root.style.setProperty('--spot-x', `${e.clientX}px`);
      root.style.setProperty('--spot-y', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return <div id="arx-spot" />;
}
