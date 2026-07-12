UPDATE "Trip" SET "dispatchedAt" = "updatedAt" WHERE status = 'DISPATCHED' AND "dispatchedAt" IS NULL;
