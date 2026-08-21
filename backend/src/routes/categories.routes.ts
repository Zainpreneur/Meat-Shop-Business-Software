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
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    res.json(categories);
  })
);

const schema = z.object({ name: z.string().min(1) });

router.post(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  })
);

router.put(
  "/:id",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  })
);

router.delete(
  "/:id",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
