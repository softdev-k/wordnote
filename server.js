const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const prisma = new PrismaClient();

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home_t.html'));
});

// === Folder APIs ===

// API: list folders
app.get('/api/folders', async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({ 
      orderBy: { createdAt: 'asc' } 
    });
    res.json(folders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: create folder
app.post('/api/folders', async (req, res) => {
  try {
    const { name = '' } = req.body || {};
    const trimmed = String(name).trim();
    if (!trimmed) return res.status(400).json({ error: 'name required' });
    // 同名フォルダ禁止（大小文字を区別しない簡易チェック）
    const existingByName = await prisma.folder.findFirst({
      where: { name: trimmed }
    });
    if (existingByName) return res.status(409).json({ error: 'duplicate name' });
    const folder = await prisma.folder.create({ 
      data: { name: trimmed } 
    });
    res.status(201).json(folder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: delete folder (and all its cards due to cascade)
app.delete('/api/folders/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.folder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    await prisma.folder.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: update folder name
app.put('/api/folders/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { name = '' } = req.body || {};
    const existing = await prisma.folder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    const trimmed = String(name).trim();
    if (!trimmed) return res.status(400).json({ error: 'name required' });
    // 同名フォルダ禁止（自分以外）
    const conflict = await prisma.folder.findFirst({
      where: { name: trimmed, NOT: { id } }
    });
    if (conflict) return res.status(409).json({ error: 'duplicate name' });
    const updated = await prisma.folder.update({
      where: { id },
      data: { name: trimmed }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// === ReviewSchedule APIs ===

// API: create review schedule
app.post('/api/review-schedules', async (req, res) => {
  try {
    const { folderId, reviewDate, reviewCount = 0 } = req.body || {};
    if (!folderId || !reviewDate) {
      return res.status(400).json({ error: 'folderId and reviewDate are required' });
    }
    const schedule = await prisma.reviewSchedule.create({
      data: {
        folderId: Number(folderId),
        reviewDate: new Date(reviewDate),
        reviewCount: Number(reviewCount)
      }
    });
    res.status(201).json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: list review schedules
app.get('/api/review-schedules', async (req, res) => {
  try {
    const folderId = req.query.folderId ? Number(req.query.folderId) : null;
    let schedules;
    if (folderId) {
      schedules = await prisma.reviewSchedule.findMany({
        where: { folderId },
        orderBy: { reviewDate: 'asc' },
        include: { folder: true }
      });
    } else {
      schedules = await prisma.reviewSchedule.findMany({
        orderBy: { reviewDate: 'asc' },
        include: { folder: true }
      });
    }
    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: delete review schedules by folderId
app.delete('/api/review-schedules/folder/:folderId', async (req, res) => {
  const folderId = Number(req.params.folderId);
  try {
    await prisma.reviewSchedule.deleteMany({
      where: { folderId }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// === Card APIs ===

// API: list
app.get('/api/cards', async (req, res) => {
  try {
    const folderId = req.query.folderId ? Number(req.query.folderId) : null;
    let cards;
    if (folderId) {
      cards = await prisma.card.findMany({ 
        where: { folderId },
        orderBy: { id: 'asc' } 
      });
    } else {
      cards = await prisma.card.findMany({ orderBy: { id: 'asc' } });
    }
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: create
app.post('/api/cards', async (req, res) => {
  try {
    const { front = '', back = '', folderId } = req.body || {};
    const data = { 
      front: String(front), 
      back: String(back)
    };
    if (folderId) {
      data.folderId = Number(folderId);
    }
    const card = await prisma.card.create({ data });
    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: update
app.put('/api/cards/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { front = '', back = '' } = req.body || {};
    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    const card = await prisma.card.update({ 
      where: { id }, 
      data: { front: String(front), back: String(back) } 
    });
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: delete
app.delete('/api/cards/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    await prisma.card.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// === Wordnote APIs ===

// API: create wordnote book
app.post('/api/wordnote/books', async (req, res) => {
  try {
    const { 
      name = '', 
      level = '',
      reviewBase = 0.5,
      reviewGrowth = 2.0,
      maxSize = 50,
      evaluationChange = null,
      infoPlusThreshold = 3.5
    } = req.body || {};
    
    const trimmedName = String(name).trim();
    const trimmedLevel = String(level).trim();
    
    if (!trimmedName) return res.status(400).json({ error: 'name required' });
    if (!trimmedLevel) return res.status(400).json({ error: 'level required' });
    
    const book = await prisma.wordnoteBook.create({
      data: { 
        name: trimmedName, 
        level: trimmedLevel,
        reviewBase: parseFloat(reviewBase) || 0.5,
        reviewGrowth: parseFloat(reviewGrowth) || 2.0,
        maxSize: parseInt(maxSize) || 50,
        evaluationChange: evaluationChange,
        infoPlusThreshold: parseFloat(infoPlusThreshold) || 3.5
      }
    });
    res.status(201).json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: get all wordnote books
app.get('/api/wordnote/books', async (req, res) => {
  try {
    const books = await prisma.wordnoteBook.findMany({
      include: { 
        cards: true,
        _count: { select: { cards: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: get a single wordnote book by ID
app.get('/api/wordnote/books/:id(\\d+)', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const book = await prisma.wordnoteBook.findUnique({
      where: { id },
      include: {
        cards: true,
        _count: { select: { cards: true } }
      }
    });
    if (!book) return res.status(404).json({ error: 'not found' });
    res.json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: get wordnote books by level
app.get('/api/wordnote/books/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const books = await prisma.wordnoteBook.findMany({
      where: { level },
      include: { 
        cards: true,
        _count: { select: { cards: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: update wordnote book
app.put('/api/wordnote/books/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { name, maxSize, evaluationChange, infoPlusThreshold } = req.body || {};
    const existing = await prisma.wordnoteBook.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    
    const updateData = {};
    
    // 名前の更新
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) return res.status(400).json({ error: 'name required' });
      updateData.name = trimmedName;
    }
    
    // maxSizeの更新
    if (maxSize !== undefined) {
      const size = Number(maxSize);
      if (isNaN(size) || size < 10) return res.status(400).json({ error: 'maxSize must be at least 10' });
      updateData.maxSize = size;
    }
    
    // evaluationChangeの更新
    if (evaluationChange !== undefined) {
      updateData.evaluationChange = evaluationChange === '' || evaluationChange === null ? null : evaluationChange;
    }
    
    // infoPlusThresholdの更新
    if (infoPlusThreshold !== undefined) {
      const threshold = Number(infoPlusThreshold);
      if (isNaN(threshold) || threshold < 0 || threshold > 4) {
        return res.status(400).json({ error: 'infoPlusThreshold must be between 0 and 4' });
      }
      updateData.infoPlusThreshold = threshold;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'no fields to update' });
    }
    
    const updated = await prisma.wordnoteBook.update({
      where: { id },
      data: updateData
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: update wordnote book level
app.put('/api/wordnote/books/:id/level', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { level = '' } = req.body || {};
    const existing = await prisma.wordnoteBook.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    const trimmedLevel = String(level).trim();
    if (!trimmedLevel) return res.status(400).json({ error: 'level required' });
    const updated = await prisma.wordnoteBook.update({
      where: { id },
      data: { level: trimmedLevel }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: get wordnote book review settings
app.get('/api/wordnote/books/:id/review-settings', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const book = await prisma.wordnoteBook.findUnique({ where: { id } });
    if (!book) return res.status(404).json({ error: 'not found' });
    res.json({
      reviewBase: book.reviewBase,
      reviewGrowth: book.reviewGrowth
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: update wordnote book review settings
app.put('/api/wordnote/books/:id/review-settings', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { reviewBase, reviewGrowth } = req.body || {};
    const existing = await prisma.wordnoteBook.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    
    const base = parseFloat(reviewBase);
    const growth = parseFloat(reviewGrowth);
    
    if (isNaN(base) || isNaN(growth)) {
      return res.status(400).json({ error: 'reviewBase and reviewGrowth must be numbers' });
    }
    
    const updated = await prisma.wordnoteBook.update({
      where: { id },
      data: { reviewBase: base, reviewGrowth: growth }
    });
    res.json({
      reviewBase: updated.reviewBase,
      reviewGrowth: updated.reviewGrowth
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: delete wordnote book
app.delete('/api/wordnote/books/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.wordnoteBook.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    await prisma.wordnoteBook.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: create wordnote card
app.post('/api/wordnote/cards', async (req, res) => {
  try {
    const {
      partOfSpeech = '',
      word = '',
      pronunciation = '',
      meanings = [],
      imageUrl = '',
      memo = '',
      bookId = null,
      level = '',
      difficulty = null,
      currentLevel = null,
      // extended fields
      subMeanings = [],
      antonyms = [],
      synonyms = [],
      derivedWords = [],
      exampleSentences = [],
      chunkExamples = [],
      commonExpressions = [],
      translations = [],
      infoPlusProgress = 0
    } = req.body || {};

    const trimmedWord = String(word).trim();
    const trimmedLevel = String(level).trim();

    if (!trimmedWord) return res.status(400).json({ error: 'word required' });
    if (!trimmedLevel) return res.status(400).json({ error: 'level required' });

    // partOfSpeech: JSON配列または文字列に対応
    let partOfSpeechData;
    if (typeof partOfSpeech === 'string') {
      try {
        partOfSpeechData = JSON.parse(partOfSpeech);
        if (!Array.isArray(partOfSpeechData) || partOfSpeechData.length === 0) {
          return res.status(400).json({ error: 'partOfSpeech must be a non-empty array' });
        }
      } catch (e) {
        // 旧形式の文字列の場合
        partOfSpeechData = partOfSpeech.trim();
      }
    } else if (Array.isArray(partOfSpeech)) {
      partOfSpeechData = partOfSpeech;
    } else {
      return res.status(400).json({ error: 'partOfSpeech required' });
    }

    // meanings: JSON配列（{text, pos}形式）または旧形式の文字列配列に対応
    let meaningsData;
    if (typeof meanings === 'string') {
      try {
        meaningsData = JSON.parse(meanings);
        if (!Array.isArray(meaningsData) || meaningsData.length === 0) {
          return res.status(400).json({ error: 'meanings must be a non-empty array' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'invalid meanings format' });
      }
    } else if (Array.isArray(meanings)) {
      meaningsData = meanings;
    } else {
      return res.status(400).json({ error: 'meanings required' });
    }

    // subMeanings: JSON配列（{text, pos}形式）または旧形式の文字列配列に対応
    let subMeaningsData;
    if (typeof subMeanings === 'string') {
      try {
        subMeaningsData = JSON.parse(subMeanings);
      } catch (e) {
        subMeaningsData = [];
      }
    } else if (Array.isArray(subMeanings)) {
      subMeaningsData = subMeanings;
    } else {
      subMeaningsData = [];
    }

    // difficulty: 1-4 に制限。未指定なら level に応じて自動設定
    const levelToDifficulty = (lvl) => {
      switch (lvl) {
        case '初級': return 1;
        case '中級': return 2;
        case '上級': return 3;
        case '完成': return 4;
        default: return 1;
      }
    };

    let finalDifficulty = difficulty != null ? Number(difficulty) : levelToDifficulty(trimmedLevel);
    if (!Number.isInteger(finalDifficulty) || finalDifficulty < 1 || finalDifficulty > 4) {
      return res.status(400).json({ error: 'difficulty must be an integer between 1 and 4' });
    }

    // currentLevel 未指定なら初期値は "初級"
    const finalCurrentLevel = (currentLevel && String(currentLevel).trim()) || '初級';

    let finalBookId = bookId;

    // If bookId is not provided, create or get existing book
    if (!finalBookId) {
      // Use level as default book name
      const defaultBookName = `${trimmedLevel}用語集`;

      // Try to find existing book by level
      let book = await prisma.wordnoteBook.findFirst({
        where: {
          level: trimmedLevel
        }
      });

      // Create new book if not found
      if (!book) {
        book = await prisma.wordnoteBook.create({
          data: {
            name: defaultBookName,
            level: trimmedLevel
          }
        });
      }

      finalBookId = book.id;
    }

    // Check if book has reached 50 cards limit
    const cardCount = await prisma.wordnoteCard.count({
      where: { bookId: finalBookId }
    });
    
    if (cardCount >= 50) {
      return res.status(400).json({ 
        error: 'この単語本は既に50個のカードが登録されています。新しい単語本を作成してください。' 
      });
    }

    const card = await prisma.wordnoteCard.create({
      data: {
        partOfSpeech: typeof partOfSpeechData === 'string' ? partOfSpeechData : JSON.stringify(partOfSpeechData),
        word: trimmedWord,
        pronunciation: String(pronunciation).trim() || null,
        meanings: JSON.stringify(meaningsData),
        imageUrl: String(imageUrl).trim() || null,
        memo: String(memo).trim() || null,
        bookId: finalBookId,
        difficulty: finalDifficulty,
        currentLevel: finalCurrentLevel,
        // extended fields
        subMeanings: JSON.stringify(subMeaningsData),
        antonyms: JSON.stringify(Array.isArray(antonyms) ? antonyms : []),
        synonyms: JSON.stringify(Array.isArray(synonyms) ? synonyms : []),
        derivedWords: JSON.stringify(Array.isArray(derivedWords) ? derivedWords : []),
        exampleSentences: JSON.stringify(Array.isArray(exampleSentences) ? exampleSentences : []),
        chunkExamples: JSON.stringify(Array.isArray(chunkExamples) ? chunkExamples : []),
        commonExpressions: JSON.stringify(Array.isArray(commonExpressions) ? commonExpressions : []),
        translation: JSON.stringify(Array.isArray(translations) ? translations : []),
        infoPlusProgress: Number(infoPlusProgress) || 0
      }
    });

    res.status(201).json(card);
  } catch (err) {
    console.error('Error creating wordnote card:', err);
    res.status(500).json({ error: 'internal error', details: err.message });
  }
});

// API: get wordnote cards by book
// API: get single wordnote card by ID
app.get('/api/wordnote/card/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const card = await prisma.wordnoteCard.findUnique({
      where: { id }
    });
    
    if (!card) {
      return res.status(404).json({ error: 'card not found' });
    }
    
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/api/wordnote/cards/:bookId', async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    
    // bookが存在するか確認
    const book = await prisma.wordnoteBook.findUnique({
      where: { id: bookId }
    });
    
    if (!book) {
      return res.status(404).json({ error: 'book not found' });
    }
    
    // 該当書籍のカードを取得
    const cards = await prisma.wordnoteCard.findMany({
      where: { bookId },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({
      bookId,
      bookName: book.name,
      level: book.level,
      cards
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: delete wordnote card
app.delete('/api/wordnote/cards/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.wordnoteCard.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });
    await prisma.wordnoteCard.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// API: update wordnote card details (extended fields)
app.put('/api/wordnote/cards/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.wordnoteCard.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'not found' });

    const {
      partOfSpeech,
      word,
      pronunciation,
      meanings,
      imageUrl,
      memo,
      subMeanings,
      antonyms,
      synonyms,
      derivedWords,
      exampleSentences,
      chunkExamples,
      commonExpressions,
      translation,
      translations,
      difficulty,
      currentLevel,
      infoPlusProgress,
      reviewDate
    } = req.body || {};

    const data = {};
    
    // 基本情報
    if (partOfSpeech !== undefined) {
      data.partOfSpeech = typeof partOfSpeech === 'string' ? partOfSpeech : JSON.stringify(partOfSpeech);
    }
    if (word !== undefined) data.word = word;
    if (pronunciation !== undefined) data.pronunciation = pronunciation;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (memo !== undefined) data.memo = memo;
    // bookIdはリレーションフィールドなので更新時には使用しない
    
    // JSON配列フィールド
    if (meanings !== undefined) {
      // 既にJSON文字列の場合はそのまま、配列の場合はJSON化
      data.meanings = typeof meanings === 'string' ? meanings : JSON.stringify(Array.isArray(meanings) ? meanings : []);
    }
    if (subMeanings !== undefined) {
      data.subMeanings = typeof subMeanings === 'string' ? subMeanings : JSON.stringify(Array.isArray(subMeanings) ? subMeanings : []);
    }
    if (antonyms !== undefined) {
      data.antonyms = typeof antonyms === 'string' ? antonyms : JSON.stringify(Array.isArray(antonyms) ? antonyms : []);
    }
    if (synonyms !== undefined) {
      data.synonyms = typeof synonyms === 'string' ? synonyms : JSON.stringify(Array.isArray(synonyms) ? synonyms : []);
    }
    if (derivedWords !== undefined) {
      data.derivedWords = typeof derivedWords === 'string' ? derivedWords : JSON.stringify(Array.isArray(derivedWords) ? derivedWords : []);
    }
    if (exampleSentences !== undefined) {
      data.exampleSentences = typeof exampleSentences === 'string' ? exampleSentences : JSON.stringify(Array.isArray(exampleSentences) ? exampleSentences : []);
    }
    if (chunkExamples !== undefined) {
      data.chunkExamples = typeof chunkExamples === 'string' ? chunkExamples : JSON.stringify(Array.isArray(chunkExamples) ? chunkExamples : []);
    }
    if (commonExpressions !== undefined) {
      data.commonExpressions = typeof commonExpressions === 'string' ? commonExpressions : JSON.stringify(Array.isArray(commonExpressions) ? commonExpressions : []);
    }
    
    // 英訳（translationまたはtranslations）
    if (translation !== undefined) {
      // translationが文字列の場合はそのまま保存（info_plus.jsから）、配列の場合はJSON化（input.jsから）
      if (typeof translation === 'string') {
        data.translation = translation;
      } else if (Array.isArray(translation)) {
        data.translation = JSON.stringify(translation);
      }
    } else if (translations !== undefined) {
      // translationsフィールドが送信された場合
      if (Array.isArray(translations)) {
        data.translation = JSON.stringify(translations);
      }
    }
    
    // 学習進捗フィールド（スキーマに存在しないフィールドは使用しない）
    // lastThreeScores, nextReviewDate, studyProgressはスキーマに定義されていないため削除


    if (difficulty !== undefined) {
      const d = Number(difficulty);
      if (!Number.isInteger(d) || d < 1 || d > 4) {
        return res.status(400).json({ error: 'difficulty must be an integer between 1 and 4' });
      }
      data.difficulty = d;
    }

    if (currentLevel !== undefined) {
      const cl = String(currentLevel).trim();
      data.currentLevel = cl || existing.currentLevel;
    }

    if (infoPlusProgress !== undefined) {
      const p = Number(infoPlusProgress);
      if (!Number.isInteger(p) || p < 0 || p > 7) {
        return res.status(400).json({ error: 'infoPlusProgress must be an integer between 0 and 7' });
      }
      data.infoPlusProgress = p;
    }

    if (reviewDate !== undefined) {
      data.reviewDate = String(reviewDate);
    }

    const updated = await prisma.wordnoteCard.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating wordnote card:', err);
    res.status(500).json({ error: 'internal error', details: err.message });
  }
});

// API: save study record
app.post('/api/wordnote/cards/:id/study', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { rating, reviewDate } = req.body;
    
    if (!rating || rating < 1 || rating > 4) {
      return res.status(400).json({ error: 'rating must be between 1 and 4' });
    }
    
    const card = await prisma.wordnoteCard.findUnique({ where: { id } });
    if (!card) return res.status(404).json({ error: 'card not found' });
    
    // 既存の学習履歴を取得
    let studyHistory = [];
    try {
      studyHistory = card.studyHistory ? JSON.parse(card.studyHistory) : [];
    } catch (e) {
      studyHistory = [];
    }
    
    // 新しい学習記録を追加
    studyHistory.push({
      date: new Date().toISOString(),
      rating: rating
    });
    
    // 直近3回分のみ保持
    if (studyHistory.length > 3) {
      studyHistory = studyHistory.slice(-3);
    }
    
    // 更新データを準備
    const updateData = { studyHistory: JSON.stringify(studyHistory) };
    
    // reviewDateが指定されている場合は更新
    if (reviewDate) {
      updateData.reviewDate = reviewDate;
    }
    
    // データベースを更新
    const updated = await prisma.wordnoteCard.update({
      where: { id },
      data: updateData
    });
    
    res.json({ ok: true, studyHistory, reviewDate: updated.reviewDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
