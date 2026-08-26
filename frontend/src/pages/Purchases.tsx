import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productsApi, purchasesApi, suppliersApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Label, LoadingRow, Modal, PageHeader, Select } from "../components/ui";
import { formatDate, formatMoney, formatQty } from "../utils/format";
import type { Product, PurchaseStatus } from "../types";

const statusTone: Record<PurchaseStatus, "success" | "warning" | "default"> = {
  PENDING: "warning",
  RECEIVED: "success",
  CANCELLED: "default",
};

interface DraftItem {
  productId: string;
  quantity: number;
  unitCost: number;
}

export function Purchases() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const { data: purchases, isLoading } = useQuery({ queryKey: ["purchases"], queryFn: () => purchasesApi.list() });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => suppliersApi.list() });
  const { data: products } = useQuery({ queryKey: ["products", "all"], queryFn: () => productsApi.list() });

  const createMutation = useMutation({
    mutationFn: () => purchasesApi.create({ supplierId, items: items.filter((i) => i.productId && i.quantity > 0) }),
    onSuccess: () => {
      toast.success("Purchase order created");
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      closeModal();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.receive(id),
    onSuccess: () => {
      toast.success("Stock received");
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => purchasesApi.cancel(id),
    onSuccess: () => {
      toast.success("Purchase order cancelled");
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function openModal() {
    setSupplierId("");
    setItems([{ productId: "", quantity: 1, unitCost: 0 }]);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function productDefaultCost(id: string): number {
    return (products || []).find((p: Product) => p.id === id)?.costPrice || 0;
  }

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  return (
    <>
      <PageHeader title="Purchases" subtitle="Purchase orders and stock intake" actions={<Button onClick={openModal}>+ New Purchase Order</Button>} />

      <Card>
        {isLoading ? (
          <LoadingRow />
        ) : !purchases || purchases.length === 0 ? (
          <EmptyState message="No purchase orders yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Supplier</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((po) => (
                  <tr key={po.id}>
                    <td className="py-2.5 font-medium text-slate-700">{po.reference}</td>
                    <td className="py-2.5 text-slate-500">{po.supplier?.name}</td>
                    <td className="py-2.5 text-slate-500">{formatDate(po.orderDate)}</td>
                    <td className="py-2.5">
                      <Badge tone={statusTone[po.status]}>{po.status}</Badge>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-800">{formatMoney(po.totalAmount)}</td>
                    <td className="py-2.5 text-right">
                      {po.status === "PENDING" && (
                        <div className="flex justify-end gap-2">
                          <button
                            className="text-xs font-medium text-emerald-600 hover:underline"
                            onClick={() => receiveMutation.mutate(po.id)}
                          >
                            Receive
                          </button>
                          <button
                            className="text-xs font-medium text-red-500 hover:underline"
                            onClick={() => {
                              if (confirm("Cancel this purchase order?")) cancelMutation.mutate(po.id);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title="New Purchase Order" width="max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label>Supplier</Label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select a supplier</option>
              {(suppliers || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-5">
                  <Select
                    value={item.productId}
                    onChange={(e) => updateItem(i, { productId: e.target.value, unitCost: productDefaultCost(e.target.value) })}
                  >
                    <option value="">Select product</option>
                    {(products || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatQty(p.stockQty, p.unit)} in stock)
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit cost"
                    value={item.unitCost}
                    onChange={(e) => updateItem(i, { unitCost: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  />
                </div>
                <button
                  className="col-span-1 text-slate-300 hover:text-red-500"
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="text-xs font-medium text-brand-600 hover:underline"
              onClick={() => setItems((prev) => [...prev, { productId: "", quantity: 1, unitCost: 0 }])}
            >
              + Add line item
            </button>
          </div>

          <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              disabled={!supplierId || items.every((i) => !i.productId) || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
