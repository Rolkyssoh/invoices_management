import { useState } from "react";
import { Plus, X, Edit2, Trash2 } from "lucide-react";
import type { CreateInvoiceItemRequest } from "../../types";
import { formatCurrency, validateRequired } from "../../types";
import { DataTable, TableCell } from "../shared";

export type DraftInvoiceItem = Omit<CreateInvoiceItemRequest, "invoice_id"> & { id?: string };

type InvoiceItemsEditorProps = {
  items: DraftInvoiceItem[];
  onChange: (items: DraftInvoiceItem[]) => void;
  onValidationErrors: (errors: string[]) => void;
  currency?: string;
};

const getEmptyItem = (): DraftInvoiceItem => ({
  description: "",
  quantity: 1,
  unit_price: 0,
  total_price_ht: 0,
});

export default function InvoiceItemsEditor({
  items,
  onChange,
  onValidationErrors,
  currency = 'EUR',
}: InvoiceItemsEditorProps) {
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<DraftInvoiceItem>(getEmptyItem());

  const resetItemForm = () => {
    setItemForm(getEmptyItem());
    setEditingDraftIndex(null);
  };

  const handleSaveDraftItem = () => {
    const itemErrors: string[] = [];
    if (!validateRequired(itemForm.description)) {
      itemErrors.push("La description de la ligne est requise");
    }
    if (itemForm.quantity <= 0) {
      itemErrors.push("La quantité doit être supérieure à 0");
    }
    if (itemForm.unit_price < 0) {
      itemErrors.push("Le prix unitaire ne peut pas être négatif");
    }
    if (itemErrors.length > 0) {
      onValidationErrors(itemErrors);
      return;
    }

    const nextItems = [...items];
    if (editingDraftIndex !== null) {
      nextItems[editingDraftIndex] = itemForm;
    } else {
      nextItems.push(itemForm);
    }

    onChange(nextItems);
    onValidationErrors([]);
    resetItemForm();
    setShowItemForm(false);
  };

  const editDraftItem = (index: number) => {
    setItemForm(items[index]);
    setEditingDraftIndex(index);
    setShowItemForm(true);
  };

  const removeDraftItem = (index: number) => {
    const nextItems = items.filter((_, i) => i !== index);
    onChange(nextItems);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Lignes de facture *</label>
        <button
          type="button"
          onClick={() => {
            if (editingDraftIndex === null) {
              resetItemForm();
            }
            setShowItemForm(true);
          }}
          className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm inline-flex items-center gap-1.5"
        >
          <Plus size={14} />
          Ajouter une ligne
        </button>
      </div>

      {showItemForm && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {editingDraftIndex !== null ? "Modifier la ligne" : "Nouvelle ligne"}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowItemForm(false);
                resetItemForm();
              }}
              className="p-1 rounded text-gray-500 hover:bg-gray-200"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Description *</label>
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              rows={2}
              className="px-4 py-2.5 border border-gray-300 rounded-lg outline-none transition-all w-full text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Qté *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={itemForm.quantity}
                onChange={(e) => {
                  const quantity = parseInt(e.target.value, 10) || 0;
                  setItemForm({
                    ...itemForm,
                    quantity,
                    total_price_ht: quantity * itemForm.unit_price,
                  });
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg outline-none transition-all w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Prix unitaire *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemForm.unit_price}
                onChange={(e) => {
                  const unitPrice = parseFloat(e.target.value) || 0;
                  setItemForm({
                    ...itemForm,
                    unit_price: unitPrice,
                    total_price_ht: unitPrice * itemForm.quantity,
                  });
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg outline-none transition-all w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Total HT</label>
              <input
                type="number"
                step="0.01"
                value={itemForm.total_price_ht}
                readOnly
                className="px-4 py-2.5 border border-gray-200 bg-gray-100 rounded-lg text-gray-600 w-full text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveDraftItem}
              className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm"
            >
              {editingDraftIndex !== null ? "Mettre à jour la ligne" : "Ajouter cette ligne"}
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <DataTable headers={["Description", "Qté", "Prix unitaire", "Total HT", "Actions"]}>
          {items.map((item, index) => (
            <tr key={item.id ?? `${item.description}-${index}`} className="hover:bg-gray-50/80">
              <TableCell>{item.description}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{formatCurrency(item.unit_price, currency)}</TableCell>
              <TableCell className="font-medium">{formatCurrency(item.total_price_ht, currency)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editDraftItem(index)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDraftItem(index)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </TableCell>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
