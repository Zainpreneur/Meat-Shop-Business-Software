import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role, roleValues } from "../constants/enums";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

const userSelect = { id: true, name: true, email: true, role: true, active: true, createdAt: true };

router.get(
  "/",
  requireRole(Role.ADMIN, Role.MANAGER),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: "desc" } });
    res.json(users);
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(roleValues).default(Role.CASHIER),
});

router.post(
  "/",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash, role: data.role },
      select: userSelect,
    });
    res.status(201).json(user);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(roleValues).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.put(
  "/:id",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.password;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: userSelect,
    });
    res.json(user);
  })
);

router.delete(
  "/:id",
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.sub) {
      throw new AppError("You cannot deactivate your own account", 400);
    }
    await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).send();
  })
);

export default router;
