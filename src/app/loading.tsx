import { Zap } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <p className="text-surface-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
