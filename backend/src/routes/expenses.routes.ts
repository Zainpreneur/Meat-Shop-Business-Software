import { Router } from "express";
import { z } from "zod";
import { Role } from "../constants/enums";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to, category } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (from || to) {
      where.expenseDate = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    const expenses = await prisma.expense.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { expenseDate: "desc" },
    });
    res.json(expenses);
  })
);

const schema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  expenseDate: z.string().optional(),
});

router.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const expense = await prisma.expense.create({
      data: {
        category: data.category,
        description: data.description,
        amount: data.amount,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        userId: req.user!.sub,
      },
    });
    res.status(201).json(expense);
  })
);

router.put(
  "/:id",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        ...data,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
      },
    });
    res.json(expense);
  })
);

router.delete(
  "/:id",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
