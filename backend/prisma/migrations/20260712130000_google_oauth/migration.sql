-- Google OAuth: optional password, google profile fields
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'local';
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
