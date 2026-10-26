import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600 mt-1">{subtitle}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2 cursor-pointer"
        >
          {actionIcon}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
