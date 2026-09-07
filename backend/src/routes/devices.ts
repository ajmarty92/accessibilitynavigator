import { Router } from "express";
import { prisma } from "../db/client";

export const devicesRouter = Router();

// POST /devices — register (or refresh) a device's FCM token.
devicesRouter.post("/devices", async (req, res) => {
  const { fcmToken, platform } = req.body ?? {};
  if (typeof fcmToken !== "string" || !fcmToken.trim() || typeof platform !== "string") {
    res.status(400).json({ error: "fcmToken (string) and platform (string) are required" });
    return;
  }

  await prisma.device.upsert({
    where: { fcmToken },
    update: { platform },
    create: { fcmToken, platform },
  });

  res.status(204).end();
});

// DELETE /devices/:fcmToken — unregister a device.
devicesRouter.delete("/devices/:fcmToken", async (req, res) => {
  await prisma.device.deleteMany({ where: { fcmToken: req.params.fcmToken } });
  res.status(204).end();
});
