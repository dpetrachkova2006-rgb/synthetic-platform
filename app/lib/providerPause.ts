export function providerRetryDelay(response: Response): number | null {
  if (response.status !== 429 || response.headers.get('X-AI-Quota') === 'request-size') return null;
  const seconds = Number(response.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 15 * 60 ? Math.ceil(seconds) : null;
}

export function waitForProvider(seconds: number, signal: AbortSignal | undefined, onRemaining: (seconds: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Отменено', 'AbortError')); return; }
    const deadline = Date.now() + seconds * 1000 + 500;
    const update = () => onRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const cleanup = () => { clearTimeout(timer); clearInterval(interval); signal?.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Отменено', 'AbortError')); };
    const interval = setInterval(update, 1000);
    const timer = setTimeout(() => { cleanup(); resolve(); }, seconds * 1000 + 500);
    signal?.addEventListener('abort', abort, { once: true });
    update();
  });
}
