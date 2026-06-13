import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Bug, Palette, Rocket, LayoutDashboard } from 'lucide-react';
import pkg from '../../../package.json';

const CHANGELOG_DATA = [
  {
    version: '1.0.6',
    date: '14 มิ.ย. 2026',
    changes: [
      { type: 'feature', icon: <LayoutDashboard size={16} />, text: 'จัดระเบียบหน้าโปรไฟล์ใหม่ แยกหมวดหมู่เป็น 3 แท็บ (ข้อมูลส่วนตัว, สาธารณะ, ความสำเร็จ) เพื่อความสวยงามและใช้งานง่ายขึ้น' },
      { type: 'feature', icon: <Sparkles size={16} />, text: 'เพิ่มหน้าต่าง "มีอะไรใหม่ (Changelog)" เพื่อแสดงประวัติการอัปเดตแอปพลิเคชัน' },
      { type: 'bugfix', icon: <Bug size={16} />, text: 'แก้ไขปัญหาตัวอักษรในธีม Midnight ให้สว่างและสามารถอ่านได้ชัดเจน' },
      { type: 'bugfix', icon: <Bug size={16} />, text: 'แก้ไขข้อผิดพลาดแอปพลิเคชันเด้งออก เมื่อกดดูรายละเอียดเพื่อนที่ไม่ได้ตั้งชื่อโปรไฟล์' },
      { type: 'ui', icon: <Palette size={16} />, text: 'นำปุ่มย้อนกลับ (Back Button) ออกจากหน้าเมนูหลักทั้งหมด เพื่อให้แถบเมนูด้านบนดูเป็นระเบียบ' }
    ]
  },
  {
    version: '1.0.5',
    date: '13 มิ.ย. 2026',
    changes: [
      { type: 'feature', icon: <Rocket size={16} />, text: 'เพิ่มระบบแชทแบบ Real-time และการตั้งค่าโปรไฟล์สาธารณะ' },
      { type: 'feature', icon: <Sparkles size={16} />, text: 'เพิ่มระบบแจ้งเตือนกะพาร์ทไทม์ล่วงหน้า 30 นาที' },
      { type: 'bugfix', icon: <Bug size={16} />, text: 'ปรับปรุงประสิทธิภาพการโหลดข้อมูลกะงานและปฏิทิน' }
    ]
  }
];

export default function ChangelogModal({ isOpen, onClose, lang = 'th' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-[#1a1a2e] rounded-[32px] shadow-2xl overflow-hidden relative border border-black/5 dark:border-white/10"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                  <Sparkles size={24} className="text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-main leading-tight">
                    {lang === 'en' ? "What's New" : 'มีอะไรใหม่?'}
                  </h2>
                  <p className="text-xs font-bold text-primary-500">เวอร์ชันล่าสุด v{pkg.version}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-black/5 dark:bg-white/10 text-main rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar bg-gray-50 dark:bg-[#1a1a2e]/50">
              {CHANGELOG_DATA.map((release, index) => (
                <div key={release.version} className="relative">
                  {/* Version Header */}
                  <div className="flex items-end gap-3 mb-4">
                    <h3 className="text-2xl font-black text-main">v{release.version}</h3>
                    <span className="text-sm font-medium text-main/50 pb-1">{release.date}</span>
                    {index === 0 && (
                      <span className="px-3 py-1 bg-green-500/10 text-green-600 text-[10px] font-black rounded-full uppercase tracking-wider mb-1.5 border border-green-500/20">Latest</span>
                    )}
                  </div>

                  {/* Changes List */}
                  <div className="space-y-3">
                    {release.changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-3 bg-white dark:bg-white/5 p-4 rounded-[20px] shadow-sm border border-black/5 dark:border-white/5 hover:border-primary-500/30 transition-colors">
                        <div className={`mt-0.5 shrink-0 p-1.5 rounded-full bg-black/5 dark:bg-white/5 ${change.type === 'feature' ? 'text-primary-500' : change.type === 'bugfix' ? 'text-orange-500' : 'text-purple-500'}`}>
                          {change.icon}
                        </div>
                        <p className="text-[13px] md:text-sm text-main/90 font-medium leading-relaxed">{change.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-white dark:bg-[#1a1a2e] border-t border-black/5 dark:border-white/10">
               <button 
                  onClick={onClose}
                  className="w-full py-4 bg-primary-500 text-white font-bold rounded-2xl active:scale-[0.98] transition-transform shadow-lg shadow-primary-500/30 text-lg"
               >
                  {lang === 'en' ? 'Got it!' : 'รับทราบ!'}
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
