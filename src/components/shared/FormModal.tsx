import type { FormEventHandler, ReactNode } from "react";
import { X } from "lucide-react";

type FormModalProps = {
  title: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel: string;
  cancelLabel?: string;
  children: ReactNode;
};

export function FormModal({
  title,
  onClose,
  onSubmit,
  submitLabel,
  cancelLabel = "Annuler",
  children,
}: FormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {children}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-200 rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2 cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2 cursor-pointer"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
