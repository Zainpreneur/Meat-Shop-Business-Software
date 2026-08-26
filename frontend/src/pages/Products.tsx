import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { categoriesApi, productsApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Badge, Button, Card, EmptyState, Input, Label, LoadingRow, Modal, PageHeader, Select } from "../components/ui";
import { formatMoney, formatQty } from "../utils/format";
import type { Product, Unit } from "../types";

const UNITS: Unit[] = ["KG", "GRAM", "PIECE", "DOZEN"];

const emptyForm = {
  name: "",
  sku: "",
  categoryId: "",
  unit: "KG" as Unit,
  costPrice: "",
  sellingPrice: "",
  stockQty: "",
  reorderLevel: "5",
};

export function Products() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, categoryFilter, lowStockOnly],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        lowStock: lowStockOnly || undefined,
      }),
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        sku: form.sku,
        categoryId: form.categoryId || null,
        unit: form.unit,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        stockQty: Number(form.stockQty) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
      };
      if (editing) return productsApi.update(editing.id, payload);
      return productsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product created");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeModal();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast.success("Product deactivated");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId || "",
      unit: product.unit,
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      stockQty: String(product.stockQty),
      reorderLevel: String(product.reorderLevel),
    });
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

  const categoryOptions = useMemo(() => categories || [], [categories]);

  return (
    <>
      <PageHeader
        title="Products & Inventory"
        subtitle="Manage your cuts, prices, and stock levels"
        actions={canManage && <Button onClick={openCreate}>+ Add Product</Button>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Label>Search</Label>
            <Input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="min-w-[180px]">
            <Label>Category</Label>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only
          </label>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <LoadingRow />
        ) : !products || products.length === 0 ? (
          <EmptyState message="No products found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Cost</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Stock</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const low = p.stockQty <= p.reorderLevel;
                  return (
                    <tr key={p.id}>
                      <td className="py-2.5">
                        <div className="font-medium text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-2.5 text-slate-500">{p.category?.name || "—"}</td>
                      <td className="py-2.5 text-right text-slate-500">{formatMoney(p.costPrice)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-700">{formatMoney(p.sellingPrice)}</td>
                      <td className="py-2.5 text-right">
                        <Badge tone={low ? (p.stockQty <= 0 ? "danger" : "warning") : "success"}>
                          {formatQty(p.stockQty, p.unit)}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        {canManage && (
                          <div className="flex justify-end gap-2">
                            <button className="text-xs font-medium text-brand-600 hover:underline" onClick={() => openEdit(p)}>
                              Edit
                            </button>
                            <button
                              className="text-xs font-medium text-red-500 hover:underline"
                              onClick={() => {
                                if (confirm(`Deactivate ${p.name}?`)) deactivateMutation.mutate(p.id);
                              }}
                            >
                              Deactivate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Product" : "Add Product"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">No category</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Cost Price</Label>
              <Input type="number" step="0.01" min="0" required value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </div>
            <div>
              <Label>Selling Price</Label>
              <Input type="number" step="0.01" min="0" required value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input type="number" step="0.01" min="0" required value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
            </div>
            <div>
              <Label>Reorder Level</Label>
              <Input type="number" step="0.01" min="0" required value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
