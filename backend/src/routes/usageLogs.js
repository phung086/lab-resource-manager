import express from "express";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeUsageLog } from "../utils/dataContract.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { resourceId, bookingId } = req.query;
    const logs = await prisma.usageLog.findMany({
      where: {
        ...(resourceId ? { resourceId: String(resourceId) } : {}),
        ...(bookingId ? { bookingId: String(bookingId) } : {})
      },
      include: {
        resource: true,
        booking: true,
        user: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.json(logs.map((log) => serializeUsageLog(log)));
  } catch (error) {
    next(error);
  }
});

export default router;
