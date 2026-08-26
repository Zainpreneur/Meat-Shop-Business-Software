import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { customersApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { Badge, Button, Card, EmptyState, Input, Label, LoadingRow, Modal, PageHeader } from "../components/ui";
import { formatMoney } from "../utils/format";
import type { Customer } from "../types";

const emptyForm = { name: "", phone: "", email: "", address: "" };

export function Customers() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: customers, isLoading } = useQuery({ queryKey: ["customers"], queryFn: () => customersApi.list() });

  const saveMutation = useMutation({
    mutationFn: () => (editing ? customersApi.update(editing.id, form) : customersApi.create(form)),
    onSuccess: () => {
      toast.success(editing ? "Customer updated" : "Customer added");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      closeModal();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => {
      toast.success("Customer removed");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Cannot delete a customer with sales history")),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  return (
    <>
      <PageHeader title="Customers" subtitle="Regulars, credit accounts, and contact info" actions={<Button onClick={openCreate}>+ Add Customer</Button>} />

      <Card>
        {isLoading ? (
          <LoadingRow />
        ) : !customers || customers.length === 0 ? (
          <EmptyState message="No customers yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Orders</th>
                  <th className="pb-2">Credit Balance</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 font-medium text-slate-800">{c.name}</td>
                    <td className="py-2.5 text-slate-500">{c.phone || "—"}</td>
                    <td className="py-2.5 text-slate-500">{c._count?.sales ?? 0}</td>
                    <td className="py-2.5">
                      {c.creditBalance > 0 ? <Badge tone="warning">{formatMoney(c.creditBalance)}</Badge> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-xs font-medium text-brand-600 hover:underline" onClick={() => openEdit(c)}>
                          Edit
                        </button>
                        <button
                          className="text-xs font-medium text-red-500 hover:underline"
                          onClick={() => {
                            if (confirm(`Delete ${c.name}?`)) deleteMutation.mutate(c.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Customer" : "Add Customer"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
