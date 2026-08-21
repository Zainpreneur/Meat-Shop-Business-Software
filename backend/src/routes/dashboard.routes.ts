import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const trendStart = startOfDay(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000)); // 14-day window
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todaySales, monthSales, trendSales, monthExpenses, products, recentSales] = await Promise.all([
      prisma.sale.findMany({ where: { saleDate: { gte: todayStart }, status: "COMPLETED" } }),
      prisma.sale.findMany({ where: { saleDate: { gte: monthStart }, status: "COMPLETED" } }),
      prisma.sale.findMany({
        where: { saleDate: { gte: trendStart }, status: "COMPLETED" },
        include: { items: true },
      }),
      prisma.expense.findMany({ where: { expenseDate: { gte: monthStart } } }),
      prisma.product.findMany({ where: { active: true } }),
      prisma.sale.findMany({
        take: 8,
        orderBy: { saleDate: "desc" },
        include: { customer: true, items: true },
      }),
    ]);

    const todayRevenue = todaySales.reduce((s, sale) => s + sale.total, 0);
    const monthRevenue = monthSales.reduce((s, sale) => s + sale.total, 0);
    const monthExpenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

    // Revenue trend, bucketed by day, last 14 days.
    const trendMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(trendStart.getTime() + i * 24 * 60 * 60 * 1000);
      trendMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const sale of trendSales) {
      const key = startOfDay(sale.saleDate).toISOString().slice(0, 10);
      trendMap.set(key, (trendMap.get(key) || 0) + sale.total);
    }
    const revenueTrend = Array.from(trendMap.entries()).map(([date, revenue]) => ({ date, revenue }));

    // Top selling products (by revenue) over the trend window.
    const productTotals = new Map<string, { productId: string; quantity: number; revenue: number }>();
    for (const sale of trendSales) {
      for (const item of sale.items) {
        const existing = productTotals.get(item.productId) || { productId: item.productId, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.subtotal;
        productTotals.set(item.productId, existing);
      }
    }
    const productIds = Array.from(productTotals.keys());
    const productDetails = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productNameMap = new Map(productDetails.map((p) => [p.id, p]));
    const topProducts = Array.from(productTotals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((t) => ({
        ...t,
        name: productNameMap.get(t.productId)?.name || "Unknown",
        unit: productNameMap.get(t.productId)?.unit || "KG",
      }));

    const lowStockProducts = products
      .filter((p) => p.stockQty <= p.reorderLevel)
      .sort((a, b) => a.stockQty - b.stockQty)
      .slice(0, 10);

    res.json({
      todayRevenue,
      todayOrders: todaySales.length,
      monthRevenue,
      monthOrders: monthSales.length,
      monthExpenseTotal,
      monthProfit: monthRevenue - monthExpenseTotal,
      totalProducts: products.length,
      lowStockCount: products.filter((p) => p.stockQty <= p.reorderLevel).length,
      revenueTrend,
      topProducts,
      lowStockProducts,
      recentSales,
    });
  })
);

export default router;
