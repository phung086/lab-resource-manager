import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { config } from "../config.js";
import { completeGuestBooking, sendGuestBookingOtp } from "../services/guestBookingService.js";

const router = express.Router();
const route = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isProduction ? 8 : 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many guest booking attempts" } }
});

const otpSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().max(255).optional()
}).strict();

const addressSchema = z.object({
  addressLine: z.string().trim().min(5).max(300),
  provinceCode: z.string().trim().min(1).max(20),
  wardCode: z.string().trim().min(1).max(20)
}).strict();

const bookingSchema = z.object({
  resourceId: z.string().min(1),
  title: z.string().min(2).max(255),
  purpose: z.string().max(2000).optional().default(""),
  purposeCode: z.enum(["STUDY", "TEACHING", "RESEARCH", "SERVICE"]).optional(),
  acceptedQuote: z.object({ amountVnd: z.number().int().min(0), version: z.number().int().min(0) }).strict().optional(),
  startAt: z.string(),
  endAt: z.string()
}).strict();

const completeSchema = z.object({
  email: z.string().trim().email().max(255),
  otpCode: z.string().trim().regex(/^\d{6}$/),
  fullName: z.string().trim().min(2).max(255),
  phone: z.string().trim().min(9).max(20),
  organization: z.string().trim().max(255).optional(),
  address: addressSchema,
  booking: bookingSchema
}).strict();

router.post("/otp", limiter, route(async (req, res) => {
  const data = otpSchema.parse(req.body);
  res.status(202).json(await sendGuestBookingOtp(data));
}));

router.post("/book", limiter, route(async (req, res) => {
  const data = completeSchema.parse(req.body);
  res.status(201).json(await completeGuestBooking(data));
}));

export default router;
