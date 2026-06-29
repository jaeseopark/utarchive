import { db } from "../../db";
import { lt, eq } from "drizzle-orm";
import { listeningAnalytics } from "../../db/schema";

export type ListeningAnalyticsInsert = {
  songId: string;
  userId: string;
  startedAt: string;
  durationSeconds: number;
  playbackPercent: number;
  userAgent?: string | null;
};

export const insertListeningAnalytics = async (
  record: ListeningAnalyticsInsert
) => {
  return await db.transaction(async (tx) => {
    await tx.insert(listeningAnalytics).values({
      songId: record.songId,
      userId: record.userId,
      startedAt: new Date(record.startedAt),
      durationSeconds: record.durationSeconds,
      playbackPercent: record.playbackPercent,
      userAgent: record.userAgent ?? null,
    });

  });
};

export const deleteAllListeningAnalytics = async () =>
  await db.delete(listeningAnalytics);

export const pruneListeningAnalyticsOlderThanDays = async (days: number) =>
  await db
    .delete(listeningAnalytics)
    .where(
      lt(
        listeningAnalytics.startedAt,
        new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      )
    );

export const countListeningAnalytics = async () => {
  const rows = await db
    .select({ count: sql`count(*)` })
    .from(listeningAnalytics)
    .limit(1);

  return Number(rows[0]?.count ?? 0);
};
