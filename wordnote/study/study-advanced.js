// study-advanced.js - 上級学習用関数

// 上級学習の初期化
function initAdvancedStudy(card, questionPrompt, questionBtn) {
  // 例文データを収集
  let allExamples = [];

  // infoPlusProgressに応じて例文を選別
  const infoPlusProgress = card.infoPlusProgress || 0;

  // 1. 例文（infoPlusProgress >= 4の場合）
  if (infoPlusProgress >= 4 && card.exampleSentences) {
    try {
      const examples = JSON.parse(card.exampleSentences);
      if (Array.isArray(examples)) {
        const validExamples = examples.filter(item => item.example && item.example.trim() !== '');
        validExamples.forEach(item => {
          allExamples.push({ type: 'example', example: item.example, meaning: item.meaning });
        });
      }
    } catch (e) {
      console.error('Error parsing exampleSentences:', e);
    }
  }

  // 2. チャンク例文（infoPlusProgress >= 5の場合）
  if (infoPlusProgress >= 5 && card.chunkExamples) {
    try {
      const chunkExamples = JSON.parse(card.chunkExamples);
      if (Array.isArray(chunkExamples)) {
        const validExamples = chunkExamples.filter(item => item.example && item.example.trim() !== '');
        validExamples.forEach(item => {
          allExamples.push({ type: 'chunk', example: item.example, meaning: item.meaning });
        });
      }
    } catch (e) {
      console.error('Error parsing chunkExamples:', e);
    }
  }

  // 3. よく使う表現の例文（infoPlusProgress >= 6の場合）
  if (infoPlusProgress >= 6 && card.commonExpressions) {
    try {
      const commonExpressions = JSON.parse(card.commonExpressions);
      if (Array.isArray(commonExpressions)) {
        const validExamples = commonExpressions.filter(item => item.example && item.example.trim() !== '');
        validExamples.forEach(item => {
          allExamples.push({ type: 'phrase', example: item.example, meaning: item.meaning });
        });
      }
    } catch (e) {
      console.error('Error parsing commonExpressions:', e);
    }
  }

  // 例文がない場合は次のカードへ
  if (allExamples.length === 0) {
    moveToNextCard();
    return;
  }

  // 例文をシャッフル
  allExamples = shuffleArray(allExamples);

  // 状態を初期化
  StudyCore.advancedState = {
    cardId: card.id,
    allExamples: allExamples,
    batchIndex: 0 // 4つごとのバッチインデックス
  };

  // 最初のバッチを表示
  showAdvancedBatch(card, questionPrompt, questionBtn);
}

// 上級学習：バッチを表示（4つずつ）
function showAdvancedBatch(card, questionPrompt, questionBtn) {
  const state = StudyCore.advancedState;
  const startIdx = state.batchIndex * 4;
  const endIdx = Math.min(startIdx + 4, state.allExamples.length);
  const batch = state.allExamples.slice(startIdx, endIdx);

  // 問題文を表示
  questionPrompt.textContent = '例文の意味を答えよ';
  questionBtn.textContent = '答えを見る';
  questionBtn.disabled = false;

  // カード内容を置き換え（例文バッチ表示）
  const cardContent = document.getElementById('cardContent');
  
  // ヘッダー部分
  const partOfSpeechDisplay = card.partOfSpeech ? parsePartOfSpeech(card.partOfSpeech) : '';
  const pronunciationDisplay = card.pronunciation ? card.pronunciation : '';
  
  // 例文HTML
  const circledNumbers = ['①', '②', '③', '④'];
  let examplesHTML = '';
  batch.forEach((item, index) => {
    examplesHTML += `
      <div class="example-item">
        <div class="example-number">${circledNumbers[index]}</div>
        <div class="example-sentence">${item.example}</div>
        <div class="example-meaning hidden-text">A. ${item.meaning || ''}</div>
      </div>
    `;
  });

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
          ${examplesHTML}
        </div>
      </div>
    </div>
  `;
  
  cardContent.innerHTML = batchHTML;

  // ボタンクリック時の処理
  questionBtn.onclick = () => {
    revealAdvancedAnswer(card, questionPrompt, questionBtn);
  };
}

// 上級学習：答えを表示してモザイクを外す
function revealAdvancedAnswer(card, questionPrompt, questionBtn) {
  // すべての意味のモザイクを外す
  const hiddenElements = document.querySelectorAll('.advanced-batch .example-meaning.hidden-text');
  hiddenElements.forEach(el => {
    el.classList.remove('hidden-text');
  });

  // 次のバッチがあるか確認
  const state = StudyCore.advancedState;
  const nextBatchIndex = state.batchIndex + 1;
  const startIdx = nextBatchIndex * 4;
  const hasNextBatch = startIdx < state.allExamples.length;

  if (hasNextBatch) {
    // まだバッチが残っている場合：「次へ」ボタンで次のバッチへ
    questionBtn.textContent = '次へ';
    questionBtn.onclick = () => {
      StudyCore.advancedState.batchIndex++;
      showAdvancedBatch(card, questionPrompt, questionBtn);
    };
  } else {
    // 最後のバッチの場合：次のカードへ移動するボタンを表示
    const urlParams = new URLSearchParams(window.location.search);
    const studyMethod = urlParams.get('studyMethod');
    const difficulty = urlParams.get('difficulty');
    
    if (studyMethod === 'random' || difficulty) {
      // ランダム学習・難易度別学習：次へボタンを表示
      showNextButton();
    } else {
      // 今日の学習：評価ボタンを表示
      showEvaluationButtons();
    }
  }
}

// 上級用の例文形式で単語カードを作成
function createAdvancedWordCard(card, includeExamples = true) {
  let examplesHTML = '';
  
  if (includeExamples) {
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
    
    if (allExamples.length > 0) {
      const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
      examplesHTML = allExamples.map((item, index) => `
        <div class="example-item">
          <div class="example-number">${circledNumbers[index] || `(${index + 1})`}</div>
          <div class="example-sentence">${item.example || ''}</div>
          <div class="example-meaning">A. ${item.meaning || ''}</div>
        </div>
      `).join('');
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
        ${includeExamples && examplesHTML ? `<div class="card-examples">${examplesHTML}</div>` : (includeExamples ? '<p style="text-align: center; color: #999;">例文がありません</p>' : '<div class="card-examples" id="examplesContainer"></div>')}
      </div>
    </div>
  `;
}
