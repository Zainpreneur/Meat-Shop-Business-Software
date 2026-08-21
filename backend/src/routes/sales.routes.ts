import { Router } from "express";
import { z } from "zod";
import { PaymentMethod, Role, paymentMethodValues } from "../constants/enums";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to, customerId, status } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (from || to) {
      where.saleDate = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { saleDate: "desc" },
    });
    res.json(sales);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
    res.json(sale);
  })
);

function generateReference(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const createSaleSchema = z.object({
  customerId: z.string().nullable().optional(),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  paymentMethod: z.enum(paymentMethodValues).default(PaymentMethod.CASH),
  notes: z.string().nullable().optional(),
  items: z.array(saleItemSchema).min(1),
});

// Create + complete a sale in one step (typical POS checkout): validates
// stock, decrements it, and writes stock movement history — all atomically.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSaleSchema.parse(req.body);

    const sale = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      for (const item of data.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new AppError(`Product ${item.productId} not found`, 404);
        }
        if (product.stockQty < item.quantity) {
          throw new AppError(
            `Insufficient stock for ${product.name}: available ${product.stockQty}${product.unit}, requested ${item.quantity}${product.unit}`,
            400
          );
        }
        subtotal += item.quantity * item.unitPrice;
      }

      const total = Math.max(0, subtotal - data.discount + data.tax);

      const created = await tx.sale.create({
        data: {
          reference: generateReference("INV"),
          customerId: data.customerId || null,
          userId: req.user!.sub,
          subtotal,
          discount: data.discount,
          tax: data.tax,
          total,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.quantity * i.unitPrice,
            })),
          },
        },
        include: { items: { include: { product: true } }, customer: true, user: { select: { id: true, name: true } } },
      });

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "SALE_OUT",
            quantity: -item.quantity,
            reason: `Sold on ${created.reference}`,
            refId: created.id,
          },
        });
      }

      if (data.paymentMethod === PaymentMethod.CREDIT && data.customerId) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { creditBalance: { increment: total } },
        });
      }

      return created;
    });

    res.status(201).json(sale);
  })
);

// Refund a completed sale: restocks items and reverses any credit balance.
router.post(
  "/:id/refund",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (sale.status !== "COMPLETED") {
      throw new AppError("Only completed sales can be refunded", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "RETURN_IN",
            quantity: item.quantity,
            reason: `Refund of ${sale.reference}`,
            refId: sale.id,
          },
        });
      }

      if (sale.paymentMethod === "CREDIT" && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { creditBalance: { decrement: sale.total } },
        });
      }

      return tx.sale.update({ where: { id: sale.id }, data: { status: "REFUNDED" } });
    });

    res.json(updated);
  })
);

export default router;
