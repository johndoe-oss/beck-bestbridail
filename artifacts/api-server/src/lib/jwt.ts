import jwt from "jsonwebtoken";

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error("SESSION_SECRET environment variable is required but not set.");
}
const SESSION_SECRET: string = secret;

export interface CustomerPayload {
  sub: number;
  type: "customer";
  email: string;
}

export interface AdminPayload {
  sub: number;
  type: "admin";
  email: string;
}

export type JwtPayload = CustomerPayload | AdminPayload;

export function signCustomerToken(customerId: number, email: string): string {
  return jwt.sign({ sub: customerId, type: "customer", email }, SESSION_SECRET, {
    expiresIn: "30d",
  });
}

export function signAdminToken(adminId: number, email: string): string {
  return jwt.sign({ sub: adminId, type: "admin", email }, SESSION_SECRET, {
    expiresIn: "24h",
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as unknown as JwtPayload;
  } catch {
    return null;
  }
}
