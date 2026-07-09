-- AlterTable
ALTER TABLE "WordnoteCard" ADD COLUMN "difficulty" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WordnoteCard" ADD COLUMN "currentLevel" TEXT NOT NULL DEFAULT '初級';
