import { Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request", details: err.issues });
  }

  if (
    err instanceof SyntaxError &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (err as any).status === "number" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
};
