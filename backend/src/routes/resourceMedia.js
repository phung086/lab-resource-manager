import express from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertLabStaffResourceAccess } from "../middleware/labScope.js";
import { HttpError } from "../middleware/errors.js";
import { ADMIN, LAB_STAFF } from "../constants/roles.js";
import { addExternalResourceMedia, deleteResourceMedia, finishResourceMediaUpload, requestResourceMediaUpload } from "../services/resourceMediaService.js";

const router = express.Router();
const details = { kind: z.enum(["IMAGE", "VIDEO"]), title: z.string().trim().min(2).max(160), altText: z.string().trim().min(3).max(300), credit: z.string().trim().max(200).optional(), license: z.string().trim().max(100).optional(), sortOrder: z.number().int().min(0).max(1000).default(0) };
const route = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
async function assertMediaAccess(req) {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.resourceId }, select: { id: true } });
  if (!resource) throw new HttpError(404, "Không tìm thấy tài nguyên.", undefined, "NOT_FOUND");
  if (req.user.role === LAB_STAFF) await assertLabStaffResourceAccess(req.user.id, resource.id);
}

router.get("/:resourceId/media", route(async (req, res) => {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.resourceId }, select: { id: true } });
  if (!resource) throw new HttpError(404, "Không tìm thấy tài nguyên.", undefined, "NOT_FOUND");
  res.json(await prisma.resourceMedia.findMany({ where: { resourceId: resource.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }));
}));
const canManageMedia = [requireAuth, requireRole(ADMIN, LAB_STAFF)];

router.post("/:resourceId/media/upload", ...canManageMedia, route(async (req, res) => {
  await assertMediaAccess(req);
  const data = z.object({ contentType: z.string(), size: z.number().int().positive() }).strict().parse(req.body);
  res.json(await requestResourceMediaUpload(req.params.resourceId, data));
}));
router.post("/:resourceId/media/complete", ...canManageMedia, route(async (req, res) => {
  await assertMediaAccess(req);
  const data = z.object({ key: z.string().min(1).max(300), ...details }).strict().parse(req.body);
  res.status(201).json(await finishResourceMediaUpload(req.params.resourceId, data));
}));
router.post("/:resourceId/media/external", ...canManageMedia, route(async (req, res) => {
  await assertMediaAccess(req);
  const data = z.object({ url: z.string().url().max(2000), sourceUrl: z.string().url().max(2000), ...details, credit: z.string().trim().min(2).max(200), license: z.string().trim().min(2).max(100) }).strict().parse(req.body);
  res.status(201).json(await addExternalResourceMedia(req.params.resourceId, data));
}));
router.delete("/:resourceId/media/:mediaId", ...canManageMedia, route(async (req, res) => {
  await assertMediaAccess(req);
  await deleteResourceMedia(req.params.resourceId, req.params.mediaId);
  res.sendStatus(204);
}));
export default router;
