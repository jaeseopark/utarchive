import { RequestHandler, Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

export const validateRequest = (
  schema: ZodTypeAny,
  source: "body" | "query" | "params" = "body"
): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(result.error);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req[source] = result.data as any;
    return next();
  };
};
