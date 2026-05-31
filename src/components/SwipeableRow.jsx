import React, { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Trash2 } from 'lucide-react';

export default function SwipeableRow({ children, onDelete }) {
  const controls = useAnimation();
  const [isRevealed, setIsRevealed] = useState(false);
  const swipeThreshold = -60;

  const handleDragEnd = (event, info) => {
    if (info.offset.x < swipeThreshold) {
      setIsRevealed(true);
      controls.start({ x: -80 });
    } else {
      setIsRevealed(false);
      controls.start({ x: 0 });
    }
  };

  const handleClose = () => {
    setIsRevealed(false);
    controls.start({ x: 0 });
  };

  return (
    <div className="relative w-full rounded-[20px] overflow-hidden group">
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="flex items-stretch w-full touch-pan-y"
      >
        {/* Foreground content */}
        <div className="min-w-full shrink-0">
          {children}
        </div>

        {/* Background action (Delete button) */}
        <div className="w-[80px] shrink-0 bg-red-500 flex items-center justify-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              handleClose();
            }}
            className="text-white flex flex-col items-center gap-1 active:scale-90 transition-transform w-full h-full justify-center"
          >
            <Trash2 size={20} />
            <span className="text-[10px] font-bold">ลบ</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
