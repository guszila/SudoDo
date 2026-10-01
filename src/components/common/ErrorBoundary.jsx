import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

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
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="liquid-glass-card max-w-sm w-full p-6 rounded-3xl border border-red-500/20 bg-red-500/5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} />
            </div>
            <h3 className="font-bold text-base text-main mb-1">เกิดข้อผิดพลาดในการโหลดหน้านี้</h3>
            <p className="text-xs text-main/60 mb-4">
              {this.state.error?.message || "โปรดลองกดรีเฟรชหน้าเว็บอีกครั้ง"}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              <RefreshCw size={14} />
              <span>รีเฟรชหน้าเว็บ</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
