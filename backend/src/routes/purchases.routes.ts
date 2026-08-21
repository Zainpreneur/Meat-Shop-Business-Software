import { Router } from "express";
import { z } from "zod";
import { Role } from "../constants/enums";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, supplierId } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const purchases = await prisma.purchase.findMany({
      where,
      include: { supplier: true, user: { select: { id: true, name: true } }, items: true },
      orderBy: { orderDate: "desc" },
    });
    res.json(purchases);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const purchase = await prisma.purchase.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
    res.json(purchase);
  })
);

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

const createSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
});

function generateReference(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

// Create a pending purchase order (does not affect stock yet).
router.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const items = data.items.map((i) => ({ ...i, subtotal: i.quantity * i.unitCost }));
    const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0);

    const purchase = await prisma.purchase.create({
      data: {
        reference: generateReference("PO"),
        supplierId: data.supplierId,
        userId: req.user!.sub,
        notes: data.notes,
        totalAmount,
        items: { create: items },
      },
      include: { items: { include: { product: true } }, supplier: true },
    });

    res.status(201).json(purchase);
  })
);

// Mark a purchase order as received: increments product stock and logs
// stock movements. This is the only path that should affect stock for a PO.
router.post(
  "/:id/receive",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const purchase = await prisma.purchase.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (purchase.status === "RECEIVED") {
      throw new AppError("This purchase order has already been received", 400);
    }
    if (purchase.status === "CANCELLED") {
      throw new AppError("Cannot receive a cancelled purchase order", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity }, costPrice: item.unitCost },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "PURCHASE_IN",
            quantity: item.quantity,
            reason: `Received PO ${purchase.reference}`,
            refId: purchase.id,
          },
        });
      }

      return tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "RECEIVED", receivedAt: new Date() },
        include: { items: { include: { product: true } }, supplier: true },
      });
    });

    res.json(updated);
  })
);

router.post(
  "/:id/cancel",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const purchase = await prisma.purchase.findUniqueOrThrow({ where: { id: req.params.id } });
    if (purchase.status === "RECEIVED") {
      throw new AppError("Cannot cancel a purchase order that has already been received", 400);
    }
    const updated = await prisma.purchase.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });
    res.json(updated);
  })
);

export default router;
