interface RKixLogoProps {
  compact?: boolean;
  className?: string;
}

export default function RKixLogo({ compact = false, className = '' }: RKixLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="RKix Storage Center">
      <div className="rkix-logo-mark relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/30 bg-slate-950 shadow-[0_0_32px_rgba(0,212,255,0.22)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.38),transparent_24%),linear-gradient(135deg,rgba(0,212,255,0.9),rgba(67,56,202,0.86)_52%,rgba(10,10,10,0.95))]" />
        <svg className="relative h-6 w-6 text-white drop-shadow" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M7 8.5H17.4C21 8.5 23.5 10.7 23.5 13.8C23.5 16 22.2 17.8 20.1 18.6L25 25H20.4L16.1 19.2H11V25H7V8.5Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M11 12.2H17C18.5 12.2 19.4 12.9 19.4 14C19.4 15.2 18.5 15.9 17 15.9H11V12.2Z" fill="currentColor" />
          <path d="M21.4 7L25 3.8M21.8 25L25.8 28.2M6.6 7L3 3.8M6.2 25L2.2 28.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.72" />
        </svg>
      </div>
      {!compact && (
        <div className="flex min-w-0 flex-col">
          <span className="font-display text-base font-bold tracking-tight text-white">
            RKix <span className="text-[#00D4FF]">Storage</span>
          </span>
          <span className="font-mono text-[9px] uppercase leading-none tracking-[0.34em] text-cyan-100/45">
            Center v1.0
          </span>
        </div>
      )}
    </div>
  );
}
