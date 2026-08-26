import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { suppliersApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { Button, Card, EmptyState, Input, Label, LoadingRow, Modal, PageHeader } from "../components/ui";
import type { Supplier } from "../types";

const emptyForm = { name: "", phone: "", email: "", address: "", notes: "" };

export function Suppliers() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: suppliers, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: () => suppliersApi.list() });

  const saveMutation = useMutation({
    mutationFn: () => (editing ? suppliersApi.update(editing.id, form) : suppliersApi.create(form)),
    onSuccess: () => {
      toast.success(editing ? "Supplier updated" : "Supplier created");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      closeModal();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      toast.success("Supplier removed");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Cannot delete a supplier with purchase history")),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "" });
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
      <PageHeader title="Suppliers" subtitle="Vendors you buy meat and supplies from" actions={<Button onClick={openCreate}>+ Add Supplier</Button>} />

      <Card>
        {isLoading ? (
          <LoadingRow />
        ) : !suppliers || suppliers.length === 0 ? (
          <EmptyState message="No suppliers yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Purchases</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 font-medium text-slate-800">{s.name}</td>
                    <td className="py-2.5 text-slate-500">{s.phone || "—"}</td>
                    <td className="py-2.5 text-slate-500">{s.email || "—"}</td>
                    <td className="py-2.5 text-slate-500">{s._count?.purchases ?? 0}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-xs font-medium text-brand-600 hover:underline" onClick={() => openEdit(s)}>
                          Edit
                        </button>
                        <button
                          className="text-xs font-medium text-red-500 hover:underline"
                          onClick={() => {
                            if (confirm(`Delete ${s.name}?`)) deleteMutation.mutate(s.id);
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Supplier" : "Add Supplier"}>
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
              {saveMutation.isPending ? "Saving..." : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
