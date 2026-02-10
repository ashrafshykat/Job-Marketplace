'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    label: 'Pending'
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800',
    icon: Clock,
    label: 'In Progress'
  },
  submitted: {
    color: 'bg-purple-100 text-purple-800',
    icon: AlertCircle,
    label: 'Submitted'
  },
  completed: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    label: 'Completed'
  },
  rejected: {
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    label: 'Rejected'
  },
  open: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    label: 'Open'
  },
  assigned: {
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle,
    label: 'Assigned'
  }
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    color: 'bg-gray-100 text-gray-800',
    icon: AlertCircle,
    label: status.replace('_', ' ')
  };

  const Icon = config.icon;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color} ${className}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </motion.span>
  );
}

