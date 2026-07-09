// study-completion.js - 完成レベル学習用関数

// 完成レベル学習の初期化
function initCompletionStudy(card, questionPrompt, questionBtn) {
  // カード内容を完成レベル用に置き換え
  const cardContent = document.getElementById('cardContent');
  cardContent.innerHTML = createCompletionWordCard(card);

  // 問題文とボタンを設定
  questionPrompt.textContent = 'この文があらわす英単語は？';
  questionBtn.textContent = '答えを見る';
  questionBtn.disabled = false;

  // ボタンクリック時の処理
  questionBtn.onclick = () => {
    revealCompletionAnswer(card, questionPrompt, questionBtn);
  };
}

// 完成レベル用のカードHTML作成
function createCompletionWordCard(card) {
  const meanings = JSON.parse(card.meanings || '[]');
  let translations = [];
  
  // 英訳データを取得
  if (card.translation) {
    try {
      const parsed = JSON.parse(card.translation);
      if (Array.isArray(parsed)) {
        translations = parsed;
      } else if (typeof parsed === 'string') {
        translations = [parsed];
      }
    } catch (e) {
      translations = [card.translation];
    }
  }

  // 英訳と意味のペアを作成
  let pairsHTML = '';
  meanings.forEach((meaning, index) => {
    const translation = translations[index] || '';
    if (translation) {
      pairsHTML += `
        <div class="completion-pair">
          <div class="completion-translation">${translation}</div>
          <div class="completion-meaning hidden-text">${meaning}</div>
        </div>
      `;
    }
  });

  // 英訳がない場合
  if (!pairsHTML) {
    pairsHTML = '<p style="text-align: center; color: #999;">英訳がありません</p>';
  }

  return `
    <div class="word-card completion-card">
      <div class="completion-pairs">
        ${pairsHTML}
      </div>
      <div class="completion-answer">
        <span class="completion-label">A.</span>
        <span class="completion-word hidden-text">${card.word}</span>
      </div>
    </div>
  `;
}

// 完成レベル：答えを表示してモザイクを外す
function revealCompletionAnswer(card, questionPrompt, questionBtn) {
  // すべてのモザイクを外す
  const hiddenElements = document.querySelectorAll('.completion-card .hidden-text');
  hiddenElements.forEach(el => {
    el.classList.remove('hidden-text');
  });

  // ボタンを「次へ」に変更
  questionBtn.textContent = '次へ';
  questionBtn.onclick = () => {
    // 次の単語へ移動
    moveToNextCard();
  };
}
