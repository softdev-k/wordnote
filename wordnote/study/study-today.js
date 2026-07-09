// study-today.js - 今日の学習モード

// 今日の学習用のグローバル状態
const TodayStudy = {
  cards: [],           // 学習対象のカード
  currentIndex: 0,     // 現在のカードインデックス
  bookId: null,        // 単語本ID
  bookLevel: null,     // 単語本の難易度
  reviewBase: 0.5,     // 復習日計算の基準日数
  reviewGrowth: 2.0,   // 復習日計算の成長率
  showEvaluation: true // 評価を表示するか
};

// infoPlusProgressのレベルと対応する情報のマッピング
const INFO_LEVEL_MAP = {
  0: null,                              // 基本の意味のみ
  1: ['subMeanings', 'antonyms'],       // サブの意味、対義語
  2: ['derivedWords'],                  // 派生語
  3: ['synonyms'],                      // 類義語
  4: ['exampleSentences'],              // 例文
  5: ['chunkExamples'],                 // チャンク例文
  6: ['commonExpressions'],             // よく使う表現
  7: ['translation'],                   // 英訳
  8: null                               // 完全習得
};

// コンテンツの存在チェック
function hasContent(jsonString) {
  if (!jsonString) return false;
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // 配列の場合
    if (Array.isArray(parsed)) {
      return parsed.length > 0;
    }
    
    // 文字列の場合
    if (typeof parsed === 'string') {
      return parsed.trim().length > 0;
    }
    
    return false;
  } catch {
    // JSON形式でない場合は文字列として扱う
    return jsonString.trim().length > 0;
  }
}

// 単語が今日の学習に表示できるかチェック
function validateCardForToday(card) {
  const progress = card.infoPlusProgress || 0;
  
  // レベル0と8は特別扱い（追加情報不要）
  if (progress === 0 || progress === 8) {
    return true;
  }
  
  // そのレベルに対応する情報が入力されているかチェック
  const requiredFields = INFO_LEVEL_MAP[progress];
  
  if (!requiredFields) {
    console.warn(`Unknown infoPlusProgress level: ${progress}`);
    return false;
  }
  
  // すべての必須フィールドが入力されているか確認
  for (const field of requiredFields) {
    if (!hasContent(card[field])) {
      console.log(`Card ${card.id}: infoPlusProgress=${progress} but ${field} is missing`);
      return false;
    }
  }
  
  return true;
}

// JSONデータが有効かチェック（空でないか）
function hasTodayData(value) {
  if (!value) return false;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      return parsed.length > 0 && parsed.some(item => {
        if (typeof item === 'string') return item.trim() !== '';
        if (typeof item === 'object' && item !== null) {
          return Object.values(item).some(v => v && String(v).trim() !== '');
        }
        return false;
      });
    }
    return false;
  } catch {
    return false;
  }
}

// 今日の日付を取得（YYYY-MM-DD形式）
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

// 上達度を計算（常に合計/3、値がない場合は0）
function calculateProficiency(studyHistory) {
  let history = [];
  try {
    history = typeof studyHistory === 'string' ? JSON.parse(studyHistory) : (studyHistory || []);
  } catch {
    history = [];
  }
  
  // 最新3件の評価を取得
  const latestThree = history.slice(-3);
  
  // 3つの要素で埋める（値がない場合は0）
  const ratings = [0, 0, 0];
  for (let i = 0; i < Math.min(latestThree.length, 3); i++) {
    ratings[i] = latestThree[i].rating || 0;
  }
  
  const sum = ratings.reduce((a, b) => a + b, 0);
  return sum / 3;
}

// 復習日を計算（四捨五入）
function calculateReviewDays(proficiency, base, growth) {
  const days = base * Math.pow(growth, proficiency);
  return Math.round(days);
}

// 新しい復習日を計算（今日 + 計算された日数）
function calculateNewReviewDate(proficiency, base, growth) {
  const daysToAdd = calculateReviewDays(proficiency, base, growth);
  const today = new Date();
  today.setDate(today.getDate() + daysToAdd);
  return today.toISOString().split('T')[0];
}

// 復習対象のカードをフィルタリング
function filterTodayCards(cards, bookLevel) {
  const today = getTodayDateString();
  const levelOrder = ['初級', '中級', '上級', '完成'];
  const bookLevelIndex = levelOrder.indexOf(bookLevel);
  
  return cards.filter(card => {
    // 単語本の難易度以下かチェック
    const cardLevelIndex = levelOrder.indexOf(card.currentLevel || '初級');
    if (cardLevelIndex > bookLevelIndex) return false;
    
    // infoPlusProgressに基づいてフィルタリング
    const progress = card.infoPlusProgress || 0;
    if (bookLevel === '初級' && progress !== 0) return false;
    if (bookLevel === '中級' && progress > 3) return false;
    if (bookLevel === '上級' && progress > 6) return false;
    // 完成の場合は全てのprogressを許可
    
    // 復習日が今日以前かチェック（復習日がnullの場合も対象）
    const reviewDate = card.reviewDate;
    if (!reviewDate) return true; // 復習日未設定は対象
    if (reviewDate > today) return false;
    
    // infoPlusProgressに対応する情報が入力されているかチェック
    if (!validateCardForToday(card)) {
      return false;
    }
    
    return true;
  });
}

// カードの表示形式を決定（infoPlusProgressを優先）
function determineTodayCardType(card) {
  const progress = card.infoPlusProgress || 0;
  
  // infoPlusProgressに基づいて表示形式を決定
  if (progress === 0) {
    return { type: 'basic', level: '初級' };
  } else if (progress >= 1 && progress <= 3) {
    return { type: 'intermediate', level: '中級', progress };
  } else if (progress >= 4 && progress <= 6) {
    return { type: 'advanced', level: '上級', progress };
  } else if (progress >= 7) {
    return { type: 'completion', level: '完成' };
  }
  
  return { type: 'basic', level: '初級' };
}

// 今日の学習モードを初期化
async function initTodayStudyMode(cards, bookLevel, bookId) {
  TodayStudy.bookId = bookId;
  TodayStudy.bookLevel = bookLevel;
  
  // 復習設定を読み込む
  try {
    const response = await fetch(`/api/wordnote/books/${bookId}/review-settings`);
    if (response.ok) {
      const settings = await response.json();
      TodayStudy.reviewBase = settings.reviewBase || 0.5;
      TodayStudy.reviewGrowth = settings.reviewGrowth || 2.0;
    }
  } catch (e) {
    console.error('Error loading review settings:', e);
  }
  
  // 復習対象のカードをフィルタリング
  const filteredCards = filterTodayCards(cards, bookLevel);
  
  // カードをシャッフル
  TodayStudy.cards = filteredCards.sort(() => Math.random() - 0.5);
  TodayStudy.currentIndex = 0;
  
  return TodayStudy.cards;
}

// 今日の学習カードを表示
function showTodayCard(index) {
  TodayStudy.currentIndex = index;
  const card = TodayStudy.cards[index];
  
  if (!card) {
    showTodayStudyComplete();
    return;
  }
  
  const cardType = determineTodayCardType(card);
  const cardContent = document.getElementById('cardContent');
  const questionSection = document.getElementById('questionSection');
  const progress = document.getElementById('progress');
  
  // 進捗を更新
  progress.textContent = `${index + 1} / ${TodayStudy.cards.length}`;
  
  // 質問セクションを初期化
  questionSection.innerHTML = `
    <div class="question-prompt" id="questionPrompt">和訳を思い出せますか？</div>
    <button class="question-btn" id="questionBtn">答えを見る</button>
  `;
  
  const questionPrompt = document.getElementById('questionPrompt');
  const questionBtn = document.getElementById('questionBtn');
  
  // カードタイプに応じて表示
  switch (cardType.type) {
    case 'basic':
      cardContent.innerHTML = createWordCard(card, '初級');
      initTodayBasicStudy(card, questionPrompt, questionBtn);
      break;
    case 'intermediate':
      initTodayIntermediateStudy(card, questionPrompt, questionBtn, cardType.progress);
      break;
    case 'advanced':
      initTodayAdvancedStudy(card, questionPrompt, questionBtn, cardType.progress);
      break;
    case 'completion':
      cardContent.innerHTML = createWordCard(card, '完成');
      initTodayCompletionStudy(card, questionPrompt, questionBtn);
      break;
  }
}

// 初級モードの学習
function initTodayBasicStudy(card, questionPrompt, questionBtn) {
  questionPrompt.textContent = '和訳を思い出せますか？';
  questionBtn.textContent = '答えを見る';
  
  questionBtn.onclick = () => {
    // 意味を表示（モザイクを外す）
    const hiddenTexts = document.querySelectorAll('.meaning-text.hidden-text');
    hiddenTexts.forEach(text => {
      text.classList.remove('hidden-text');
    });
    // 評価を表示
    showTodayEvaluation(card);
  };
}

// 中級モードの学習
function initTodayIntermediateStudy(card, questionPrompt, questionBtn, progress) {
  // 共通のcreateWordCard関数を使用
  const cardContent = document.getElementById('cardContent');
  cardContent.innerHTML = createWordCard(card, '中級');
  
  // infoPlusProgressに応じて追加情報をカテゴリごとにグループ化
  const categoryGroups = [];
  
  // サブの意味・対義語（progress >= 1）
  if (progress >= 1) {
    const subMeanings = cardContent.querySelector('.card-subMeanings');
    if (subMeanings) {
      const spans = subMeanings.querySelectorAll('li > span');
      if (spans.length > 0) {
        spans.forEach(span => {
          if (!span.classList.contains('hidden-text')) {
            span.classList.add('hidden-text');
          }
        });
        categoryGroups.push({
          name: 'サブの意味',
          selectors: ['.card-subMeanings']
        });
      }
    }
    
    const antonyms = cardContent.querySelector('.card-antonyms');
    if (antonyms) {
      const spans = antonyms.querySelectorAll('li > span');
      if (spans.length > 0) {
        spans.forEach(span => {
          if (!span.classList.contains('hidden-text')) {
            span.classList.add('hidden-text');
          }
        });
        categoryGroups.push({
          name: '対義語',
          selectors: ['.card-antonyms']
        });
      }
    }
  }
  
  // 派生語（progress >= 2）
  if (progress >= 2) {
    const derivedWords = cardContent.querySelector('.card-derivedWords');
    if (derivedWords) {
      const spans = derivedWords.querySelectorAll('li > span');
      if (spans.length > 0) {
        spans.forEach(span => {
          if (!span.classList.contains('hidden-text')) {
            span.classList.add('hidden-text');
          }
        });
        categoryGroups.push({
          name: '派生語',
          selectors: ['.card-derivedWords']
        });
      }
    }
  }
  
  // 類義語（progress >= 3）
  if (progress >= 3) {
    const synonyms = cardContent.querySelector('.card-synonyms');
    if (synonyms) {
      const spans = synonyms.querySelectorAll('li > span');
      if (spans.length > 0) {
        spans.forEach(span => {
          if (!span.classList.contains('hidden-text')) {
            span.classList.add('hidden-text');
          }
        });
        categoryGroups.push({
          name: '類義語',
          selectors: ['.card-synonyms']
        });
      }
    }
  }
  
  // カテゴリがない場合は直接評価へ
  if (categoryGroups.length === 0) {
    showTodayEvaluation(card);
    return;
  }
  
  let currentCategoryIndex = 0;
  
  function showNextCategory() {
    if (currentCategoryIndex < categoryGroups.length) {
      const category = categoryGroups[currentCategoryIndex];
      questionPrompt.textContent = `${category.name}を答えよ`;
      questionBtn.textContent = '答えを見る';
      questionBtn.style.display = 'block';
      
      questionBtn.onclick = function() {
        // このカテゴリのすべてのモザイクを外す
        category.selectors.forEach(selector => {
          const element = cardContent.querySelector(selector);
          if (element) {
            const spans = element.querySelectorAll('li > span.hidden-text');
            spans.forEach(span => span.classList.remove('hidden-text'));
          }
        });
        
        currentCategoryIndex++;
        
        if (currentCategoryIndex < categoryGroups.length) {
          // 次のカテゴリを直接表示
          showNextCategory();
        } else {
          showTodayEvaluation(card);
        }
      };
    }
  }
  
  showNextCategory();
}



// 上級モードの学習
function initTodayAdvancedStudy(card, questionPrompt, questionBtn, progress) {
  const cardContent = document.getElementById('cardContent');
  
  // カードヘッダーのみを表示（例文は含めない）
  cardContent.innerHTML = createAdvancedWordCard(card, false);
  
  // 例文を収集
  let allExamples = [];
  
  // 例文を収集
  if (card.exampleSentences) {
    try {
      const examples = JSON.parse(card.exampleSentences);
      if (Array.isArray(examples) && examples.length > 0) {
        const validExamples = examples.filter(item => item.example && item.example.trim() !== '');
        allExamples.push(...validExamples);
      }
    } catch (e) {
      console.error('Error parsing exampleSentences:', e);
    }
  }
  
  // チャンク例文を収集
  if (card.chunkExamples) {
    try {
      const examples = JSON.parse(card.chunkExamples);
      if (Array.isArray(examples) && examples.length > 0) {
        const validExamples = examples.filter(item => item.example && item.example.trim() !== '');
        allExamples.push(...validExamples);
      }
    } catch (e) {
      console.error('Error parsing chunkExamples:', e);
    }
  }
  
  // よく使う表現を収集
  if (card.commonExpressions) {
    try {
      const examples = JSON.parse(card.commonExpressions);
      if (Array.isArray(examples) && examples.length > 0) {
        const validExamples = examples.filter(item => item.example && item.example.trim() !== '');
        allExamples.push(...validExamples);
      }
    } catch (e) {
      console.error('Error parsing commonExpressions:', e);
    }
  }
  
  // 例文が1つもない場合は評価へ
  if (allExamples.length === 0) {
    showTodayEvaluation(card);
    return;
  }
  
  // シャッフル
  allExamples = allExamples.sort(() => Math.random() - 0.5);
  
  // 4つずつバッチに分割
  const batches = [];
  for (let i = 0; i < allExamples.length; i += 4) {
    batches.push(allExamples.slice(i, i + 4));
  }
  
  let currentBatchIndex = 0;
  
  function showNextBatch() {
    if (currentBatchIndex < batches.length) {
      const currentBatch = batches[currentBatchIndex];
      const startNum = (currentBatchIndex * 4) + 1;
      const endNum = Math.min((currentBatchIndex + 1) * 4, allExamples.length);
      
      // バッチのHTMLを生成
      const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
      const batchHTML = currentBatch.map((item, index) => {
        const globalIndex = (currentBatchIndex * 4) + index;
        return `
          <div class="example-item">
            <div class="example-number">${circledNumbers[globalIndex] || `(${globalIndex + 1})`}</div>
            <div class="example-sentence">${item.example || ''}</div>
            <div class="example-meaning hidden-text">A. ${item.meaning || ''}</div>
          </div>
        `;
      }).join('');
      
      // 例文コンテナに追加
      const examplesContainer = document.getElementById('examplesContainer');
      if (examplesContainer) {
        examplesContainer.innerHTML = batchHTML;
      }
      
      questionPrompt.textContent = `例文${startNum}〜${endNum}の意味を思い出せますか？`;
      questionBtn.textContent = '答えを見る';
      questionBtn.style.display = 'block';
      
      questionBtn.onclick = function() {
        // 現在のバッチ内の全てのモザイクを一括解除
        const meanings = examplesContainer.querySelectorAll('.example-meaning.hidden-text');
        meanings.forEach(meaning => {
          meaning.classList.remove('hidden-text');
        });
        
        currentBatchIndex++;
        
        if (currentBatchIndex < batches.length) {
          questionPrompt.textContent = '次のバッチへ';
          questionBtn.textContent = '次へ';
          questionBtn.onclick = showNextBatch;
        } else {
          showTodayEvaluation(card);
        }
      };
    }
  }
  
  showNextBatch();
}



// 完成モードの学習
function initTodayCompletionStudy(card, questionPrompt, questionBtn) {
  const cardContent = document.getElementById('cardContent');
  
  // 共通のcreateCompletionWordCard関数を使用
  cardContent.innerHTML = createCompletionWordCard(card);
  
  questionPrompt.textContent = 'この文があらわす英単語は？';
  questionBtn.textContent = '答えを見る';
  
  questionBtn.onclick = () => {
    // すべてのモザイクを外す
    const hiddenElements = document.querySelectorAll('.completion-card .hidden-text');
    hiddenElements.forEach(el => {
      el.classList.remove('hidden-text');
    });
    showTodayEvaluation(card);
  };
}

// 評価を表示
// 評価を表示
function showTodayEvaluation(card) {
  const questionSection = document.getElementById('questionSection');
  
  questionSection.innerHTML = `
    <div class="evaluation-section">
      <p class="evaluation-prompt">どれくらい覚えていましたか？</p>
      <div class="evaluation-buttons">
        <button class="eval-btn eval-btn-1" data-rating="1">1. まったく思い出せない</button>
        <button class="eval-btn eval-btn-2" data-rating="2">2. 一部思い出せた/時間がかかった</button>
        <button class="eval-btn eval-btn-3" data-rating="3">3. すぐに思い出せたが迷いがあった</button>
        <button class="eval-btn eval-btn-4" data-rating="4">4. 完全に自動的に思い出せる</button>
      </div>
    </div>
  `;
  
  // 評価ボタンのイベント
  document.querySelectorAll('.eval-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rating = parseInt(btn.dataset.rating, 10);
      // 全単語本モードかどうかで分岐
      if (AllBooksToday.cards.length > 0 && AllBooksToday.cards.find(c => c.id === card.id)) {
        await submitAllTodayEvaluation(card, rating);
      } else {
        await submitTodayEvaluation(card, rating);
      }
    });
  });
}

// 評価を送信し、復習日を更新
async function submitTodayEvaluation(card, rating) {
  try {
    // 既存のstudyHistoryを取得して上達度を計算（新しい評価を含める）
    let studyHistory = [];
    try {
      studyHistory = typeof card.studyHistory === 'string' ? JSON.parse(card.studyHistory) : (card.studyHistory || []);
    } catch {
      studyHistory = [];
    }
    
    // 新しい評価を追加して上達度を計算
    const newHistory = [...studyHistory, { date: new Date().toISOString(), rating: rating }];
    
    // 上達度を計算
    const proficiency = calculateProficiency(newHistory);
    
    // 新しい復習日を計算
    const newReviewDate = calculateNewReviewDate(proficiency, TodayStudy.reviewBase, TodayStudy.reviewGrowth);
    
    // 既存のstudyエンドポイントを使用（reviewDateも送信）
    const response = await fetch(`/api/wordnote/cards/${card.id}/study`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: rating,
        reviewDate: newReviewDate
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update card');
    }
    
    // 次のカードへ
    if (TodayStudy.currentIndex < TodayStudy.cards.length - 1) {
      showTodayCard(TodayStudy.currentIndex + 1);
    } else {
      showTodayStudyComplete();
    }
  } catch (error) {
    console.error('Error submitting evaluation:', error);
    alert('評価の保存に失敗しました');
  }
}

// 学習完了画面を表示
function showTodayStudyComplete() {
  const cardContent = document.getElementById('cardContent');
  const questionSection = document.getElementById('questionSection');
  const progress = document.getElementById('progress');
  
  cardContent.innerHTML = `
    <div class="study-complete">
      <h2>🎉 今日の学習完了！</h2>
      <p>${TodayStudy.cards.length}個の単語を学習しました</p>
    </div>
  `;
  
  questionSection.innerHTML = `
    <a href="../index.html" class="back-btn">単語本一覧に戻る</a>
  `;
  
  progress.textContent = `${TodayStudy.cards.length} / ${TodayStudy.cards.length}`;
}

// 復習対象の単語があるかチェック
async function checkTodayStudyAvailable(bookId, bookLevel) {
  try {
    const response = await fetch(`/api/wordnote/cards/${bookId}`);
    if (!response.ok) return { available: false, count: 0 };
    
    const data = await response.json();
    const cards = data.cards || [];
    const filteredCards = filterTodayCards(cards, bookLevel);
    
    return {
      available: filteredCards.length > 0,
      count: filteredCards.length
    };
  } catch (error) {
    console.error('Error checking today study:', error);
    return { available: false, count: 0 };
  }
}

// グローバルに公開
window.TodayStudy = TodayStudy;
window.initTodayStudyMode = initTodayStudyMode;
window.showTodayCard = showTodayCard;
window.checkTodayStudyAvailable = checkTodayStudyAvailable;
window.filterTodayCards = filterTodayCards;

// 全単語本モード用のグローバル状態
const AllBooksToday = {
  cards: [],           // 学習対象のカード（bookIdとreviewBase/reviewGrowthを含む）
  currentIndex: 0,
  showEvaluation: true
};

// 全単語本から今日の学習カードを収集
async function initAllBooksToday() {
  try {
    // すべての単語本を取得
    const booksResponse = await fetch('/api/wordnote/books');
    if (!booksResponse.ok) {
      throw new Error('Failed to fetch books');
    }
    
    const books = await booksResponse.json();
    let allTodayCards = [];
    
    // 各単語本から今日の学習カードを収集
    for (const book of books) {
      const cardsResponse = await fetch(`/api/wordnote/cards/${book.id}`);
      if (!cardsResponse.ok) continue;
      
      const data = await cardsResponse.json();
      const cards = data.cards || [];
      const bookLevel = book.level || '初級';
      
      // 復習設定を取得
      let reviewBase = 0.5;
      let reviewGrowth = 2.0;
      try {
        const settingsResponse = await fetch(`/api/wordnote/books/${book.id}/review-settings`);
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          reviewBase = settings.reviewBase || 0.5;
          reviewGrowth = settings.reviewGrowth || 2.0;
        }
      } catch (e) {
        console.error('Error loading review settings:', e);
      }
      
      // 今日の学習対象カードをフィルタリング
      const todayCards = filterTodayCards(cards, bookLevel);
      
      // 各カードにbookId、bookLevel、reviewBase、reviewGrowthを追加
      todayCards.forEach(card => {
        card.bookId = book.id;
        card.bookLevel = bookLevel;
        card.reviewBase = reviewBase;
        card.reviewGrowth = reviewGrowth;
      });
      
      allTodayCards.push(...todayCards);
    }
    
    // シャッフル
    allTodayCards = allTodayCards.sort(() => Math.random() - 0.5);
    
    AllBooksToday.cards = allTodayCards;
    AllBooksToday.currentIndex = 0;
    
    return allTodayCards;
  } catch (error) {
    console.error('Error initializing all books today:', error);
    return [];
  }
}

// 全単語本モードのカード表示
function showAllTodayCard(index) {
  AllBooksToday.currentIndex = index;
  const card = AllBooksToday.cards[index];
  
  if (!card) {
    showAllTodayStudyComplete();
    return;
  }
  
  const cardType = determineTodayCardType(card);
  const cardContent = document.getElementById('cardContent');
  const questionSection = document.getElementById('questionSection');
  const progress = document.getElementById('progress');
  
  // 進捗を更新
  progress.textContent = `${index + 1} / ${AllBooksToday.cards.length}`;
  
  // 質問セクションを初期化
  questionSection.innerHTML = `
    <div class="question-prompt" id="questionPrompt">和訳を思い出せますか？</div>
    <button class="question-btn" id="questionBtn">答えを見る</button>
  `;
  
  const questionPrompt = document.getElementById('questionPrompt');
  const questionBtn = document.getElementById('questionBtn');
  
  // カードタイプに応じて表示（TodayStudyの設定を上書き）
  TodayStudy.bookId = card.bookId;
  TodayStudy.bookLevel = card.bookLevel;
  TodayStudy.reviewBase = card.reviewBase;
  TodayStudy.reviewGrowth = card.reviewGrowth;
  
  switch (cardType.type) {
    case 'basic':
      cardContent.innerHTML = createWordCard(card, '初級');
      initTodayBasicStudy(card, questionPrompt, questionBtn);
      break;
    case 'intermediate':
      initTodayIntermediateStudy(card, questionPrompt, questionBtn, cardType.progress);
      break;
    case 'advanced':
      initTodayAdvancedStudy(card, questionPrompt, questionBtn, cardType.progress);
      break;
    case 'completion':
      cardContent.innerHTML = createWordCard(card, '完成');
      initTodayCompletionStudy(card, questionPrompt, questionBtn);
      break;
  }
}

// 全単語本モードの完了画面
function showAllTodayStudyComplete() {
  const cardContent = document.getElementById('cardContent');
  const questionSection = document.getElementById('questionSection');
  const progress = document.getElementById('progress');
  
  progress.textContent = '完了';
  
  cardContent.innerHTML = `
    <div style="text-align: center; padding: 3rem 1rem;">
      <h2 style="font-size: 2rem; color: #4caf50; margin-bottom: 1rem;">🎉 お疲れ様でした！</h2>
      <p style="font-size: 1.2rem; color: #666; margin-bottom: 2rem;">今日の学習が完了しました</p>
      <button onclick="window.location.href='../index.html'" style="padding: 12px 32px; background: #1976d2; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);">
        トップに戻る
      </button>
    </div>
  `;
  
  questionSection.innerHTML = '';
}

// 全単語本モード用の評価送信
async function submitAllTodayEvaluation(card, rating) {
  try {
    // 上達度を計算
    const proficiency = calculateProficiency(card.studyHistory);
    
    // 新しい復習日を計算
    const newReviewDate = calculateNewReviewDate(proficiency, card.reviewBase, card.reviewGrowth);
    
    // APIに送信
    const response = await fetch(`/api/wordnote/cards/${card.id}/study`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: rating,
        reviewDate: newReviewDate
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save study record');
    }
    
    // 次のカードへ
    const nextIndex = AllBooksToday.currentIndex + 1;
    if (nextIndex < AllBooksToday.cards.length) {
      showAllTodayCard(nextIndex);
    } else {
      showAllTodayStudyComplete();
    }
  } catch (error) {
    console.error('Error submitting evaluation:', error);
    alert('評価の保存に失敗しました');
  }
}

// グローバルに公開
window.initAllBooksToday = initAllBooksToday;
window.showAllTodayCard = showAllTodayCard;
