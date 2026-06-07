import React from 'react';
import { CheckCircle2, Clock, CircleDashed } from 'lucide-react';
import { TASK_STATUS } from '../../constants';

export default function StatusIcon({ status, className = "" }) {
  switch (status) {
    case TASK_STATUS.DONE: return <CheckCircle2 className={`text-status-done ${className}`} />;
    case TASK_STATUS.IN_PROGRESS: return <Clock className={`text-status-progress ${className}`} />;
    default: return <CircleDashed className={`text-status-todo ${className}`} />;
  }
}
