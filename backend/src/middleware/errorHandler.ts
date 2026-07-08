import { Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: Function
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request", details: err.issues });
  }

  if (
    err instanceof SyntaxError &&
    "status" in err &&
    typeof err.status === "number" &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
};
