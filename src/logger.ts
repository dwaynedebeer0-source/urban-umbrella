import pino from "pino";

const isTTY = process.stdout.isTTY;

const transport = isTTY
  ? {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard" },
    }
  : undefined;

export const logger = pino(
  {
    level: process.env["LOG_LEVEL"] ?? "info",
  },
  transport ? pino.transport(transport) : undefined
);
