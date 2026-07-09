// study-random.js - ランダム学習用関数

// ランダム学習の初期化
// 各単語のinfoPlusProgressに基づいて0〜infoPlusProgressのランダムな値を生成し、
// その値に対応する難易度で学習を行う
function initRandomStudy(card, questionPrompt, questionBtn) {
  const maxProgress = card.infoPlusProgress || 0;
  
  // 0〜maxProgressのランダムな値を生成
  const randomProgress = Math.floor(Math.random() * (maxProgress + 1));
  
  // ランダムに選ばれた進捗値をカードに一時的に設定（表示用）
  const tempCard = { ...card, infoPlusProgress: randomProgress };
  
  // randomProgressに基づいて難易度を決定
  let effectiveDifficulty;
  if (randomProgress === 0) {
    effectiveDifficulty = '初級';
  } else if (randomProgress >= 1 && randomProgress <= 3) {
    effectiveDifficulty = '中級';
  } else if (randomProgress >= 4 && randomProgress <= 6) {
    effectiveDifficulty = '上級';
  } else {
    effectiveDifficulty = '完成';
  }
  
  // 選ばれた難易度に応じて学習を開始
  if (effectiveDifficulty === '初級') {
    // 初級：カードを表示して初級モードで開始
    const cardContent = document.getElementById('cardContent');
    cardContent.innerHTML = createWordCard(tempCard, '初級');
    initBasicStudy(tempCard, questionPrompt, questionBtn);
  } else if (effectiveDifficulty === '中級') {
    // 中級：カードを表示して中級モードで開始
    const cardContent = document.getElementById('cardContent');
    cardContent.innerHTML = createWordCard(tempCard, '中級');
    initIntermediateStudy(tempCard, questionPrompt, questionBtn);
  } else if (effectiveDifficulty === '上級') {
    // 上級：例文学習モードで開始
    initAdvancedStudy(tempCard, questionPrompt, questionBtn);
  } else {
    // 完成：英訳→意味→英単語モードで開始
    initCompletionStudy(tempCard, questionPrompt, questionBtn);
  }
}
