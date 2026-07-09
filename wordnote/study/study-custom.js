// study-custom.js - カスタマイズ学習用関数

// 品詞の短縮形を取得
function getShortPos(pos) {
  const posMap = {
    'noun': '名',
    'verb': '動',
    'adjective': '形',
    'adverb': '副',
    'pronoun': '代',
    'preposition': '前',
    'conjunction': '接',
    'interjection': '感',
    'article': '冠'
  };
  return posMap[pos] || pos;
}

// 品詞の解析（配列またはカンマ区切り文字列）
function parsePartOfSpeech(posString) {
  if (!posString) return '';
  
  // すでに配列の場合
  if (Array.isArray(posString)) {
    return posString.map(p => getShortPos(p)).join('/');
  }
  
  try {
    const posArray = JSON.parse(posString);
    if (Array.isArray(posArray)) {
      return posArray.map(p => getShortPos(p)).join('/');
    }
  } catch {
    // JSON解析失敗時は旧形式として扱う
  }
  
  // 旧形式の場合はそのまま返す
  return getShortPos(posString);
}

// 意味の解析（{text, pos}配列または文字列配列）
function parseMeanings(meaningsString) {
  if (!meaningsString) return [];
  
  try {
    const meanings = JSON.parse(meaningsString);
    if (!Array.isArray(meanings)) return [];
    
    return meanings.map((item, index) => {
      // 新形式: {text, pos}
      if (typeof item === 'object' && item.text) {
        const posLabel = item.pos ? `${getShortPos(item.pos)}：` : '';
        return { posLabel, text: item.text, index: index + 1 };
      }
      // 旧形式: 文字列
      return { posLabel: '', text: item, index: index + 1 };
    });
  } catch {
    // JSON解析失敗時は空配列
    return [];
  }
}

// カスタマイズ学習の設定
let customStudyOptions = {};
let customStudyCards = [];
let customStudyIndex = 0;

// データが空かどうかをチェックするヘルパー関数
function hasData(jsonString) {
  if (!jsonString) return false;
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.length > 0 && parsed.some(item => {
        if (typeof item === 'string') return item.trim() !== '';
        if (typeof item === 'object' && item !== null) {
          // 例文・チャンク形式 {example, meaning}
          if (item.example || item.meaning) {
            return (item.example && item.example.trim() !== '') || 
                   (item.meaning && item.meaning.trim() !== '');
          }
          // サブの意味形式 {text, pos}
          if (item.text) {
            return item.text.trim() !== '';
          }
        }
        return false;
      });
    }
    return false;
  } catch (e) {
    return false;
  }
}

// カスタマイズ学習の初期化
function initCustomStudyMode(cards, options, bookLevel) {
  customStudyOptions = options;
  customStudyOptions.bookLevel = bookLevel;
  
  // 各単語について、選択された難易度でカードを生成
  customStudyCards = [];
  
  cards.forEach(card => {
    const infoPlusProgress = card.infoPlusProgress || 0;
    
    // 初級カード
    if (options.basic) {
      // 基本の意味があるかチェック
      if (hasData(card.meanings)) {
        customStudyCards.push({
          card: card,
          difficulty: '初級',
          questions: ['basic']
        });
      }
    }
    
    // 中級カード
    if (options.intermediate) {
      const intermediateQuestions = [];
      
      // 基本の意味は常に表示する（モザイクはオプション）
      if (options.basicMeaning) {
        intermediateQuestions.push('basicMeaning');
      }
      
      // 選択された質問項目で、その単語が対応するデータを持っているもののみ追加
      if (options.subMeanings && infoPlusProgress >= 1) {
        // サブの意味のデータがあるかチェック
        const hasSubMeanings = hasData(card.subMeanings);
        if (hasSubMeanings) {
          intermediateQuestions.push('subMeanings');
        }
      }
      if (options.antonyms && infoPlusProgress >= 1) {
        // 対義語のデータがあるかチェック
        const hasAntonyms = hasData(card.antonyms);
        if (hasAntonyms) {
          intermediateQuestions.push('antonyms');
        }
      }
      if (options.derivedWords && infoPlusProgress >= 2) {
        // 派生語のデータがあるかチェック
        const hasDerived = hasData(card.derivedWords);
        if (hasDerived) {
          intermediateQuestions.push('derivedWords');
        }
      }
      if (options.synonyms && infoPlusProgress >= 3) {
        // 類義語のデータがあるかチェック
        const hasSynonyms = hasData(card.synonyms);
        if (hasSynonyms) {
          intermediateQuestions.push('synonyms');
        }
      }
      
      // 質問項目が1つ以上ある場合のみカードを追加
      if (intermediateQuestions.length > 0) {
        customStudyCards.push({
          card: card,
          difficulty: '中級',
          questions: intermediateQuestions
        });
      }
    }
    
    // 上級カード
    if (options.advanced) {
      const advancedQuestions = [];
      
      if (options.examples && infoPlusProgress >= 4) {
        // 例文のデータがあるかチェック
        if (hasData(card.exampleSentences)) {
          advancedQuestions.push('examples');
        }
      }
      if (options.chunks && infoPlusProgress >= 5) {
        // チャンク例文のデータがあるかチェック
        if (hasData(card.chunkExamples)) {
          advancedQuestions.push('chunks');
        }
      }
      if (options.phrases && infoPlusProgress >= 6) {
        // よく使う表現のデータがあるかチェック
        if (hasData(card.commonExpressions)) {
          advancedQuestions.push('phrases');
        }
      }
      
      // 質問項目が1つ以上あればカードを追加
      if (advancedQuestions.length > 0) {
        customStudyCards.push({
          card: card,
          difficulty: '上級',
          questions: advancedQuestions
        });
      }
    }
    
    // 完成カード
    if (options.completion && infoPlusProgress >= 7) {
      // 英訳のデータがあるかチェック
      if (hasData(card.translation)) {
        customStudyCards.push({
          card: card,
          difficulty: '完成',
          questions: ['completion']
        });
      }
    }
  });
  
  // 全カードをシャッフル
  customStudyCards = shuffleArray(customStudyCards);
  customStudyIndex = 0;
  
  return customStudyCards;
}

// カスタマイズ学習：次のカードを表示
function showCustomCard(index) {
  if (index >= customStudyCards.length) {
    alert('学習が完了しました！');
    window.location.href = '../index.html';
    return;
  }
  
  customStudyIndex = index;
  const studyItem = customStudyCards[index];
  const card = studyItem.card;
  const difficulty = studyItem.difficulty;
  const questions = studyItem.questions;
  
  const cardContent = document.getElementById('cardContent');
  const questionSection = document.getElementById('questionSection');
  const progress = document.getElementById('progress');
  
  // 進捗を更新
  progress.textContent = `${index + 1} / ${customStudyCards.length}`;
  
  // 質問セクションを初期化
  questionSection.innerHTML = `
    <div class="question-prompt" id="questionPrompt"></div>
    <button class="question-btn" id="questionBtn">答えを見る</button>
  `;
  
  const questionPrompt = document.getElementById('questionPrompt');
  const questionBtn = document.getElementById('questionBtn');
  
  // 難易度に応じた処理
  if (difficulty === '初級') {
    cardContent.innerHTML = createWordCard(card, '初級');
    initCustomBasicStudy(card, questionPrompt, questionBtn);
  } else if (difficulty === '中級') {
    cardContent.innerHTML = createCustomIntermediateCard(card, questions);
    initCustomIntermediateStudy(card, questions, questionPrompt, questionBtn);
  } else if (difficulty === '上級') {
    initCustomAdvancedStudy(card, questions, questionPrompt, questionBtn);
  } else if (difficulty === '完成') {
    cardContent.innerHTML = createCompletionWordCard(card);
    initCustomCompletionStudy(card, questionPrompt, questionBtn);
  }
}

// カスタマイズ学習：初級
function initCustomBasicStudy(card, questionPrompt, questionBtn) {
  questionPrompt.textContent = '和訳を思い出せますか？';
  questionBtn.textContent = '答えを見る';
  questionBtn.disabled = false;
  
  questionBtn.onclick = () => {
    // モザイクを解除
    const hiddenTexts = document.querySelectorAll('.meaning-text.hidden-text');
    hiddenTexts.forEach(text => text.classList.remove('hidden-text'));
    
    // 評価または次へ
    showCustomEvaluationOrNext(card);
  };
}

// カスタマイズ学習：中級カードの作成
function createCustomIntermediateCard(card, questions) {
  const meaningsData = parseMeanings(card.meanings);
  const shouldMosaicBasic = questions.includes('basicMeaning');
  const hiddenClassBasic = shouldMosaicBasic ? 'hidden-text' : '';
  const meaningsHTML = meaningsData.slice(0, 3).map(item => 
    `<li>${item.index}. ${item.posLabel}<span class="meaning-text ${hiddenClassBasic}">${item.text}</span></li>`
  ).join('');

  const imageHTML = card.imageUrl && card.imageUrl.trim() !== ''
    ? `<div class="card-image"><img src="${card.imageUrl}" alt="${card.word}"></div>`
    : '';

  // 質問項目の中で最大のものを取得
  const maxQuestion = getMaxIntermediateQuestion(questions);
  
  // 追加情報の表示
  let additionalInfoHTML = '';
  const infoPlusProgress = card.infoPlusProgress || 0;
  
  // サブの愊味+対義語（infoPlusProgress >= 1の場合表示）
  if (infoPlusProgress >= 1) {
    const shouldMosaicSub = questions.includes('subMeanings');
    const hiddenClassSub = shouldMosaicSub ? 'hidden-text' : '';
    
    if (card.subMeanings) {
      try {
        const subMeaningsData = parseMeanings(card.subMeanings);
        if (subMeaningsData.length > 0) {
          additionalInfoHTML += `
            <div class="card-sub-meanings">
              <h3>サブの意味:</h3>
              <ul>${subMeaningsData.map(item => `<li>${item.posLabel}<span class="${hiddenClassSub}">${item.text}</span></li>`).join('')}</ul>
            </div>
          `;
        }
      } catch (e) {}
    }
    
    const shouldMosaicAntonyms = questions.includes('antonyms');
    const hiddenClassAntonyms = shouldMosaicAntonyms ? 'hidden-text' : '';
    
    if (card.antonyms) {
      try {
        const antonyms = JSON.parse(card.antonyms);
        if (antonyms.length > 0) {
          additionalInfoHTML += `
            <div class="card-antonyms">
              <h3>対義語</h3>
              <ul>
                ${antonyms.map(item => `<li><span class="${hiddenClassAntonyms}">${item}</span></li>`).join('')}
              </ul>
            </div>
          `;
        }
      } catch (e) {}
    }
  }
  
  // 派生語（infoPlusProgress >= 2の場合表示）
  if (infoPlusProgress >= 2) {
    const shouldMosaic = questions.includes('derivedWords');
    const hiddenClass = shouldMosaic ? 'hidden-text' : '';
    
    if (card.derivedWords) {
      try {
        const derivedWords = JSON.parse(card.derivedWords);
        if (derivedWords.length > 0) {
          additionalInfoHTML += `
            <div class="card-derived-words card-derivedWords">
              <h3>派生語</h3>
              <ul>
                ${derivedWords.map(item => `<li><span class="${hiddenClass}">${item}</span></li>`).join('')}
              </ul>
            </div>
          `;
        }
      } catch (e) {}
    }
  }
  
  // 類義語（infoPlusProgress >= 3の場合表示）
  if (infoPlusProgress >= 3) {
    const shouldMosaic = questions.includes('synonyms');
    const hiddenClass = shouldMosaic ? 'hidden-text' : '';
    
    if (card.synonyms) {
      try {
        const synonyms = JSON.parse(card.synonyms);
        if (synonyms.length > 0) {
          additionalInfoHTML += `
            <div class="card-synonyms">
              <h3>類義語</h3>
              <ul>
                ${synonyms.map(item => `<li><span class="${hiddenClass}">${item}</span></li>`).join('')}
              </ul>
            </div>
          `;
        }
      } catch (e) {}
    }
  }

  return `
    <div class="word-card">
      <div class="card-header">
        <div class="card-pos">${parsePartOfSpeech(card.partOfSpeech)}</div>
        <div class="card-word">${card.word}</div>
        <button class="card-audio-btn" onclick="speakWord('${card.word}')">音声</button>
      </div>
      ${card.pronunciation ? `<div class="card-pronunciation">${card.pronunciation}</div>` : ''}
      <div class="card-body">
        <div class="card-meanings" id="cardMeanings">
          <h3>和訳</h3>
          <ul>${meaningsHTML}</ul>
        </div>
        ${additionalInfoHTML ? `
          <div class="card-body-lower">
            <div class="relations-container">
              ${additionalInfoHTML}
            </div>
            <div class="card-image">${imageHTML ? imageHTML : ''}</div>
          </div>
        ` : imageHTML}
      </div>
    </div>
  `;
}

// 質問項目の最大レベルを取得
function getMaxIntermediateQuestion(questions) {
  let max = 0;
  if (questions.includes('basicMeaning')) max = Math.max(max, 0);
  if (questions.includes('subMeanings')) max = Math.max(max, 1);
  if (questions.includes('antonyms')) max = Math.max(max, 1);
  if (questions.includes('derivedWords')) max = Math.max(max, 2);
  if (questions.includes('synonyms')) max = Math.max(max, 3);
  return max;
}

// カスタマイズ学習：中級の初期化
function initCustomIntermediateStudy(card, questions, questionPrompt, questionBtn) {
  const questionOrder = ['basicMeaning', 'subMeanings', 'antonyms', 'derivedWords', 'synonyms'];
  const questionLabels = {
    'basicMeaning': '基本の意味を答えよ',
    'subMeanings': 'サブの意味を答えよ',
    'antonyms': '対義語を答えよ',
    'derivedWords': '派生語を答えよ',
    'synonyms': '類義語を答えよ'
  };
  const questionSelectors = {
    'basicMeaning': ['.card-meanings'],
    'subMeanings': ['.card-sub-meanings'],
    'antonyms': ['.card-antonyms'],
    'derivedWords': ['.card-derived-words'],
    'synonyms': ['.card-synonyms']
  };
  
  // 選択された質問のみを順番に
  const activeQuestions = questionOrder.filter(q => questions.includes(q));
  let currentQuestionIndex = 0;
  
  function showNextQuestion() {
    if (currentQuestionIndex >= activeQuestions.length) {
      // すべての質問が終了
      showCustomEvaluationOrNext(card);
      return;
    }
    
    const currentQuestion = activeQuestions[currentQuestionIndex];
    questionPrompt.textContent = questionLabels[currentQuestion];
    questionBtn.textContent = '答えを見る';
    questionBtn.disabled = false;
    
    questionBtn.onclick = () => {
      // 対応するモザイクを解除
      const selectors = questionSelectors[currentQuestion];
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(`${selector} .hidden-text`);
        elements.forEach(el => el.classList.remove('hidden-text'));
      });
      
      currentQuestionIndex++;
      showNextQuestion();
    };
  }
  
  showNextQuestion();
}

// カスタマイズ学習：上級の初期化
function initCustomAdvancedStudy(card, questions, questionPrompt, questionBtn) {
  // 選択された例文種類のみを収集
  let allExamples = [];
  const infoPlusProgress = card.infoPlusProgress || 0;
  
  if (questions.includes('examples') && infoPlusProgress >= 4 && card.exampleSentences) {
    try {
      const examples = JSON.parse(card.exampleSentences);
      if (Array.isArray(examples)) {
        examples.filter(item => item.example && item.example.trim() !== '').forEach(item => {
          allExamples.push({ type: 'example', example: item.example, meaning: item.meaning });
        });
      }
    } catch (e) {}
  }
  
  if (questions.includes('chunks') && infoPlusProgress >= 5 && card.chunkExamples) {
    try {
      const chunkExamples = JSON.parse(card.chunkExamples);
      if (Array.isArray(chunkExamples)) {
        chunkExamples.filter(item => item.example && item.example.trim() !== '').forEach(item => {
          allExamples.push({ type: 'chunk', example: item.example, meaning: item.meaning });
        });
      }
    } catch (e) {}
  }
  
  if (questions.includes('phrases') && infoPlusProgress >= 6 && card.commonExpressions) {
    try {
      const commonExpressions = JSON.parse(card.commonExpressions);
      if (Array.isArray(commonExpressions)) {
        commonExpressions.filter(item => item.example && item.example.trim() !== '').forEach(item => {
          allExamples.push({ type: 'phrase', example: item.example, meaning: item.meaning });
        });
      }
    } catch (e) {}
  }
  
  // 例文がない場合は次へ
  if (allExamples.length === 0) {
    moveToNextCustomCard();
    return;
  }
  
  // シャッフル
  allExamples = shuffleArray(allExamples);
  
  // 状態を保存
  const advancedState = {
    allExamples: allExamples,
    batchIndex: 0
  };
  
  showCustomAdvancedBatch(card, advancedState, questionPrompt, questionBtn);
}

// カスタマイズ学習：上級バッチ表示
function showCustomAdvancedBatch(card, state, questionPrompt, questionBtn) {
  const startIdx = state.batchIndex * 4;
  const endIdx = Math.min(startIdx + 4, state.allExamples.length);
  const batch = state.allExamples.slice(startIdx, endIdx);
  
  if (batch.length === 0) {
    // すべての例文を表示し終わった
    showCustomEvaluationOrNext(card);
    return;
  }
  
  questionPrompt.textContent = '例文の意味を答えよ';
  questionBtn.textContent = '答えを見る';
  questionBtn.disabled = false;
  
  const cardContent = document.getElementById('cardContent');
  
  // ヘッダー情報
  const partOfSpeechDisplay = card.partOfSpeech ? parsePartOfSpeech(card.partOfSpeech) : '';
  const pronunciationDisplay = card.pronunciation ? card.pronunciation : '';
  
  let batchHTML = `
    <div class="word-card">
      <div class="card-header">
        <div class="card-pos">${partOfSpeechDisplay}</div>
        <div class="card-word">${card.word}</div>
        <button class="card-audio-btn" onclick="speakWord('${card.word}')">音声</button>
      </div>
      ${pronunciationDisplay ? `<div class="card-pronunciation">${pronunciationDisplay}</div>` : ''}
      <div class="card-body">
        <div class="advanced-batch">
          <div class="example-header">Example</div>
  `;
  const circledNumbers = ['①', '②', '③', '④'];
  
  batch.forEach((item, index) => {
    batchHTML += `
      <div class="example-item">
        <div class="example-number">${circledNumbers[index]}</div>
        <div class="example-sentence">${item.example}</div>
        <div class="example-meaning hidden-text">A. ${item.meaning || ''}</div>
      </div>
    `;
  });
  
  batchHTML += `
        </div>
      </div>
    </div>
  `;
  cardContent.innerHTML = batchHTML;
  
  questionBtn.onclick = () => {
    // モザイク解除
    const hiddenElements = document.querySelectorAll('.advanced-batch .example-meaning.hidden-text');
    hiddenElements.forEach(el => el.classList.remove('hidden-text'));
    
    // 次のバッチがあるかチェック
    const nextStartIdx = (state.batchIndex + 1) * 4;
    const hasNextBatch = nextStartIdx < state.allExamples.length;
    
    if (hasNextBatch) {
      questionBtn.textContent = '次へ';
      questionBtn.onclick = () => {
        state.batchIndex++;
        showCustomAdvancedBatch(card, state, questionPrompt, questionBtn);
      };
    } else {
      // 最後のバッチの場合は直接評価または次のカードへ
      showCustomEvaluationOrNext(card);
    }
  };
}

// カスタマイズ学習：完成の初期化
function initCustomCompletionStudy(card, questionPrompt, questionBtn) {
  questionPrompt.textContent = 'この文があらわす英単語は？';
  questionBtn.textContent = '答えを見る';
  questionBtn.disabled = false;
  
  questionBtn.onclick = () => {
    // モザイク解除
    const hiddenElements = document.querySelectorAll('.completion-card .hidden-text');
    hiddenElements.forEach(el => el.classList.remove('hidden-text'));
    
    showCustomEvaluationOrNext(card);
  };
}

// 評価または次へを表示
function showCustomEvaluationOrNext(card) {
  const questionSection = document.getElementById('questionSection');
  const shouldEvaluate = shouldShowCustomEvaluation(card);
  
  if (shouldEvaluate) {
    // 評価ボタンを表示
    questionSection.innerHTML = `
      <div class="evaluation-buttons">
        <button class="eval-btn eval-btn-1" id="evalBtn1">1. まったく思い出せない</button>
        <button class="eval-btn eval-btn-2" id="evalBtn2">2. 一部思い出せた/時間がかかった</button>
        <button class="eval-btn eval-btn-3" id="evalBtn3">3. すぐに思い出せたが迷いがあった</button>
        <button class="eval-btn eval-btn-4" id="evalBtn4">4. 完全に自動的に思い出せる</button>
      </div>
    `;
    
    for (let i = 1; i <= 4; i++) {
      const btn = document.getElementById(`evalBtn${i}`);
      btn?.addEventListener('click', () => saveCustomStudyRecord(card, i));
    }
  } else {
    // 次へボタンを表示
    questionSection.innerHTML = `
      <div class="question-prompt">学習完了</div>
      <button class="question-btn" id="nextCardBtn">次へ</button>
    `;
    
    document.getElementById('nextCardBtn')?.addEventListener('click', () => {
      moveToNextCustomCard();
    });
  }
}

// 評価を表示すべきかどうか判定
function shouldShowCustomEvaluation(card) {
  // 評価がオフの場合は常にfalse
  if (!customStudyOptions.evaluation) {
    return false;
  }
  
  const bookLevel = customStudyOptions.bookLevel;
  const infoPlusProgress = card.infoPlusProgress || 0;
  
  // 単語本の難易度と単語のinfoPlusProgressの対応をチェック
  const levelRanges = {
    '初級': [0],
    '中級': [1, 2, 3],
    '上級': [4, 5, 6],
    '完成': [7]
  };
  
  return levelRanges[bookLevel]?.includes(infoPlusProgress) || false;
}

// 学習記録を保存
async function saveCustomStudyRecord(card, rating) {
  try {
    const response = await fetch(`/api/wordnote/cards/${card.id}/study`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save study record');
    }
    
    moveToNextCustomCard();
  } catch (error) {
    console.error('Error saving study record:', error);
    alert('学習記録の保存に失敗しました');
  }
}

// 次のカードへ移動
function moveToNextCustomCard() {
  showCustomCard(customStudyIndex + 1);
}
