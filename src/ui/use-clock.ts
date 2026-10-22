import { createSignal, onCleanup } from 'solid-js';

export const useClock = () => {
  const [now, setNow] = createSignal(Date.now());
  const ticker = setInterval(() => setNow(Date.now()), 1000);
  onCleanup(() => clearInterval(ticker));
  return now;
};
