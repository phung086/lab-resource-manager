import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signUserToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, authVersion: user.authVersion || 0 }, config.jwtSecret, {
    algorithm: "HS256", expiresIn: config.tokenExpiresIn,
  });
}
