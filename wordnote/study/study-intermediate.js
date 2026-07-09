// study-intermediate.js - 中級学習用関数

// 中級学習の初期化と段階的表示
function initIntermediateStudy(card, questionPrompt, questionBtn) {
  const infoPlusProgress = card.infoPlusProgress || 0;
  
  // 今日の学習かどうか判定
  const urlParams = new URLSearchParams(window.location.search);
  const studyMethod = urlParams.get('studyMethod');
  const isTodayStudy = (studyMethod === 'today' || studyMethod === 'allToday');
  
  // 学習段階を定義
  let stages = [];
  
  // サブの意味チェック
  let subMeanings = [];
  if (card.subMeanings) {
    try {
      subMeanings = JSON.parse(card.subMeanings);
    } catch (e) {
      subMeanings = [];
    }
  }
  
  // 対義語チェック
  let antonyms = [];
  if (card.antonyms) {
    try {
      antonyms = JSON.parse(card.antonyms);
    } catch (e) {
      antonyms = [];
    }
  }
  
  // 派生語チェック
  let derivedWords = [];
  if (infoPlusProgress >= 2 && card.derivedWords) {
    try {
      derivedWords = JSON.parse(card.derivedWords);
    } catch (e) {
      derivedWords = [];
    }
  }
  
  // 類義語チェック
  let synonyms = [];
  if (infoPlusProgress >= 3 && card.synonyms) {
    try {
      synonyms = JSON.parse(card.synonyms);
    } catch (e) {
      synonyms = [];
    }
  }
  
  // 段階を構築
  if (isTodayStudy) {
    // 今日の学習：個別に表示
    if (subMeanings.length > 0) {
      stages.push({ type: 'subMeanings', question: 'サブの意味を答えよ', items: ['subMeanings'] });
    }
    if (antonyms.length > 0) {
      stages.push({ type: 'antonyms', question: '対義語を答えよ', items: ['antonyms'] });
    }
    if (derivedWords.length > 0) {
      stages.push({ type: 'derivedWords', question: '派生語を答えよ', items: ['derivedWords'] });
    }
    if (synonyms.length > 0) {
      stages.push({ type: 'synonyms', question: '類義語を答えよ', items: ['synonyms'] });
    }
  } else {
    // ランダム学習・難易度別学習：個別に表示
    if (subMeanings.length > 0) {
      stages.push({ type: 'subMeanings', question: 'サブの意味を答えよ', items: ['subMeanings'] });
    }
    if (antonyms.length > 0) {
      stages.push({ type: 'antonyms', question: '対義語を答えよ', items: ['antonyms'] });
    }
    if (derivedWords.length > 0) {
      stages.push({ type: 'derivedWords', question: '派生語を答えよ', items: ['derivedWords'] });
    }
    if (synonyms.length > 0) {
      stages.push({ type: 'synonyms', question: '類義語を答えよ', items: ['synonyms'] });
    }
  }
  
  // すべて空の場合は自動的に次のカードにスキップ
  if (stages.length === 0) {
    moveToNextCard();
    return;
  }
  
  // 最初の段階を表示
  StudyCore.intermediateState = { cardId: card.id, stageIndex: 0, stages: stages };
  showIntermediateStage(card, questionPrompt, questionBtn);
}

// 中級学習の現在の段階を表示
function showIntermediateStage(card, questionPrompt, questionBtn) {
  const state = StudyCore.intermediateState;
  const stage = state.stages[state.stageIndex];
  
  if (!stage) {
    // すべての段階が終了
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
    return;
  }
  
  // 問題文を表示
  questionPrompt.textContent = stage.question;
  questionBtn.textContent = '答えを見る';
  questionBtn.disabled = false;
  
  // ボタンクリック時の処理
  questionBtn.onclick = () => {
    revealIntermediateAnswer(card, stage, questionPrompt, questionBtn);
  };
}

// 中級学習の答えを表示してモザイクを外す
function revealIntermediateAnswer(card, stage, questionPrompt, questionBtn) {
  // stageに含まれるすべての項目のモザイクを外す
  if (stage.items && Array.isArray(stage.items)) {
    stage.items.forEach(itemType => {
      // itemTypeに応じて適切なセレクタを選択
      let selector;
      if (itemType === 'subMeanings') {
        selector = '.card-sub-meanings .hidden-text';
      } else if (itemType === 'antonyms') {
        selector = '.card-antonyms .hidden-text';
      } else if (itemType === 'derivedWords') {
        selector = '.card-derived-words .hidden-text, .card-derivedWords .hidden-text';
      } else if (itemType === 'synonyms') {
        selector = '.card-synonyms .hidden-text';
      } else {
        selector = `.card-${itemType} .hidden-text`;
      }
      
      const hiddenElements = document.querySelectorAll(selector);
      hiddenElements.forEach(el => {
        el.classList.remove('hidden-text');
      });
    });
  } else {
    // 旧形式の互換性のため
    const hiddenElements = document.querySelectorAll('.hidden-text');
    hiddenElements.forEach(el => {
      el.classList.remove('hidden-text');
    });
  }
  
  // 次の段階へ
  StudyCore.intermediateState.stageIndex++;
  showIntermediateStage(card, questionPrompt, questionBtn);
}
