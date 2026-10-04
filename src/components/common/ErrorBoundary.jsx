import React from 'react';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    const msg = error?.message || String(error || '');
    const isChunkError =
      msg.includes('MIME type') ||
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      const reloadKey = 'eb_chunk_auto_reload';
      const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem(reloadKey, Date.now().toString());
        this.handleHardReload();
      }
    }
  }

  isChunkError() {
    const msg = this.state.error?.message || String(this.state.error || '');
    return (
      msg.includes('MIME type') ||
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch') ||
      this.state.error?.name === 'ChunkLoadError'
    );
  }

  handleHardReload = async () => {
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch (e) {
      console.warn('Failed clearing caches during reload:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleReload = () => {
    this.handleHardReload();
  };

  render() {
    if (this.state.hasError) {
      const chunkError = this.isChunkError();

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className={`liquid-glass-card max-w-sm w-full p-6 rounded-3xl border ${
            chunkError ? 'border-primary-500/20 bg-primary-500/5' : 'border-red-500/20 bg-red-500/5'
          }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
              chunkError ? 'bg-primary-500/10 text-primary-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {chunkError ? <Sparkles size={24} /> : <AlertCircle size={24} />}
            </div>
            
            <h3 className="font-bold text-base text-main mb-1">
              {chunkError ? 'มีการอัปเดตเวอร์ชันใหม่' : 'เกิดข้อผิดพลาดในการโหลดหน้านี้'}
            </h3>
            
            <p className="text-xs text-main/60 mb-4 leading-relaxed">
              {chunkError
                ? 'ระบบตรวจพบการอัปเดตเวอร์ชันใหม่ หรือไฟล์ชั่วคราวหมดอายุ กรุณากดปุ่มด้านล่างเพื่อโหลดข้อมูลล่าสุด'
                : (this.state.error?.message || "โปรดลองกดรีเฟรชหน้าเว็บอีกครั้ง")}
            </p>

            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>{chunkError ? 'อัปเดตและรีเฟรชหน้าเว็บ' : 'รีเฟรชหน้าเว็บ'}</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

