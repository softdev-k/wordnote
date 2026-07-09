/*
  Warnings:

  - You are about to drop the column `additionStage` on the `WordnoteCard` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WordnoteCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partOfSpeech" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "pronunciation" TEXT,
    "meanings" TEXT NOT NULL,
    "imageUrl" TEXT,
    "memo" TEXT,
    "studyHistory" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "currentLevel" TEXT NOT NULL DEFAULT '初級',
    "subMeanings" TEXT,
    "antonyms" TEXT,
    "synonyms" TEXT,
    "derivedWords" TEXT,
    "exampleSentences" TEXT,
    "chunkExamples" TEXT,
    "commonExpressions" TEXT,
    "translation" TEXT,
    "infoPlusProgress" INTEGER NOT NULL DEFAULT 0,
    "bookId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WordnoteCard_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "WordnoteBook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WordnoteCard" ("antonyms", "bookId", "chunkExamples", "commonExpressions", "createdAt", "currentLevel", "derivedWords", "difficulty", "exampleSentences", "id", "imageUrl", "meanings", "memo", "partOfSpeech", "pronunciation", "studyHistory", "subMeanings", "synonyms", "translation", "word") SELECT "antonyms", "bookId", "chunkExamples", "commonExpressions", "createdAt", "currentLevel", "derivedWords", "difficulty", "exampleSentences", "id", "imageUrl", "meanings", "memo", "partOfSpeech", "pronunciation", "studyHistory", "subMeanings", "synonyms", "translation", "word" FROM "WordnoteCard";
DROP TABLE "WordnoteCard";
ALTER TABLE "new_WordnoteCard" RENAME TO "WordnoteCard";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
