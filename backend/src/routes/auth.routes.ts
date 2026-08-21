import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Role } from "../constants/enums";
import { signToken } from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { requireAuth } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new AppError("Invalid email or password", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role as Role, name: user.name });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new AppError("User not found", 404);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  })
);

export default router;
