import { useDragControls } from 'framer-motion';

export function useSwipeToClose(onClose, { offset = 110, velocity = 650, elastic = 0.42 } = {}) {
  const dragControls = useDragControls();

  const dragProps = {
    drag: 'y',
    dragControls,
    dragListener: false,
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: elastic },
    onDragEnd: (_, info) => {
      if (info.offset.y > offset || info.velocity.y > velocity) {
        onClose?.();
      }
    }
  };

  const handleProps = {
    onPointerDown: (event) => dragControls.start(event),
    className: 'w-12 h-1.5 bg-black/10 dark:bg-white/20 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing touch-none'
  };

  return { dragProps, handleProps };
}
