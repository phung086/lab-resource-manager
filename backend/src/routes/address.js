import express from "express";
import { listVietnamProvinces, listVietnamWards } from "../services/addressService.js";

const router = express.Router();
const route = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };

router.get("/vietnam/provinces", route(async (_req, res) => {
  res.json(await listVietnamProvinces());
}));

router.get("/vietnam/wards", route(async (req, res) => {
  res.json(await listVietnamWards(req.query.provinceCode));
}));

export default router;
