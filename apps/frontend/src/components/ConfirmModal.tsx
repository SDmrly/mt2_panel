// apps/frontend/src/components/ConfirmModal.tsx
export function ConfirmModal({
  open,
  title,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 space-y-4 max-w-sm">
        <p>{title}</p>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onCancel}>
            İptal
          </button>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded"
            onClick={onConfirm}
          >
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
}
