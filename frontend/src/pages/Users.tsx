import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { usersApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, Button, Card, EmptyState, Input, Label, LoadingRow, Modal, PageHeader, Select } from "../components/ui";
import { formatDate } from "../utils/format";
import type { Role } from "../types";

const ROLES: Role[] = ["ADMIN", "MANAGER", "CASHIER"];

const emptyForm = { name: "", email: "", password: "", role: "CASHIER" as Role };

export function Users() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: usersApi.list });

  const createMutation = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => usersApi.update(id, { active }),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <>
      <PageHeader title="Users & Staff" subtitle="Manage who can access the system" actions={<Button onClick={() => setModalOpen(true)}>+ Add User</Button>} />

      <Card>
        {isLoading ? (
          <LoadingRow />
        ) : !users || users.length === 0 ? (
          <EmptyState message="No users yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Joined</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 font-medium text-slate-800">{u.name}</td>
                    <td className="py-2.5 text-slate-500">{u.email}</td>
                    <td className="py-2.5">
                      <Badge tone="info">{u.role}</Badge>
                    </td>
                    <td className="py-2.5 text-slate-500">{u.createdAt ? formatDate(u.createdAt) : "—"}</td>
                    <td className="py-2.5">
                      <Badge tone={u.active ? "success" : "default"}>{u.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      {u.id !== me?.id && (
                        <button
                          className="text-xs font-medium text-brand-600 hover:underline"
                          onClick={() => toggleActiveMutation.mutate({ id: u.id, active: !u.active })}
                        >
                          {u.active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
