import { Router } from "express";
import { z } from "zod";
import { Role, Unit, unitValues } from "../constants/enums";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, categoryId, lowStock, active } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (active !== undefined) where.active = active === "true";

    let products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    });

    if (lowStock === "true") {
      products = products.filter((p) => p.stockQty <= p.reorderLevel);
    }

    res.json(products);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { category: true },
    });
    res.json(product);
  })
);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  unit: z.enum(unitValues).default(Unit.KG),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  stockQty: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(5),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

router.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data, include: { category: true } });
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json(product);
  })
);

const adjustSchema = z.object({
  quantity: z.number(),
  reason: z.string().min(1),
});

// Manual stock adjustment (e.g. wastage, spoilage, stocktake correction).
router.post(
  "/:id/adjust-stock",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const { quantity, reason } = adjustSchema.parse(req.body);

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: req.params.id },
        data: { stockQty: { increment: quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: req.params.id,
          type: quantity < 0 ? "WASTAGE" : "ADJUSTMENT",
          quantity,
          reason,
        },
      });
      return updated;
    });

    res.json(product);
  })
);

router.delete(
  "/:id",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).send();
  })
);

export default router;
