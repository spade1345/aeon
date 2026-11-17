/**
 * Scheduler tick source. A Web Worker timer is not throttled when the tab is in the background
 * (main-thread timers can be clamped to 1 Hz), which keeps the audio look-ahead scheduler steady.
 * Falls back to setInterval when workers are unavailable.
 */
export class TickTimer {
  private worker: Worker | null = null;
  private url: string | null = null;
  private id: number | null = null;

  constructor(
    private cb: () => void,
    private ms: number,
  ) {}

  start() {
    if (this.worker || this.id !== null) return;
    try {
      const code = `let t=null;onmessage=function(e){if(e.data==='start'){if(t)clearInterval(t);t=setInterval(function(){postMessage(1)},${this.ms})}else{if(t)clearInterval(t);t=null}}`;
      this.url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      const w = new Worker(this.url);
      w.onmessage = () => this.cb();
      w.onerror = () => {
        this.killWorker();
        if (this.id === null) this.id = window.setInterval(this.cb, this.ms);
      };
      w.postMessage('start');
      this.worker = w;
    } catch {
      this.killWorker();
      this.id = window.setInterval(this.cb, this.ms);
    }
  }

  private killWorker() {
    if (this.worker) {
      try {
        this.worker.postMessage('stop');
        this.worker.terminate();
      } catch {
        /* ignore */
      }
      this.worker = null;
    }
    if (this.url) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
  }

  stop() {
    this.killWorker();
    if (this.id !== null) {
      clearInterval(this.id);
      this.id = null;
    }
  }
}
