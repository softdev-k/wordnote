-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WordnoteBook" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "reviewBase" REAL NOT NULL DEFAULT 0.5,
    "reviewGrowth" REAL NOT NULL DEFAULT 2.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_WordnoteBook" ("createdAt", "id", "level", "name") SELECT "createdAt", "id", "level", "name" FROM "WordnoteBook";
DROP TABLE "WordnoteBook";
ALTER TABLE "new_WordnoteBook" RENAME TO "WordnoteBook";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
