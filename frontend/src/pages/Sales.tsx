import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { salesApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, Button, Card, EmptyState, LoadingRow, Modal, PageHeader } from "../components/ui";
import { formatDateTime, formatMoney, formatQty } from "../utils/format";
import type { Sale, SaleStatus } from "../types";

const statusTone: Record<SaleStatus, "success" | "danger" | "default"> = {
  COMPLETED: "success",
  REFUNDED: "danger",
  CANCELLED: "default",
};

export function Sales() {
  const { user } = useAuth();
  const canRefund = user?.role === "ADMIN" || user?.role === "MANAGER";
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Sale | null>(null);

  const { data: sales, isLoading } = useQuery({ queryKey: ["sales"], queryFn: () => salesApi.list() });

  const refundMutation = useMutation({
    mutationFn: (id: string) => salesApi.refund(id),
    onSuccess: () => {
      toast.success("Sale refunded and stock restored");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelected(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <>
      <PageHeader title="Sales History" subtitle="All completed, refunded, and cancelled sales" />

      <Card>
        {isLoading ? (
          <LoadingRow />
        ) : !sales || sales.length === 0 ? (
          <EmptyState message="No sales recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Cashier</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Payment</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr key={s.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(s)}>
                    <td className="py-2.5 font-medium text-brand-700">{s.reference}</td>
                    <td className="py-2.5 text-slate-500">{s.customer?.name || "Walk-in"}</td>
                    <td className="py-2.5 text-slate-500">{s.user?.name}</td>
                    <td className="py-2.5 text-slate-500">{formatDateTime(s.saleDate)}</td>
                    <td className="py-2.5 text-slate-500">{s.paymentMethod.replace("_", " ")}</td>
                    <td className="py-2.5">
                      <Badge tone={statusTone[s.status]}>{s.status}</Badge>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-800">{formatMoney(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Invoice ${selected.reference}` : ""}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-500">
              <div>
                <span className="text-slate-400">Customer:</span> {selected.customer?.name || "Walk-in"}
              </div>
              <div>
                <span className="text-slate-400">Cashier:</span> {selected.user?.name}
              </div>
              <div>
                <span className="text-slate-400">Date:</span> {formatDateTime(selected.saleDate)}
              </div>
              <div>
                <span className="text-slate-400">Payment:</span> {selected.paymentMethod.replace("_", " ")}
              </div>
            </div>

            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {selected.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-700">{item.product?.name}</div>
                    <div className="text-xs text-slate-400">
                      {formatQty(item.quantity, item.product?.unit || "")} × {formatMoney(item.unitPrice)}
                    </div>
                  </div>
                  <div className="font-medium text-slate-700">{formatMoney(item.subtotal)}</div>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatMoney(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>-{formatMoney(selected.discount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>
                <span>+{formatMoney(selected.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatMoney(selected.total)}</span>
              </div>
            </div>

            {canRefund && selected.status === "COMPLETED" && (
              <Button
                variant="danger"
                className="w-full"
                disabled={refundMutation.isPending}
                onClick={() => {
                  if (confirm("Refund this sale? Stock will be restored.")) refundMutation.mutate(selected.id);
                }}
              >
                {refundMutation.isPending ? "Refunding..." : "Refund Sale"}
              </Button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
