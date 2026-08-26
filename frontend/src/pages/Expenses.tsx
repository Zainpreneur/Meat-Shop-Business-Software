import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { expensesApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { Button, Card, EmptyState, Input, Label, LoadingRow, Modal, PageHeader } from "../components/ui";
import { formatDate, formatMoney } from "../utils/format";

const EXPENSE_CATEGORIES = ["Rent", "Utilities", "Wages", "Equipment", "Transport", "Packaging", "Maintenance", "Other"];

const emptyForm = { category: EXPENSE_CATEGORIES[0], description: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10) };

export function Expenses() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: expenses, isLoading } = useQuery({ queryKey: ["expenses"], queryFn: () => expensesApi.list() });

  const createMutation = useMutation({
    mutationFn: () => expensesApi.create({ ...form, amount: Number(form.amount) || 0 }),
    onSuccess: () => {
      toast.success("Expense recorded");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const total = (expenses || []).reduce((sum, e) => sum + e.amount, 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={`Total recorded: ${formatMoney(total)}`}
        actions={<Button onClick={() => setModalOpen(true)}>+ Add Expense</Button>}
      />

      <Card>
        {isLoading ? (
          <LoadingRow />
        ) : !expenses || expenses.length === 0 ? (
          <EmptyState message="No expenses recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Recorded By</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2.5 text-slate-500">{formatDate(e.expenseDate)}</td>
                    <td className="py-2.5 text-slate-700">{e.category}</td>
                    <td className="py-2.5 text-slate-500">{e.description}</td>
                    <td className="py-2.5 text-slate-500">{e.user?.name}</td>
                    <td className="py-2.5 text-right font-medium text-slate-800">{formatMoney(e.amount)}</td>
                    <td className="py-2.5 text-right">
                      <button
                        className="text-xs font-medium text-red-500 hover:underline"
                        onClick={() => {
                          if (confirm("Delete this expense?")) deleteMutation.mutate(e.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Category</Label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Description</Label>
            <Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" required value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
