import React from 'react';

export const SectionLabel = ({ children }) => (
  <div className="text-[11px] font-[500] text-[var(--theme-section-label)] dark:text-[#AFA9EC] tracking-[0.08em] px-4 mb-1.5 uppercase">
    {children}
  </div>
);

export const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-[rgba(255,255,255,0.35)] dark:bg-[rgba(255,255,255,0.08)] backdrop-blur-[20px] border-[0.5px] border-[rgba(255,255,255,0.5)] dark:border-[rgba(255,255,255,0.12)] rounded-[16px] mx-4 mb-4 overflow-hidden shadow-sm ${className}`}>
    {children}
  </div>
);

export const Toggle = ({ checked, onChange }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    className={`relative w-[44px] h-[26px] rounded-[13px] cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${checked ? 'bg-primary-500' : 'bg-black/20 dark:bg-white/20'}`}
  >
    <div 
      className={`absolute top-[3px] left-[3px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`}
    />
  </div>
);

export const SettingsRow = ({ icon: Icon, iconBgClass, iconColorClass = 'text-[#1a1a2e]', title, subtitle, rightElement, onClick, isLast }) => (
  <div 
    onClick={onClick}
    className={`flex items-center min-h-[52px] px-4 py-[13px] ${!isLast ? 'border-b-[0.5px] border-[rgba(255,255,255,0.3)] dark:border-[rgba(255,255,255,0.08)]' : ''} ${onClick ? 'cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors' : ''}`}
  >
    {Icon && (
      <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mr-3 ${iconBgClass} ${iconColorClass}`}>
        <Icon size={16} />
      </div>
    )}
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      <div className="text-[14px] font-[500] text-main leading-none mb-[2px]">{title}</div>
      {subtitle && <div className="text-[12px] text-main/60 leading-none mt-1">{subtitle}</div>}
    </div>
    <div className="shrink-0 ml-3 flex items-center gap-2">
      {rightElement}
    </div>
  </div>
);
