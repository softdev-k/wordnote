// study-core.js - 共通関数とグローバル状態

// グローバル状態
const StudyCore = {
  cards: [],
  currentIndex: 0,
  difficulty: '',
  studyMethod: '',
  
  // 中級・上級学習用の状態
  intermediateState: {},
  advancedState: {},
  
  // DOM要素参照（初期化後に設定）
  elements: {}
};

// 配列をシャッフル（Fisher-Yates）
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 音声再生機能
window.speakWord = function(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
};

// メモモーダルの表示
window.showMemoModal = function() {
  let modal = document.getElementById('memoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'memoModal';
    modal.className = 'memo-modal';
    modal.innerHTML = `
      <div class="memo-modal-content">
        <div class="memo-modal-header">
          <h3>📝 メモ</h3>
          <button class="memo-close-btn" onclick="closeMemoModal()">✕</button>
        </div>
        <div class="memo-modal-body" id="memoModalText"></div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeMemoModal();
      }
    });
  }
  modal.style.display = 'flex';
};

// メモモーダルを閉じる
window.closeMemoModal = function() {
  const modal = document.getElementById('memoModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// メモモーダルの内容を更新
window.updateMemoModal = function(memoText) {
  const memoModalText = document.getElementById('memoModalText');
  if (memoModalText) {
    memoModalText.textContent = memoText;
  } else {
    // モーダルがまだ存在しない場合は作成
    const modal = document.createElement('div');
    modal.id = 'memoModal';
    modal.className = 'memo-modal';
    modal.innerHTML = `
      <div class="memo-modal-content">
        <div class="memo-modal-header">
          <h3>📝 メモ</h3>
          <button class="memo-close-btn" onclick="closeMemoModal()">✕</button>
        </div>
        <div class="memo-modal-body" id="memoModalText">${memoText}</div>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeMemoModal();
      }
    });
  }
};

// 学習記録を保存
async function saveStudyRecord(rating) {
  try {
    const currentCard = StudyCore.cards[StudyCore.currentIndex];
    const response = await fetch(`/api/wordnote/cards/${currentCard.id}/study`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Server error:', error);
      throw new Error(error.error || 'Failed to save study record');
    }
    
    const result = await response.json();
    console.log('Study record saved:', result);
    
    // 次のカードに進む
    if (StudyCore.currentIndex < StudyCore.cards.length - 1) {
      showCard(StudyCore.currentIndex + 1);
    } else {
      // 最後のカードの場合
      alert('学習が完了しました！');
      window.location.href = '../index.html';
    }
  } catch (error) {
    console.error('Error saving study record:', error);
    alert('学習記録の保存に失敗しました: ' + error.message);
  }
}

// 評価ボタンを表示（共通）
function showEvaluationButtons() {
  const questionSection = document.getElementById('questionSection');
  questionSection.innerHTML = `
    <div class="evaluation-buttons">
      <button class="eval-btn eval-btn-1" id="evalBtn1">1. まったく思い出せない</button>
      <button class="eval-btn eval-btn-2" id="evalBtn2">2. 一部思い出せた/時間がかかった</button>
      <button class="eval-btn eval-btn-3" id="evalBtn3">3. すぐに思い出せたが迷いがあった</button>
      <button class="eval-btn eval-btn-4" id="evalBtn4">4. 完全に自動的に思い出せる</button>
    </div>
  `;
  
  // 評価ボタンにイベントを追加
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`evalBtn${i}`);
    btn?.addEventListener('click', () => saveStudyRecord(i));
  }
}

// 次へボタンを表示（ランダム学習・難易度別学習用）
function showNextButton() {
  const questionSection = document.getElementById('questionSection');
  questionSection.innerHTML = `
    <button class="question-btn" id="nextCardBtn">次へ</button>
  `;
  
  const nextCardBtn = document.getElementById('nextCardBtn');
  if (nextCardBtn) {
    nextCardBtn.onclick = () => moveToNextCard();
  }
}

// 次のカードに移動（共通）
function moveToNextCard() {
  if (StudyCore.currentIndex < StudyCore.cards.length - 1) {
    showCard(StudyCore.currentIndex + 1);
  } else {
    alert('学習が完了しました！');
    window.location.href = '../index.html';
  }
}
