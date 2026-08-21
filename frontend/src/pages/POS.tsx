import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { customersApi, productsApi, salesApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import { Badge, Button, Card, Input, Label, Select } from "../components/ui";
import { formatMoney, formatQty } from "../utils/format";
import type { PaymentMethod, Product } from "../types";

interface CartLine {
  product: Product;
  quantity: number;
}

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "MOBILE_MONEY", "CREDIT", "BANK_TRANSFER"];

export function POS() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [lastReceipt, setLastReceipt] = useState<Awaited<ReturnType<typeof salesApi.create>> | null>(null);

  const { data: products } = useQuery({
    queryKey: ["products", "pos", search],
    queryFn: () => productsApi.list({ search: search || undefined, active: true }),
  });

  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => customersApi.list() });

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.quantity * line.product.sellingPrice, 0), [cart]);
  const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(tax) || 0));

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stockQty) {
          toast.error(`Only ${formatQty(product.stockQty, product.unit)} left in stock`);
          return prev;
        }
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (product.stockQty <= 0) {
        toast.error("Out of stock");
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, quantity: Math.max(0, quantity) } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const checkoutMutation = useMutation({
    mutationFn: () =>
      salesApi.create({
        customerId: customerId || null,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        paymentMethod,
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity, unitPrice: l.product.sellingPrice })),
      }),
    onSuccess: (sale) => {
      toast.success(`Sale ${sale.reference} completed!`);
      setLastReceipt(sale);
      setCart([]);
      setDiscount("0");
      setTax("0");
      setCustomerId("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Checkout failed")),
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4">
          <Input
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {(products || []).map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stockQty <= 0}
              className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-400 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="text-2xl">🥩</div>
              <div className="mt-1.5 text-sm font-semibold text-slate-800">{p.name}</div>
              <div className="text-xs text-slate-400">{p.sku}</div>
              <div className="mt-2 flex w-full items-center justify-between">
                <span className="text-sm font-bold text-brand-600">{formatMoney(p.sellingPrice)}</span>
                <Badge tone={p.stockQty <= p.reorderLevel ? "warning" : "default"}>{formatQty(p.stockQty, p.unit)}</Badge>
              </div>
            </button>
          ))}
          {products && products.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-slate-400">No products match your search.</div>
          )}
        </div>
      </div>

      <div>
        <Card className="sticky top-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Current Sale</h3>

          {cart.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Tap a product to add it to the cart.</div>
          ) : (
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {cart.map((line) => (
                <div key={line.product.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-700">{line.product.name}</div>
                    <div className="text-xs text-slate-400">{formatMoney(line.product.sellingPrice)} / {line.product.unit}</div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={line.quantity}
                    onChange={(e) => updateQty(line.product.id, Number(e.target.value))}
                    className="w-16 rounded border border-slate-300 px-1.5 py-1 text-right text-sm"
                  />
                  <div className="w-16 text-right font-medium text-slate-700">
                    {formatMoney(line.quantity * line.product.sellingPrice)}
                  </div>
                  <button onClick={() => removeLine(line.product.id)} className="text-slate-300 hover:text-red-500">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Discount</Label>
                <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div>
                <Label>Tax</Label>
                <Input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Discount</span>
              <span>-{formatMoney(Number(discount) || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax</span>
              <span>+{formatMoney(Number(tax) || 0)}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>

          <Button
            className="mt-4 w-full"
            disabled={cart.length === 0 || checkoutMutation.isPending}
            onClick={() => checkoutMutation.mutate()}
          >
            {checkoutMutation.isPending ? "Processing..." : `Charge ${formatMoney(total)}`}
          </Button>
        </Card>

        {lastReceipt && (
          <Card className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Last Receipt</h3>
              <Badge tone="success">{lastReceipt.reference}</Badge>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-500">
              {lastReceipt.items.map((i) => (
                <div key={i.id} className="flex justify-between">
                  <span>
                    {i.quantity} × {i.product?.name}
                  </span>
                  <span>{formatMoney(i.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-slate-800">
              <span>Total</span>
              <span>{formatMoney(lastReceipt.total)}</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
