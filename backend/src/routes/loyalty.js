import express from "express";
import { prisma } from "../db.js";
import { ADMIN } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getLoyaltyPolicy, getUserLoyalty, updateLoyaltyPolicy } from "../services/loyaltyService.js";

const router = express.Router();
router.use(requireAuth);
router.get("/me", async (req, res, next) => {
  try {
    res.json(await prisma.$transaction(tx => getUserLoyalty(tx, req.user.id), { isolationLevel: "RepeatableRead" }));
  } catch (error) { next(error); }
});
router.get("/policy", async (_req, res, next) => {
  try { res.json(await getLoyaltyPolicy(prisma)); } catch (error) { next(error); }
});
router.put("/policy", requireRole(ADMIN), async (req, res, next) => {
  try { res.json(await updateLoyaltyPolicy(prisma, req.user, req.body)); } catch (error) { next(error); }
});
export default router;
