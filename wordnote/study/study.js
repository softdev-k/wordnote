// study.js - メインエントリーポイント

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('bookId');
  const difficulty = urlParams.get('difficulty');
  const studyMethod = urlParams.get('studyMethod') || 'difficulty';
  const customOptions = urlParams.get('options');

  const studyTitle = document.getElementById('studyTitle');
  const studyInfo = document.getElementById('studyInfo');
  const progress = document.getElementById('progress');
  const cardContent = document.getElementById('cardContent');

  // StudyCoreに設定
  StudyCore.difficulty = difficulty || '';
  StudyCore.studyMethod = studyMethod;

  // URLパラメータがない場合は一覧に戻る
  if (!bookId && studyMethod !== 'allToday') {
    alert('必要な情報が不足しています');
    window.location.href = '../index.html';
    return;
  }
  
  if (bookId && (!difficulty && studyMethod !== 'random' && studyMethod !== 'custom' && studyMethod !== 'today' && studyMethod !== 'allToday')) {
    alert('必要な情報が不足しています');
    window.location.href = '../index.html';
    return;
  }

  // 単語カードを読み込む
  async function loadCards() {
    try {
      // 全単語本の今日の学習モード
      if (studyMethod === 'allToday') {
        try {
          const allTodayCards = await initAllBooksToday();
          
          if (allTodayCards.length === 0) {
            cardContent.innerHTML = '<p style="text-align: center; color: #666;">今日復習する単語はありません</p>';
            studyInfo.textContent = '今日の学習（全単語本）';
            progress.textContent = '0 / 0';
            return;
          }
          
          studyInfo.textContent = '今日の学習（全単語本）';
          showAllTodayCard(0);
          return;
        } catch (e) {
          console.error('Error initializing all books today study:', e);
          alert('今日の学習の初期化に失敗しました');
          window.location.href = '../index.html';
          return;
        }
      }
      
      const response = await fetch(`/api/wordnote/cards/${bookId}`);
      if (!response.ok) throw new Error('Failed to fetch cards');
      
      const data = await response.json();
      let allCards = data.cards || [];
      const bookLevel = data.level || '初級';

      // カスタマイズ学習の場合
      if (studyMethod === 'custom' && customOptions) {
        try {
          const options = JSON.parse(decodeURIComponent(customOptions));
          const customCards = initCustomStudyMode(allCards, options, bookLevel);
          
          if (customCards.length === 0) {
            cardContent.innerHTML = '<p style="text-align: center; color: #666;">学習する単語がありません</p>';
            studyInfo.textContent = 'カスタマイズ学習';
            progress.textContent = '0 / 0';
            return;
          }
          
          studyInfo.textContent = 'カスタマイズ学習';
          showCustomCard(0);
          return;
        } catch (e) {
          console.error('Error parsing custom options:', e);
        }
      }

      // 今日の学習の場合
      if (studyMethod === 'today') {
        try {
          const todayCards = await initTodayStudyMode(allCards, bookLevel, bookId);
          
          if (todayCards.length === 0) {
            cardContent.innerHTML = '<p style="text-align: center; color: #666;">今日復習する単語はありません</p>';
            studyInfo.textContent = '今日の学習';
            progress.textContent = '0 / 0';
            return;
          }
          
          studyInfo.textContent = '今日の学習';
          showTodayCard(0);
          return;
        } catch (e) {
          console.error('Error initializing today study:', e);
        }
      }

      // ランダム学習の場合はフィルタなし
      if (studyMethod === 'random') {
        StudyCore.cards = allCards;
      } else {
        // infoPlusProgressの値に基づいてカードをフィルタリング
        const progressThresholdMap = {
          '初級': 0,
          '中級': 1,
          '上級': 4,
          '完成': 7
        };
        
        const threshold = progressThresholdMap[difficulty] || 0;
        
        // infoPlusProgressが閾値以上のカードのみ表示
        StudyCore.cards = allCards.filter(card => card.infoPlusProgress >= threshold);
      }

      if (StudyCore.cards.length === 0) {
        cardContent.innerHTML = '<p style="text-align: center; color: #666;">学習する単語がありません</p>';
        studyInfo.textContent = studyMethod === 'random' ? 'ランダム学習' : `難易度: ${difficulty}`;
        progress.textContent = '0 / 0';
        return;
      }

      studyInfo.textContent = studyMethod === 'random' ? 'ランダム学習' : `難易度: ${difficulty}`;
      showCard(0);
    } catch (error) {
      console.error('Error loading cards:', error);
      cardContent.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">カードの読み込みに失敗しました</p>';
    }
  }

  // カードを表示
  window.showCard = function(index) {
    StudyCore.currentIndex = index;
    const card = StudyCore.cards[index];
    
    // 質問セクションを初期化
    const questionSection = document.getElementById('questionSection');
    const memoBtn = card.memo ? `<button class="memo-btn" onclick="showMemoModal()">📝</button>` : '';
    questionSection.innerHTML = `
      <div class="question-text-wrapper">
        <div class="question-prompt" id="questionPrompt">和訳を思い出せますか？</div>
        ${memoBtn}
      </div>
      <button class="question-btn" id="questionBtn">答えを見る</button>
    `;
    
    // メモモーダルの内容を更新
    if (card.memo) {
      updateMemoModal(card.memo);
    }
    
    const questionPrompt = document.getElementById('questionPrompt');
    const questionBtn = document.getElementById('questionBtn');
    
    // ランダム学習モードの場合
    if (studyMethod === 'random') {
      initRandomStudy(card, questionPrompt, questionBtn);
      
      // 進捗を更新
      progress.textContent = `${StudyCore.currentIndex + 1} / ${StudyCore.cards.length}`;
      return;
    }
    
    // 通常の難易度別学習モード
    cardContent.innerHTML = createWordCard(card, difficulty);
    
    // 難易度に応じた学習モードを初期化
    if (difficulty === '初級') {
      initBasicStudy(card, questionPrompt, questionBtn);
    } else if (difficulty === '中級') {
      // 中級の場合、状態を初期化して段階的学習を開始
      initIntermediateStudy(card, questionPrompt, questionBtn);
    } else if (difficulty === '上級') {
      // 上級の場合、例文シャッフル学習を初期化
      initAdvancedStudy(card, questionPrompt, questionBtn);
    } else if (difficulty === '完成') {
      // 完成の場合、英訳→意味→英単語の学習を初期化
      initCompletionStudy(card, questionPrompt, questionBtn);
    }
    
    // 進捗を更新
    progress.textContent = `${StudyCore.currentIndex + 1} / ${StudyCore.cards.length}`;
  }

  // 初期読み込み
  loadCards();
});
