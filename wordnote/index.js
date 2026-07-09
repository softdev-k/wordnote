// infoPlusProgressのレベルと対応する情報のマッピング
const INFO_LEVEL_MAP = {
  0: null,
  1: ['subMeanings', 'antonyms'],
  2: ['derivedWords'],
  3: ['synonyms'],
  4: ['exampleSentences'],
  5: ['chunkExamples'],
  6: ['commonExpressions'],
  7: ['translation'],
  8: null
};

// コンテンツの存在チェック
function hasContentForIndex(jsonString) {
  if (!jsonString) return false;
  
  try {
    const parsed = JSON.parse(jsonString);
    
    if (Array.isArray(parsed)) {
      return parsed.length > 0;
    }
    
    if (typeof parsed === 'string') {
      return parsed.trim().length > 0;
    }
    
    return false;
  } catch {
    return jsonString.trim().length > 0;
  }
}

// 単語が今日の学習に表示できるかチェック
function validateCardForIndex(card) {
  const progress = card.infoPlusProgress || 0;
  
  if (progress === 0 || progress === 8) {
    return true;
  }
  
  const requiredFields = INFO_LEVEL_MAP[progress];
  
  if (!requiredFields) {
    return false;
  }
  
  for (const field of requiredFields) {
    if (!hasContentForIndex(card[field])) {
      return false;
    }
  }
  
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  const createBtn = document.getElementById('createBookBtn');
  const todayStudyBtn = document.getElementById('todayStudyBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const booksList = document.getElementById('booksList');
  const modal = document.getElementById('createBookModal');
  const form = document.getElementById('createBookForm');
  const cancelBtn = document.getElementById('cancelCreateBook');
  
  const renameModal = document.getElementById('renameBookModal');
  const renameForm = document.getElementById('renameBookForm');
  const cancelRenameBtn = document.getElementById('cancelRenameBook');
  let currentRenameBookId = null;

  const deleteBookModal = document.getElementById('deleteBookModal');
  const deleteBookMessage = document.getElementById('deleteBookMessage');
  const confirmDeleteBookBtn = document.getElementById('confirmDeleteBook');
  const cancelDeleteBookBtn = document.getElementById('cancelDeleteBook');
  let currentDeleteBookId = null;
  let currentDeleteBookName = '';

  const addMethodModal = document.getElementById('addMethodModal');
  const addMethodNormalBtn = document.getElementById('addMethodNormal');
  const addMethodCSVBtn = document.getElementById('addMethodCSV');
  const cancelAddMethodBtn = document.getElementById('cancelAddMethod');
  
  // CSVインポートモーダル
  const csvImportModal = document.getElementById('csvImportModal');
  const csvFileInput = document.getElementById('csvFileInput');
  const selectCsvFileBtn = document.getElementById('selectCsvFileBtn');
  const selectedFileName = document.getElementById('selectedFileName');
  const confirmCsvImport = document.getElementById('confirmCsvImport');
  const cancelCsvImport = document.getElementById('cancelCsvImport');
  
  let selectedCsvFile = null;
  let currentCsvImportBookId = null;
  let currentAddMethodBookId = null;
  let currentAddMethodLevel = null;
  let difficultyContext = null; // 'study' または 'add'

  const studyMethodModal = document.getElementById('studyMethodModal');
  const studyMethodTodayBtn = document.getElementById('studyMethodToday');
  const studyMethodDifficultyBtn = document.getElementById('studyMethodDifficulty');
  const studyMethodRandomBtn = document.getElementById('studyMethodRandom');
  const studyMethodMixedBtn = document.getElementById('studyMethodMixed');
  const cancelStudyMethodBtn = document.getElementById('cancelStudyMethod');
  let currentStudyBookId = null;
  let currentStudyLevel = null;

  const difficultySelectModal = document.getElementById('difficultySelectModal');
  const difficultyBasicBtn = document.getElementById('difficultyBasic');
  const difficultyIntermediateBtn = document.getElementById('difficultyIntermediate');
  const difficultyAdvancedBtn = document.getElementById('difficultyAdvanced');
  const difficultyMasteryBtn = document.getElementById('difficultyMastery');
  const cancelDifficultySelectBtn = document.getElementById('cancelDifficultySelect');

  // 強制難易度変更モーダル
  const forceLevelChangeModal = document.getElementById('forceLevelChangeModal');
  const forceLevelWarning = document.getElementById('forceLevelWarning');
  const forceLevelSelect = document.getElementById('forceLevelSelect');
  const confirmForceLevelChangeBtn = document.getElementById('confirmForceLevelChange');
  const cancelForceLevelChangeBtn = document.getElementById('cancelForceLevelChange');
  
  const forceLevelConfirmModal = document.getElementById('forceLevelConfirmModal');
  const forceLevelConfirmMessage = document.getElementById('forceLevelConfirmMessage');
  const finalConfirmForceLevelChangeBtn = document.getElementById('finalConfirmForceLevelChange');
  const cancelForceLevelConfirmBtn = document.getElementById('cancelForceLevelConfirm');
  
  let currentForceLevelBookId = null;
  let currentForceLevelBookName = '';
  let currentForceLevelOldLevel = '';
  let selectedNewLevel = '';

  // カスタマイズ学習モーダル
  const customStudyModal = document.getElementById('customStudyModal');
  const startCustomStudyBtn = document.getElementById('startCustomStudy');
  const cancelCustomStudyBtn = document.getElementById('cancelCustomStudy');
  
  // カスタマイズ学習チェックボックス
  const customBasic = document.getElementById('customBasic');
  const customIntermediate = document.getElementById('customIntermediate');
  const customSubMeanings = document.getElementById('customSubMeanings');
  const customDerivedWords = document.getElementById('customDerivedWords');
  const customSynonyms = document.getElementById('customSynonyms');
  const customAdvanced = document.getElementById('customAdvanced');
  const customExamples = document.getElementById('customExamples');
  const customChunks = document.getElementById('customChunks');
  const customPhrases = document.getElementById('customPhrases');
  const customCompletion = document.getElementById('customCompletion');

  // 難易度の順序を定義
  const difficultyOrder = ['初級', '中級', '上級', '完成'];
  const difficultyButtonMap = {
    '初級': difficultyBasicBtn,
    '中級': difficultyIntermediateBtn,
    '上級': difficultyAdvancedBtn,
    '完成': difficultyMasteryBtn
  };

  // select.jsから呼び出すための関数を公開（手動/CSV選択モーダルを開く）
  window.triggerAddMethodModal = function(bookId) {
    currentAddMethodBookId = bookId;
    currentAddMethodLevel = null; // level情報は不要
    addMethodModal.classList.add('show');
  };

  // 難易度ボタンを有効/無効に設定する関数
  function updateDifficultyButtons(currentLevel) {
    const currentIndex = difficultyOrder.indexOf(currentLevel);
    
    difficultyOrder.forEach((level, index) => {
      const btn = difficultyButtonMap[level];
      if (index <= currentIndex) {
        // 現在の難易度以下は有効
        btn?.removeAttribute('disabled');
        btn?.classList.remove('disabled-btn');
      } else {
        // 現在の難易度より高い難易度は無効
        btn?.setAttribute('disabled', 'disabled');
        btn?.classList.add('disabled-btn');
      }
    });
  }

  // 追加時はすべて選択可能にする
  function enableAllDifficultyButtons() {
    difficultyOrder.forEach(level => {
      const btn = difficultyButtonMap[level];
      btn?.removeAttribute('disabled');
      btn?.classList.remove('disabled-btn');
    });
  }

  // 今日の学習ボタンの状態を更新
  async function updateTodayStudyButton(bookId, bookLevel) {
    const todayBtn = document.getElementById('studyMethodToday');
    if (!todayBtn) return;
    
    try {
      // 復習対象のカードをチェック
      const response = await fetch(`/api/wordnote/cards/${bookId}`);
      if (!response.ok) {
        todayBtn.disabled = true;
        todayBtn.classList.add('method-btn-disabled');
        return;
      }
      
      const data = await response.json();
      const cards = data.cards || [];
      const level = data.level || bookLevel || '初級';
      
      // 今日の日付
      const today = new Date().toISOString().split('T')[0];
      const levelOrder = ['初級', '中級', '上級', '完成'];
      const bookLevelIndex = levelOrder.indexOf(level);
      
      // 復習対象のカードをカウント
      const todayCards = cards.filter(card => {
        const cardLevelIndex = levelOrder.indexOf(card.currentLevel || '初級');
        if (cardLevelIndex > bookLevelIndex) return false;
        
        // infoPlusProgressに基づいてフィルタリング
        const progress = card.infoPlusProgress || 0;
        if (level === '初級' && progress !== 0) return false;
        if (level === '中級' && progress > 3) return false;
        if (level === '上級' && progress > 6) return false;
        
        const reviewDate = card.reviewDate;
        if (!reviewDate) return true;
        if (reviewDate > today) return false;
        
        // infoPlusProgressに対応する情報が入力されているかチェック
        if (!validateCardForIndex(card)) return false;
        
        return true;
      });
      
      if (todayCards.length === 0) {
        todayBtn.disabled = true;
        todayBtn.classList.add('method-btn-disabled');
        todayBtn.innerHTML = `
          <div class="method-title">今日の学習</div>
          <div class="method-description">✓ 学習完了！復習する単語はありません</div>
        `;
      } else {
        todayBtn.disabled = false;
        todayBtn.classList.remove('method-btn-disabled');
        todayBtn.innerHTML = `
          <div class="method-title">今日の学習</div>
          <div class="method-description">復習日が今日の単語を学習します（${todayCards.length}語）</div>
        `;
      }
    } catch (error) {
      console.error('Error checking today study availability:', error);
      todayBtn.disabled = true;
      todayBtn.classList.add('method-btn-disabled');
    }
  }

  // 単語本一覧を読み込む
  async function loadBooks() {
    try {
      const response = await fetch('/api/wordnote/books');
      if (!response.ok) throw new Error('Failed to fetch books');
      
      const books = await response.json();
      renderBooks(books);
    } catch (error) {
      console.error('Error loading books:', error);
      booksList.innerHTML = '<p style="color: #d32f2f;">単語本の読み込みに失敗しました</p>';
    }
  }

  // 単語本を表示
  function renderBooks(books) {
    if (books.length === 0) {
      booksList.innerHTML = '<p style="text-align: center; color: #666;">単語本がまだありません。「単語本の作成」から作成してください。</p>';
      return;
    }

    // 設定値を取得
    const studyStartPercentage = parseInt(localStorage.getItem('studyStartPercentage') || '20');
    const levelUpThreshold = parseInt(localStorage.getItem('levelUpProgressThreshold') || '60');

    booksList.innerHTML = books.map(book => {
      const cardCount = book._count?.cards || 0;
      const maxSize = book.maxSize || 50;
      const isFull = cardCount >= maxSize;
      const countClass = isFull ? 'full' : '';
      
      // 単語本の難易度を表示
      const bookLevel = book.level || '未設定';
      
      // 進捗度を計算（新しい計算方法）
      const cards = book.cards || [];
      let progress = 0;
      if (cards.length > 0) {
        // 難易度による分母
        const denominatorMap = {
          '初級': 1,
          '中級': 4,
          '上級': 7,
          '完成': 8
        };
        const denominator = denominatorMap[bookLevel] || 1;
        const maxPerCard = 100 / cards.length;
        
        // 全単語の進捗度を合計
        const totalProgress = cards.reduce((sum, card) => {
          const infoPlusProgress = card.infoPlusProgress || 0;
          
          // 上限処理: infoPlusProgressが分母を超えている場合は分母の値を使う
          const cappedProgress = Math.min(infoPlusProgress, denominator);
          
          const cardProgress = maxPerCard * (cappedProgress / denominator);
          return sum + cardProgress;
        }, 0);
        
        progress = Math.round(totalProgress);
      }
      
      // 学習可能判定: 単語数が設定割合以上
      const canStudy = (cardCount / maxSize * 100) >= studyStartPercentage;
      
      // UPボタン表示判定: 進捗度が閾値以上かつ最高難易度でない
      const canLevelUp = bookLevel !== '完成';
      const showUpButton = canLevelUp && progress >= levelUpThreshold;
      const upButtonHtml = showUpButton 
        ? `<button class="up-btn" data-book-id="${book.id}" data-book-name="${book.name}" data-current-level="${bookLevel}">UP</button>` 
        : '';
      
      return `
        <div class="book-container">
          <a class="book-link" data-book-id="${book.id}" href="初級/display.html">
            <img class="book-img" src="book.png" alt="${book.name}">
            <div class="book-info">
              <div class="label">${book.name}</div>
              <div class="book-card-count ${countClass}">${cardCount}/${maxSize}</div>
              <div class="book-difficulty-info" style="font-size: 0.85em; color: #666; margin-top: 4px;">難易度: ${bookLevel} | 進捗度: ${progress}%</div>
            </div>
          </a>
          <div class="book-actions">
            ${upButtonHtml}
            <button class="info-plus-btn" type="button" data-book-id="${book.id}" data-book-level="${book.level}">情報を追加</button>
            <a class="study-btn ${canStudy ? '' : 'disabled'}" href="${canStudy ? '初級/display.html' : '#'}" data-book-id="${book.id}" ${canStudy ? '' : 'style="pointer-events: none; opacity: 0.5;"'}>学習</a>
            <div class="hamburger-menu">
              <button class="hamburger-btn" data-book-id="${book.id}">
                <span></span>
                <span></span>
                <span></span>
              </button>
              <div class="dropdown-menu" data-book-id="${book.id}">
                <button class="dropdown-item book-settings" data-book-id="${book.id}" data-book-name="${book.name}" data-book-level="${book.level}" data-book-maxsize="${maxSize}">設定</button>
                <button class="dropdown-item csv-export" data-book-id="${book.id}">CSVへ出力</button>
                <button class="dropdown-item danger delete-book" data-book-id="${book.id}" data-book-name="${book.name}">削除</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 情報を追加ボタンのクリックイベント（display.htmlと同じ挙動：モーダル表示）
    document.querySelectorAll('.info-plus-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const bookId = btn.dataset.bookId;
        if (bookId) {
          localStorage.setItem('current_wordnote_book_id', bookId);
        }
        if (window.openInfoPlusModal) {
          window.openInfoPlusModal();
        } else {
          alert('情報追加モーダルを開けません。再読み込みしてください。');
        }
      });
    });

    // 学習ボタンのクリックイベント
    document.querySelectorAll('.study-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // 学習不可の場合は何もしない
        if (btn.classList.contains('disabled')) {
          const studyStartPercentage = parseInt(localStorage.getItem('studyStartPercentage') || '20');
          alert(`学習を開始するには、単語本の${studyStartPercentage}%以上に単語を追加してください。`);
          return;
        }
        
        const bookId = btn.dataset.bookId;
        
        // 最新の単語本情報を取得して難易度を確認
        try {
          const response = await fetch(`/api/wordnote/books/${bookId}`);
          if (!response.ok) throw new Error('Failed to fetch book');
          const bookData = await response.json();
          const level = bookData.level || '初級';
          
          currentStudyBookId = bookId;
          currentStudyLevel = level;
          
          // 今日の学習ボタンの状態を更新
          await updateTodayStudyButton(bookId, level);
          
          studyMethodModal.classList.add('show');
        } catch (error) {
          console.error('Error fetching book data:', error);
          alert('単語本の情報取得に失敗しました');
        }
      });
    });

    // 表示ボタンのクリックイベント
    document.querySelectorAll('.book-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const bookId = link.dataset.bookId;
        localStorage.setItem('current_wordnote_book_id', bookId);
      });
    });

    // ハンバーガーメニューのイベント
    document.querySelectorAll('.hamburger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        const dropdown = document.querySelector(`.dropdown-menu[data-book-id="${bookId}"]`);
        
        // 他のメニューを閉じる
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
          if (menu !== dropdown) menu.classList.remove('show');
        });
        
        dropdown.classList.toggle('show');
      });
    });

    // 名前変更ボタン
    document.querySelectorAll('.rename-book').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        const bookName = btn.dataset.bookName;
        
        currentRenameBookId = bookId;
        document.getElementById('newBookName').value = bookName;
        renameModal.classList.add('show');
        
        // メニューを閉じる
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
      });
    });

    // 削除ボタン（モーダルで確認）
    document.querySelectorAll('.delete-book').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        const bookName = btn.dataset.bookName;

        currentDeleteBookId = bookId;
        currentDeleteBookName = bookName;
        if (deleteBookMessage) {
          deleteBookMessage.textContent = `「${bookName}」を削除しますか？この操作は取り消せません。`;
        }
        deleteBookModal?.classList.add('show');

        // メニューを閉じる
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
      });
    });

    // CSVから出力ボタン
    document.querySelectorAll('.csv-export').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        // メニューを閉じる
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
        // CSV出力関数を呼び出し
        if (window.exportWordbookAsCSV) {
          await window.exportWordbookAsCSV(bookId);
        } else {
          alert('CSV出力機能の読み込みに失敗しました');
        }
      });
    });

    // 設定ボタン
    document.querySelectorAll('.book-settings').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        const bookName = btn.dataset.bookName;
        const bookLevel = btn.dataset.bookLevel;
        const bookMaxSize = btn.dataset.bookMaxsize;
        
        // メニューを閉じる
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
        
        // 設定モーダルを開く
        openBookSettingsModal(bookId, bookName, bookLevel, parseInt(bookMaxSize));
      });
    });

    // 復習日設定ボタン
    document.querySelectorAll('.review-settings').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        const bookName = btn.dataset.bookName;
        
        // メニューを閉じる
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
        
        // 復習日設定モーダルを開く
        openReviewSettingsModal(bookId, bookName);
      });
    });
    
    // 強制難易度変更ボタン
    document.querySelectorAll('.force-level-change').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const bookId = btn.dataset.bookId;
        const bookName = btn.dataset.bookName;
        const currentLevel = btn.dataset.currentLevel;
        
        // メニューを閉じる
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
        
        // 難易度選択モーダルを開く
        openForceLevelChangeModal(bookId, bookName, currentLevel);
      });
    });
    
    // UPボタン
    document.querySelectorAll('.up-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const bookId = btn.dataset.bookId;
        const bookName = btn.dataset.bookName;
        const currentLevel = btn.dataset.currentLevel;
        
        // 次の難易度を決定
        const levelMap = {
          '初級': '中級',
          '中級': '上級',
          '上級': '完成'
        };
        const nextLevel = levelMap[currentLevel];
        
        if (!nextLevel) {
          alert('これ以上難易度を上げることができません。');
          return;
        }
        
        if (!confirm(`「${bookName}」の難易度を${currentLevel}から${nextLevel}に上げますか？`)) {
          return;
        }
        
        try {
          const response = await fetch(`/api/wordnote/books/${bookId}/level`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: nextLevel })
          });
          
          if (!response.ok) {
            throw new Error('Failed to update book level');
          }
          
          alert(`難易度を${nextLevel}に更新しました`);
          await loadBooks(); // 再読み込み
        } catch (error) {
          console.error('Error updating book level:', error);
          alert('難易度の更新に失敗しました');
        }
      });
    });
  }

  // メニュー外をクリックしたら閉じる
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
  });

  // モーダルを開く
  createBtn?.addEventListener('click', () => {
    modal.classList.add('show');
  });

  // 今日の学習ボタン
  todayStudyBtn?.addEventListener('click', async () => {
    try {
      // すべての単語本を取得
      const response = await fetch('/api/wordnote/books');
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      
      const books = await response.json();
      
      // 各単語本から今日学習するべき単語を収集
      let totalTodayCards = 0;
      for (const book of books) {
        const cardsResponse = await fetch(`/api/wordnote/cards/${book.id}`);
        if (cardsResponse.ok) {
          const data = await cardsResponse.json();
          const cards = data.cards || [];
          const bookLevel = book.level || '初級';
          
          // 今日の学習対象カードをカウント
          const today = new Date().toISOString().split('T')[0];
          const levelOrder = ['初級', '中級', '上級', '完成'];
          const bookLevelIndex = levelOrder.indexOf(bookLevel);
          
          const todayCards = cards.filter(card => {
            const cardLevelIndex = levelOrder.indexOf(card.currentLevel || '初級');
            if (cardLevelIndex > bookLevelIndex) return false;
            
            const progress = card.infoPlusProgress || 0;
            if (bookLevel === '初級' && progress !== 0) return false;
            if (bookLevel === '中級' && progress > 3) return false;
            if (bookLevel === '上級' && progress > 6) return false;
            
            const reviewDate = card.reviewDate;
            if (!reviewDate) return true;
            if (reviewDate > today) return false;
            
            // infoPlusProgressに対応する情報が入力されているかチェック
            if (!validateCardForIndex(card)) return false;
            
            return true;
          });
          
          totalTodayCards += todayCards.length;
        }
      }
      
      if (totalTodayCards === 0) {
        alert('今日学習する単語はありません！\nすべて復習済みです。');
        return;
      }
      
      // 学習ページに遷移（全単語本モード）
      window.location.href = `study/study.html?studyMethod=allToday`;
      
    } catch (error) {
      console.error('Error loading today study:', error);
      alert('今日の学習データの読み込みに失敗しました');
    }
  });

  // 設定ボタン
  settingsBtn?.addEventListener('click', () => {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      loadDefaultReviewSettings();
      loadWordbookSettings();
      loadStudyControlSettings();
      settingsModal.classList.add('show');
    }
  });

  // モーダルを閉じる
  cancelBtn?.addEventListener('click', () => {
    modal.classList.remove('show');
    form.reset();
  });

  // モーダル外クリックで閉じる
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
      form.reset();
    }
  });

  // 名前変更モーダルを閉じる
  cancelRenameBtn?.addEventListener('click', () => {
    renameModal.classList.remove('show');
    renameForm.reset();
    currentRenameBookId = null;
  });

  // 名前変更モーダル外クリックで閉じる
  renameModal?.addEventListener('click', (e) => {
    if (e.target === renameModal) {
      renameModal.classList.remove('show');
      renameForm.reset();
      currentRenameBookId = null;
    }
  });

  // 削除モーダルを閉じる
  cancelDeleteBookBtn?.addEventListener('click', () => {
    deleteBookModal?.classList.remove('show');
    currentDeleteBookId = null;
    currentDeleteBookName = '';
  });

  deleteBookModal?.addEventListener('click', (e) => {
    if (e.target === deleteBookModal) {
      deleteBookModal.classList.remove('show');
      currentDeleteBookId = null;
      currentDeleteBookName = '';
    }
  });

  // 学習方法モーダルを閉じる
  cancelStudyMethodBtn?.addEventListener('click', () => {
    studyMethodModal.classList.remove('show');
    currentStudyBookId = null;
    currentStudyLevel = null;
  });

  studyMethodModal?.addEventListener('click', (e) => {
    if (e.target === studyMethodModal) {
      studyMethodModal.classList.remove('show');
      currentStudyBookId = null;
      currentStudyLevel = null;
    }
  });

  // 学習方法選択ボタン
  studyMethodTodayBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    // 今日の学習モードで学習ページに遷移
    studyMethodModal.classList.remove('show');
    window.location.href = `study/study.html?bookId=${currentStudyBookId}&studyMethod=today`;
  });

  studyMethodDifficultyBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    // 学習方法モーダルを閉じて難易度選択モーダルを表示
    studyMethodModal.classList.remove('show');
    difficultyContext = 'study';
    // 単語本のレベル以下の難易度のみ有効にする
    updateDifficultyButtons(currentStudyLevel);
    difficultySelectModal.classList.add('show');
  });

  studyMethodRandomBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    // ランダム学習モードで学習ページに遷移
    studyMethodModal.classList.remove('show');
    window.location.href = `study/study.html?bookId=${currentStudyBookId}&studyMethod=random`;
  });

  studyMethodMixedBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    // カスタマイズ学習モーダルを表示
    studyMethodModal.classList.remove('show');
    // チェックボックスをリセット
    resetCustomStudyCheckboxes();
    // 単語本のレベル以下のみ選択可能に
    updateCustomStudyCheckboxes(currentStudyLevel);
    customStudyModal.classList.add('show');
  });

  // カスタマイズ学習モーダルを閉じる
  cancelCustomStudyBtn?.addEventListener('click', () => {
    customStudyModal.classList.remove('show');
    studyMethodModal.classList.add('show');
  });

  customStudyModal?.addEventListener('click', (e) => {
    if (e.target === customStudyModal) {
      customStudyModal.classList.remove('show');
      studyMethodModal.classList.add('show');
    }
  });

  // カスタマイズ学習：チェックボックスのリセット
  function resetCustomStudyCheckboxes() {
    customBasic.checked = false;
    customIntermediate.checked = false;
    customSubMeanings.checked = false;
    customDerivedWords.checked = false;
    customSynonyms.checked = false;
    customAdvanced.checked = false;
    customExamples.checked = false;
    customChunks.checked = false;
    customPhrases.checked = false;
    customCompletion.checked = false;
    document.getElementById('customEvalNo').checked = true;
  }

  // カスタマイズ学習：単語本のレベルに応じてチェックボックスを制限
  function updateCustomStudyCheckboxes(bookLevel) {
    const levelIndex = difficultyOrder.indexOf(bookLevel);
    
    // 初級：常に有効
    customBasic.disabled = false;
    
    // 中級関連
    if (levelIndex >= 1) {
      customIntermediate.disabled = false;
      customSubMeanings.disabled = false;
      customDerivedWords.disabled = false;
      customSynonyms.disabled = false;
    } else {
      customIntermediate.disabled = true;
      customSubMeanings.disabled = true;
      customDerivedWords.disabled = true;
      customSynonyms.disabled = true;
    }
    
    // 上級関連
    if (levelIndex >= 2) {
      customAdvanced.disabled = false;
      customExamples.disabled = false;
      customChunks.disabled = false;
      customPhrases.disabled = false;
    } else {
      customAdvanced.disabled = true;
      customExamples.disabled = true;
      customChunks.disabled = true;
      customPhrases.disabled = true;
    }
    
    // 完成
    if (levelIndex >= 3) {
      customCompletion.disabled = false;
    } else {
      customCompletion.disabled = true;
    }
  }

  // カスタマイズ学習：中級の連動ロジック
  const intermediateChildren = [customSubMeanings, customDerivedWords, customSynonyms];
  
  customIntermediate?.addEventListener('change', () => {
    intermediateChildren.forEach(child => {
      child.checked = customIntermediate.checked;
    });
  });

  intermediateChildren.forEach(child => {
    child?.addEventListener('change', () => {
      // 子項目のいずれかがチェックされていたら親もチェック
      const anyChecked = intermediateChildren.some(c => c.checked);
      customIntermediate.checked = anyChecked;
    });
  });

  // カスタマイズ学習：上級の連動ロジック
  const advancedChildren = [customExamples, customChunks, customPhrases];
  
  customAdvanced?.addEventListener('change', () => {
    advancedChildren.forEach(child => {
      child.checked = customAdvanced.checked;
    });
  });

  advancedChildren.forEach(child => {
    child?.addEventListener('change', () => {
      // 子項目のいずれかがチェックされていたら親もチェック
      const anyChecked = advancedChildren.some(c => c.checked);
      customAdvanced.checked = anyChecked;
    });
  });

  // カスタマイズ学習：学習ボタン
  startCustomStudyBtn?.addEventListener('click', () => {
    // 少なくとも1つの難易度が選択されているかチェック
    const hasBasic = customBasic?.checked;
    const hasIntermediate = customIntermediate?.checked;
    const hasAdvanced = customAdvanced?.checked;
    const hasCompletion = customCompletion?.checked;
    
    if (!hasBasic && !hasIntermediate && !hasAdvanced && !hasCompletion) {
      alert('少なくとも1つの学習項目を選択してください');
      return;
    }
    
    // オプションをURLパラメータとして渡す
    const options = {
      basic: hasBasic || false,
      intermediate: hasIntermediate || false,
      basicMeaning: false, // 基本の意味は常に表示（モザイクなし）
      subMeanings: customSubMeanings?.checked || false,
      antonyms: customSubMeanings?.checked || false, // サブの意味+対義語チェックボックスで両方を制御
      derivedWords: customDerivedWords?.checked || false,
      synonyms: customSynonyms?.checked || false,
      advanced: hasAdvanced || false,
      examples: customExamples?.checked || false,
      chunks: customChunks?.checked || false,
      phrases: customPhrases?.checked || false,
      completion: hasCompletion || false,
      evaluation: document.getElementById('customEvalYes')?.checked || false
    };
    
    const optionsParam = encodeURIComponent(JSON.stringify(options));
    customStudyModal.classList.remove('show');
    window.location.href = `study/study.html?bookId=${currentStudyBookId}&studyMethod=custom&options=${optionsParam}`;
  });

  // 難易度選択モーダルを閉じる
  cancelDifficultySelectBtn?.addEventListener('click', () => {
    difficultySelectModal.classList.remove('show');
    if (difficultyContext === 'study') {
      studyMethodModal.classList.add('show');
    } else if (difficultyContext === 'add') {
      addMethodModal.classList.add('show');
    }
    difficultyContext = null;
  });

  difficultySelectModal?.addEventListener('click', (e) => {
    if (e.target === difficultySelectModal) {
      difficultySelectModal.classList.remove('show');
      if (difficultyContext === 'study') {
        studyMethodModal.classList.add('show');
      } else if (difficultyContext === 'add') {
        addMethodModal.classList.add('show');
      }
      difficultyContext = null;
    }
  });

  // 難易度選択ボタン
  difficultyBasicBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (difficultyBasicBtn?.disabled) return;
    if (difficultyContext === 'study') {
      window.location.href = `study/study.html?bookId=${currentStudyBookId}&difficulty=初級`;
    } else if (difficultyContext === 'add') {
      if (!currentAddMethodBookId) return;
      localStorage.setItem('current_wordnote_book_id', currentAddMethodBookId);
      localStorage.setItem('selected_difficulty', '初級');
      difficultySelectModal.classList.remove('show');
      difficultyContext = null;
      window.location.href = `初級/input.html`;
    }
  });

  difficultyIntermediateBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (difficultyIntermediateBtn?.disabled) return;
    if (difficultyContext === 'study') {
      window.location.href = `study/study.html?bookId=${currentStudyBookId}&difficulty=中級`;
    } else if (difficultyContext === 'add') {
      if (!currentAddMethodBookId) return;
      localStorage.setItem('current_wordnote_book_id', currentAddMethodBookId);
      localStorage.setItem('selected_difficulty', '中級');
      difficultySelectModal.classList.remove('show');
      difficultyContext = null;
      window.location.href = `初級/input.html`;
    }
  });

  difficultyAdvancedBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (difficultyAdvancedBtn?.disabled) return;
    if (difficultyContext === 'study') {
      window.location.href = `study/study.html?bookId=${currentStudyBookId}&difficulty=上級`;
    } else if (difficultyContext === 'add') {
      if (!currentAddMethodBookId) return;
      localStorage.setItem('current_wordnote_book_id', currentAddMethodBookId);
      localStorage.setItem('selected_difficulty', '上級');
      difficultySelectModal.classList.remove('show');
      difficultyContext = null;
      window.location.href = `初級/input.html`;
    }
  });

  difficultyMasteryBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (difficultyMasteryBtn?.disabled) return;
    if (difficultyContext === 'study') {
      window.location.href = `study/study.html?bookId=${currentStudyBookId}&difficulty=完成`;
    } else if (difficultyContext === 'add') {
      if (!currentAddMethodBookId) return;
      localStorage.setItem('current_wordnote_book_id', currentAddMethodBookId);
      localStorage.setItem('selected_difficulty', '完成');
      difficultySelectModal.classList.remove('show');
      difficultyContext = null;
      window.location.href = `初級/input.html`;
    }
  });

  // 削除確定
  confirmDeleteBookBtn?.addEventListener('click', async () => {
    if (!currentDeleteBookId) return;
    try {
      const response = await fetch(`/api/wordnote/books/${currentDeleteBookId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || '削除に失敗しました');
      }

      deleteBookModal?.classList.remove('show');
      currentDeleteBookId = null;
      currentDeleteBookName = '';
      loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      alert(error.message || '削除に失敗しました');
    }
  });

  // 名前変更フォーム送信
  renameForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentRenameBookId) return;
    
    const newName = document.getElementById('newBookName').value.trim();
    
    if (!newName) {
      alert('名前を入力してください');
      return;
    }
    
    try {
      const response = await fetch(`/api/wordnote/books/${currentRenameBookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename book');
      }
      
      alert('単語本の名前を変更しました！');
      renameModal.classList.remove('show');
      renameForm.reset();
      currentRenameBookId = null;
      loadBooks();
    } catch (error) {
      console.error('Error renaming book:', error);
      alert('名前変更に失敗しました: ' + error.message);
    }
  });

  // 単語追加方法選択モーダルのイベント
  addMethodNormalBtn?.addEventListener('click', () => {
    if (!currentAddMethodBookId) return;

    // 学習と同じ流れで難易度選択を行う
    difficultyContext = 'add';
    enableAllDifficultyButtons();
    addMethodModal.classList.remove('show');
    difficultySelectModal.classList.add('show');
  });

  addMethodCSVBtn?.addEventListener('click', async () => {
    if (!currentAddMethodBookId) return;
    
    // 追加方法モーダルを閉じてCSVインポートモーダルを表示
    addMethodModal.classList.remove('show');
    currentCsvImportBookId = currentAddMethodBookId;
    
    // リセット
    selectedCsvFile = null;
    csvFileInput.value = '';
    selectedFileName.textContent = '';
    confirmCsvImport.disabled = true;
    
    csvImportModal.classList.add('show');
  });

  cancelAddMethodBtn?.addEventListener('click', () => {
    addMethodModal.classList.remove('show');
    currentAddMethodBookId = null;
    currentAddMethodLevel = null;
    if (difficultyContext === 'add') difficultyContext = null;
  });

  // 選択肢モーダル外をクリックしたら閉じる
  addMethodModal?.addEventListener('click', (e) => {
    if (e.target === addMethodModal) {
      addMethodModal.classList.remove('show');
      currentAddMethodBookId = null;
      currentAddMethodLevel = null;
      if (difficultyContext === 'add') difficultyContext = null;
    }
  });
  
  // CSVインポートモーダルのイベント
  selectCsvFileBtn?.addEventListener('click', () => {
    csvFileInput?.click();
  });
  
  csvFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedCsvFile = file;
      selectedFileName.textContent = `選択されたファイル: ${file.name}`;
      confirmCsvImport.disabled = false;
    }
  });
  
  confirmCsvImport?.addEventListener('click', async () => {
    if (!selectedCsvFile || !currentCsvImportBookId) return;
    
    csvImportModal.classList.remove('show');
    
    if (window.importWordbookFromCSV) {
      await window.importWordbookFromCSV(currentCsvImportBookId, selectedCsvFile);
    } else {
      alert('CSV入力機能の読み込みに失敗しました');
    }
    
    // リセット
    currentCsvImportBookId = null;
    currentAddMethodBookId = null;
    currentAddMethodLevel = null;
    selectedCsvFile = null;
  });
  
  cancelCsvImport?.addEventListener('click', () => {
    csvImportModal.classList.remove('show');
    currentCsvImportBookId = null;
    selectedCsvFile = null;
  });
  
  csvImportModal?.addEventListener('click', (e) => {
    if (e.target === csvImportModal) {
      csvImportModal.classList.remove('show');
      currentCsvImportBookId = null;
      selectedCsvFile = null;
    }
  });

  // フォーム送信
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('bookName').value.trim();
    // レベルは設定から取得（デフォルトは「初級」）
    const level = localStorage.getItem('defaultBookLevel') || '初級';
    
    if (!name) {
      alert('単語本の名前を入力してください');
      return;
    }
    
    // 復習日設定を取得
    const reviewBase = parseFloat(localStorage.getItem('defaultReviewBase')) || 0.5;
    const reviewGrowth = parseFloat(localStorage.getItem('defaultReviewGrowth')) || 2.0;
    
    // 単語本設定を取得
    const maxSize = parseInt(localStorage.getItem('defaultBookMaxSize')) || 50;
    
    // 評価値変更設定を取得してJSON形式に変換
    const evaluationChangeMode = localStorage.getItem('defaultEvaluationChangeMode') || 'none';
    const evaluationChangeValue = parseFloat(localStorage.getItem('defaultEvaluationChangeValue')) || 1.0;
    
    // 情報追加判定の閾値を取得
    const infoPlusThreshold = parseFloat(localStorage.getItem('defaultInfoPlusThreshold')) || 3.5;
    
    let evaluationChange = null;
    if (evaluationChangeMode === 'change') {
      evaluationChange = JSON.stringify({
        mode: 'change',
        value: evaluationChangeValue
      });
    } else if (evaluationChangeMode === 'none') {
      evaluationChange = JSON.stringify({
        mode: 'none',
        value: 0
      });
    }
    
    try {
      const response = await fetch('/api/wordnote/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          level,
          reviewBase,
          reviewGrowth,
          maxSize,
          evaluationChange,
          infoPlusThreshold
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create book');
      }
      
      modal.classList.remove('show');
      form.reset();
      loadBooks();
    } catch (error) {
      console.error('Error creating book:', error);
      alert('作成に失敗しました: ' + error.message);
    }
  });

  // 初期読み込み
  loadBooks();

  // ============================================
  // 復習日設定モーダル
  // ============================================
  const reviewSettingsOverlay = document.getElementById('reviewSettingsOverlay');
  const reviewSettingsBookName = document.getElementById('reviewSettingsBookName');
  const reviewSettingsBase = document.getElementById('reviewSettingsBase');
  const reviewSettingsGrowth = document.getElementById('reviewSettingsGrowth');
  const simulationTableBody = document.getElementById('simulationTableBody');
  const saveReviewSettingsBtn = document.getElementById('saveReviewSettings');
  const cancelReviewSettingsBtn = document.getElementById('cancelReviewSettings');
  
  let currentReviewSettingsBookId = null;

  // シミュレーションテーブルを更新
  function updateSimulationTable() {
    const base = parseFloat(reviewSettingsBase?.value) || 0.5;
    const growth = parseFloat(reviewSettingsGrowth?.value) || 2.0;
    
    if (!simulationTableBody) return;
    
    let html = '';
    for (let level = 1; level <= 4; level++) {
      const days = base * Math.pow(growth, level);
      html += `
        <tr>
          <td>${level}</td>
          <td>${days.toFixed(1)}日</td>
        </tr>
      `;
    }
    simulationTableBody.innerHTML = html;
  }

  // 復習日設定モーダルを開く
  window.openReviewSettingsModal = async function(bookId, bookName) {
    currentReviewSettingsBookId = bookId;
    
    // 本の名前を表示
    if (reviewSettingsBookName) {
      reviewSettingsBookName.textContent = `「${bookName}」`;
    }
    
    // データベースから設定を読み込む
    try {
      const response = await fetch(`/api/wordnote/books/${bookId}/review-settings`);
      if (response.ok) {
        const { reviewBase, reviewGrowth } = await response.json();
        if (reviewSettingsBase) reviewSettingsBase.value = reviewBase;
        if (reviewSettingsGrowth) reviewSettingsGrowth.value = reviewGrowth;
      } else {
        // デフォルト値
        if (reviewSettingsBase) reviewSettingsBase.value = 0.5;
        if (reviewSettingsGrowth) reviewSettingsGrowth.value = 2.0;
      }
    } catch (error) {
      console.error('Error loading review settings:', error);
      // デフォルト値
      if (reviewSettingsBase) reviewSettingsBase.value = 0.5;
      if (reviewSettingsGrowth) reviewSettingsGrowth.value = 2.0;
    }
    
    // シミュレーションテーブルを更新
    updateSimulationTable();
    
    // モーダルを表示
    if (reviewSettingsOverlay) {
      reviewSettingsOverlay.classList.add('show');
    }
  };

  // 入力値変更時にシミュレーションを更新
  reviewSettingsBase?.addEventListener('input', updateSimulationTable);
  reviewSettingsGrowth?.addEventListener('input', updateSimulationTable);

  // 保存ボタン
  saveReviewSettingsBtn?.addEventListener('click', async () => {
    const base = parseFloat(reviewSettingsBase?.value) || 0.5;
    const growth = parseFloat(reviewSettingsGrowth?.value) || 2.0;
    
    // データベースに保存
    try {
      const response = await fetch(`/api/wordnote/books/${currentReviewSettingsBookId}/review-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewBase: base,
          reviewGrowth: growth
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save review settings');
      }
      
      alert('復習日設定を保存しました');
      
      // モーダルを閉じる
      if (reviewSettingsOverlay) {
        reviewSettingsOverlay.classList.remove('show');
      }
      currentReviewSettingsBookId = null;
    } catch (error) {
      console.error('Error saving review settings:', error);
      alert('復習日設定の保存に失敗しました');
    }
  });

  // キャンセルボタン
  cancelReviewSettingsBtn?.addEventListener('click', () => {
    if (reviewSettingsOverlay) {
      reviewSettingsOverlay.classList.remove('show');
    }
    currentReviewSettingsBookId = null;
  });

  // 強制難易度変更モーダルを開く関数
  function openForceLevelChangeModal(bookId, bookName, currentLevel) {
    currentForceLevelBookId = bookId;
    currentForceLevelBookName = bookName;
    currentForceLevelOldLevel = currentLevel;
    
    // 警告メッセージを設定
    if (forceLevelWarning) {
      forceLevelWarning.textContent = `単語本「${bookName}」の難易度を強制的に変更します。現在: ${currentLevel}`;
    }
    
    // セレクトボックスをリセット
    if (forceLevelSelect) {
      forceLevelSelect.value = '';
    }
    
    // モーダルを表示
    forceLevelChangeModal?.classList.add('show');
  }
  
  // 変更するボタン
  confirmForceLevelChangeBtn?.addEventListener('click', () => {
    const newLevel = forceLevelSelect?.value;
    
    if (!newLevel) {
      alert('難易度を選択してください');
      return;
    }
    
    selectedNewLevel = newLevel;
    
    // 最初のモーダルを閉じる
    forceLevelChangeModal?.classList.remove('show');
    
    // 確認メッセージを設定
    if (forceLevelConfirmMessage) {
      forceLevelConfirmMessage.textContent = `本当に「${currentForceLevelBookName}」の難易度を「${currentForceLevelOldLevel}」から「${selectedNewLevel}」に変更しますか？`;
    }
    
    // 確認モーダルを表示
    forceLevelConfirmModal?.classList.add('show');
  });
  
  // 最終確認の変更するボタン
  finalConfirmForceLevelChangeBtn?.addEventListener('click', async () => {
    // 確認モーダルを閉じる
    forceLevelConfirmModal?.classList.remove('show');
    
    // APIで更新
    await updateBookLevel(currentForceLevelBookId, selectedNewLevel, currentForceLevelBookName);
    
    // リセット
    currentForceLevelBookId = null;
    currentForceLevelBookName = '';
    currentForceLevelOldLevel = '';
    selectedNewLevel = '';
  });
  
  // 最初のモーダルのキャンセルボタン
  cancelForceLevelChangeBtn?.addEventListener('click', () => {
    forceLevelChangeModal?.classList.remove('show');
    currentForceLevelBookId = null;
    currentForceLevelBookName = '';
    currentForceLevelOldLevel = '';
  });
  
  // 確認モーダルのキャンセルボタン
  cancelForceLevelConfirmBtn?.addEventListener('click', () => {
    forceLevelConfirmModal?.classList.remove('show');
    selectedNewLevel = '';
    // 最初のモーダルに戻る
    forceLevelChangeModal?.classList.add('show');
  });
  
  // モーダル外クリックで閉じる
  forceLevelChangeModal?.addEventListener('click', (e) => {
    if (e.target === forceLevelChangeModal) {
      forceLevelChangeModal.classList.remove('show');
      currentForceLevelBookId = null;
      currentForceLevelBookName = '';
      currentForceLevelOldLevel = '';
    }
  });
  
  forceLevelConfirmModal?.addEventListener('click', (e) => {
    if (e.target === forceLevelConfirmModal) {
      forceLevelConfirmModal.classList.remove('show');
      selectedNewLevel = '';
    }
  });
  
  async function updateBookLevel(bookId, newLevel, bookName) {
    try {
      const response = await fetch(`/api/wordnote/books/${bookId}/level`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: newLevel })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update book level');
      }
      
      alert(`「${bookName}」の難易度を${newLevel}に変更しました`);
      await loadBooks(); // 再読み込み
    } catch (error) {
      console.error('Error updating book level:', error);
      alert('難易度の変更に失敗しました');
    }
  }

  // モーダル外をクリックしたら閉じる
  reviewSettingsOverlay?.addEventListener('click', (e) => {
    if (e.target === reviewSettingsOverlay) {
      reviewSettingsOverlay.classList.remove('show');
      currentReviewSettingsBookId = null;
    }
  });

  // ============================================
  // 個別単語本設定モーダル
  // ============================================
  const bookSettingsModal = document.getElementById('bookSettingsModal');
  const bookSettingsTitle = document.getElementById('bookSettingsTitle');
  const closeBookSettingsBtn = document.getElementById('closeBookSettings');
  const bookReviewBase = document.getElementById('bookReviewBase');
  const bookReviewGrowth = document.getElementById('bookReviewGrowth');
  const bookSimulationBody = document.getElementById('bookSimulationBody');
  const saveBookReviewSettingsBtn = document.getElementById('saveBookReviewSettings');
  const bookNameInput = document.getElementById('bookNameInput');
  const bookMaxSizeInput = document.getElementById('bookMaxSizeInput');
  const currentBookLevel = document.getElementById('currentBookLevel');
  const bookLevelSelect = document.getElementById('bookLevelSelect');
  const bookEvaluationChangeModeRadios = document.querySelectorAll('input[name="bookEvaluationChangeMode"]');
  const bookEvaluationChangeValue = document.getElementById('bookEvaluationChangeValue');
  const saveBookSettingsBtn = document.getElementById('saveBookSettings');
  const bookTabBtns = bookSettingsModal?.querySelectorAll('.tab-btn');
  const bookTabPanels = bookSettingsModal?.querySelectorAll('.tab-panel');
  
  let currentBookSettingsId = null;

  // 個別単語本設定モーダルを開く
  async function openBookSettingsModal(bookId, bookName, bookLevel, bookMaxSize) {
    currentBookSettingsId = bookId;
    bookSettingsTitle.textContent = `「${bookName}」の設定`;
    
    // 単語本タブの初期値を設定
    bookNameInput.value = bookName;
    bookMaxSizeInput.value = bookMaxSize;
    currentBookLevel.textContent = bookLevel;
    bookLevelSelect.value = bookLevel;
    
    // 評価値変更設定と情報追加判定を取得
    try {
      const bookResponse = await fetch(`/api/wordnote/books/${bookId}`);
      if (bookResponse.ok) {
        const bookData = await bookResponse.json();
        const evaluationChangeStr = bookData.evaluationChange;
        
        // 情報追加判定の閾値を設定
        const bookInfoPlusThresholdInput = document.getElementById('bookInfoPlusThreshold');
        if (bookInfoPlusThresholdInput) {
          bookInfoPlusThresholdInput.value = (bookData.infoPlusThreshold ?? 3.5).toFixed(1);
        }
        
        // モーダル内のラジオボタンを直接取得
        const radios = document.querySelectorAll('input[name="bookEvaluationChangeMode"]');
        
        if (!evaluationChangeStr || evaluationChangeStr === '' || evaluationChangeStr === null) {
          // データがない場合は「全体の設定のまま」をデフォルトとする
          radios.forEach(radio => {
            radio.checked = radio.value === 'global';
          });
          if (bookEvaluationChangeValue) {
            bookEvaluationChangeValue.value = '1.0';
          }
        } else {
          try {
            // JSON形式でパース
            const evaluationChange = JSON.parse(evaluationChangeStr);
            
            if (evaluationChange.mode === 'global') {
              radios.forEach(radio => {
                radio.checked = radio.value === 'global';
              });
              if (bookEvaluationChangeValue) {
                bookEvaluationChangeValue.value = '1.0';
              }
            } else if (evaluationChange.mode === 'none') {
              radios.forEach(radio => {
                radio.checked = radio.value === 'none';
              });
              if (bookEvaluationChangeValue) {
                bookEvaluationChangeValue.value = '1.0';
              }
            } else if (evaluationChange.mode === 'change') {
              radios.forEach(radio => {
                radio.checked = radio.value === 'change';
              });
              if (bookEvaluationChangeValue) {
                bookEvaluationChangeValue.value = (evaluationChange.value || 1.0).toFixed(1);
              }
            }
          } catch (e) {
            // JSONパース失敗時は全体設定をデフォルトとする
            console.error('Failed to parse evaluationChange:', e);
            radios.forEach(radio => {
              radio.checked = radio.value === 'global';
            });
            if (bookEvaluationChangeValue) {
              bookEvaluationChangeValue.value = '1.0';
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading book settings:', error);
    }
    
    // 復習日設定を取得
    try {
      const response = await fetch(`/api/wordnote/books/${bookId}/review-settings`);
      if (response.ok) {
        const data = await response.json();
        bookReviewBase.value = data.reviewBase || 0.5;
        bookReviewGrowth.value = data.reviewGrowth || 2.0;
        updateBookSimulationTable();
      }
    } catch (error) {
      console.error('Error loading review settings:', error);
    }
    
    // 最初のタブをアクティブにする
    bookTabBtns?.forEach(b => b.classList.remove('active'));
    bookTabPanels?.forEach(p => p.classList.remove('active'));
    bookTabBtns?.[0]?.classList.add('active');
    bookTabPanels?.[0]?.classList.add('active');
    
    bookSettingsModal?.classList.add('show');
  }

  // シミュレーションテーブルを更新（横並び）
  function updateBookSimulationTable() {
    const base = parseFloat(bookReviewBase?.value) || 0.5;
    const growth = parseFloat(bookReviewGrowth?.value) || 2.0;
    
    if (!bookSimulationBody) return;
    
    const days = [];
    for (let level = 1; level <= 4; level++) {
      const day = base * Math.pow(growth, level);
      days.push(day.toFixed(1));
    }
    bookSimulationBody.innerHTML = `<tr><td>復習日（日後）</td>${days.map(d => `<td>${d}</td>`).join('')}</tr>`;
  }

  // タブ切り替え
  bookTabBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      bookTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      bookTabPanels.forEach(panel => {
        if (panel.id === `${targetTab}-panel`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // 入力値変更時にシミュレーション更新
  bookReviewBase?.addEventListener('input', updateBookSimulationTable);
  bookReviewGrowth?.addEventListener('input', updateBookSimulationTable);

  // 復習日設定を保存
  saveBookReviewSettingsBtn?.addEventListener('click', async () => {
    const base = parseFloat(bookReviewBase.value);
    const growth = parseFloat(bookReviewGrowth.value);
    
    if (isNaN(base) || base < 0.1) {
      alert('基準日数は0.1以上で入力してください。');
      return;
    }
    if (isNaN(growth) || growth < 1.0) {
      alert('成長率は1.0以上で入力してください。');
      return;
    }

    try {
      const response = await fetch(`/api/wordnote/books/${currentBookSettingsId}/review-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewBase: base, reviewGrowth: growth })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save review settings');
      }
      
      alert('復習日設定を保存しました');
    } catch (error) {
      console.error('Error saving review settings:', error);
      alert('保存に失敗しました');
    }
  });

  // 単語本設定を保存
  saveBookSettingsBtn?.addEventListener('click', async () => {
    const newName = bookNameInput.value.trim();
    const newMaxSize = parseInt(bookMaxSizeInput.value);
    const newLevel = bookLevelSelect.value;
    const oldLevel = currentBookLevel.textContent;
    
    // 評価値変更設定を取得
    let newEvaluationChange = '';
    let selectedMode = 'global';
    const radios = document.querySelectorAll('input[name="bookEvaluationChangeMode"]');
    radios.forEach(radio => {
      if (radio.checked) selectedMode = radio.value;
    });
    
    if (selectedMode === 'global') {
      // 全体設定を使用
      newEvaluationChange = JSON.stringify({ mode: 'global', value: 0 });
    } else if (selectedMode === 'none') {
      // 変更しない
      newEvaluationChange = JSON.stringify({ mode: 'none', value: 0 });
    } else if (selectedMode === 'change') {
      // 数値指定
      const value = parseFloat(bookEvaluationChangeValue?.value) || 1.0;
      if (value < 0 || value > 4) {
        alert('減算値は0.0〜4.0の範囲で入力してください。');
        return;
      }
      newEvaluationChange = JSON.stringify({ mode: 'change', value: value });
    }
    
    // 情報追加判定の閾値を取得
    const bookInfoPlusThresholdInput = document.getElementById('bookInfoPlusThreshold');
    const newInfoPlusThreshold = parseFloat(bookInfoPlusThresholdInput?.value);
    
    if (!newName) {
      alert('単語本の名前を入力してください。');
      return;
    }
    if (isNaN(newMaxSize) || newMaxSize < 10) {
      alert('最大単語数は10以上で入力してください。');
      return;
    }
    if (isNaN(newInfoPlusThreshold) || newInfoPlusThreshold < 0 || newInfoPlusThreshold > 4) {
      alert('情報追加判定の閾値は0.0〜4.0の範囲で入力してください。');
      return;
    }
    
    // 難易度変更の確認
    if (newLevel !== oldLevel) {
      if (!confirm(`本当に難易度を「${oldLevel}」から「${newLevel}」に変更しますか？\nこの操作により、単語本の進捗計算が変わります。`)) {
        return;
      }
    }
    
    try {
      // 名前とmaxSizeとevaluationChangeとinfoPlusThresholdを更新
      const updateResponse = await fetch(`/api/wordnote/books/${currentBookSettingsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName, 
          maxSize: newMaxSize, 
          evaluationChange: newEvaluationChange,
          infoPlusThreshold: newInfoPlusThreshold
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update book settings');
      }
      
      // 難易度が変更された場合
      if (newLevel !== oldLevel) {
        const levelResponse = await fetch(`/api/wordnote/books/${currentBookSettingsId}/level`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: newLevel })
        });
        
        if (!levelResponse.ok) {
          throw new Error('Failed to update book level');
        }
      }
      
      alert('設定を保存しました');
      bookSettingsModal.classList.remove('show');
      await loadBooks(); // 再読み込み
    } catch (error) {
      console.error('Error saving book settings:', error);
      alert('保存に失敗しました');
    }
  });

  // モーダルを閉じる
  closeBookSettingsBtn?.addEventListener('click', () => {
    bookSettingsModal?.classList.remove('show');
    currentBookSettingsId = null;
  });

  bookSettingsModal?.addEventListener('click', (e) => {
    if (e.target === bookSettingsModal) {
      bookSettingsModal.classList.remove('show');
      currentBookSettingsId = null;
    }
  });

  // Settings Modal
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettings');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const defaultReviewBaseInput = document.getElementById('defaultReviewBase');
  const defaultReviewGrowthInput = document.getElementById('defaultReviewGrowth');
  const saveDefaultReviewSettingsBtn = document.getElementById('saveDefaultReviewSettings');
  const defaultSimulationBody = document.getElementById('defaultSimulationBody');
  
  // Wordbook Settings
  const defaultBookMaxSizeInput = document.getElementById('defaultBookMaxSize');
  const defaultBookLevelRadios = document.querySelectorAll('input[name="defaultBookLevel"]');
  const saveWordbookSettingsBtn = document.getElementById('saveWordbookSettings');
  
  // Study Control Settings
  const studyStartPercentageInput = document.getElementById('studyStartPercentage');
  const levelUpProgressThresholdInput = document.getElementById('levelUpProgressThreshold');
  const defaultEvaluationChangeModeRadios = document.querySelectorAll('input[name="defaultEvaluationChangeMode"]');
  const defaultEvaluationChangeValue = document.getElementById('defaultEvaluationChangeValue');
  const saveStudyControlSettingsBtn = document.getElementById('saveStudyControlSettings');

  // タブ切り替え
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // アクティブなタブボタンを更新
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // アクティブなタブパネルを更新
      tabPanels.forEach(panel => {
        if (panel.id === `${targetTab}-panel`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // デフォルト復習日設定を読み込む
  function loadDefaultReviewSettings() {
    const defaultBase = localStorage.getItem('defaultReviewBase') || '0.5';
    const defaultGrowth = localStorage.getItem('defaultReviewGrowth') || '2.0';
    if (defaultReviewBaseInput) defaultReviewBaseInput.value = defaultBase;
    if (defaultReviewGrowthInput) defaultReviewGrowthInput.value = defaultGrowth;
    updateDefaultSimulation(parseFloat(defaultBase), parseFloat(defaultGrowth));
  }

  // 単語本設定を読み込む
  function loadWordbookSettings() {
    const maxSize = localStorage.getItem('defaultBookMaxSize') || '50';
    const level = localStorage.getItem('defaultBookLevel') || '初級';
    
    if (defaultBookMaxSizeInput) defaultBookMaxSizeInput.value = maxSize;
    
    defaultBookLevelRadios.forEach(radio => {
      radio.checked = radio.value === level;
    });
  }
  
  // 学習制御設定を読み込む
  function loadStudyControlSettings() {
    const studyStart = localStorage.getItem('studyStartPercentage') || '20';
    const levelUpThreshold = localStorage.getItem('levelUpProgressThreshold') || '60';
    const evaluationChangeMode = localStorage.getItem('defaultEvaluationChangeMode') || 'change';
    const evaluationChangeValue = parseFloat(localStorage.getItem('defaultEvaluationChangeValue')) || 1.0;
    const infoPlusThreshold = parseFloat(localStorage.getItem('defaultInfoPlusThreshold')) || 3.5;
    
    if (studyStartPercentageInput) studyStartPercentageInput.value = studyStart;
    if (levelUpProgressThresholdInput) levelUpProgressThresholdInput.value = levelUpThreshold;
    
    // 情報追加判定の閾値を設定
    const defaultInfoPlusThresholdInput = document.getElementById('defaultInfoPlusThreshold');
    if (defaultInfoPlusThresholdInput) {
      defaultInfoPlusThresholdInput.value = infoPlusThreshold.toFixed(1);
    }
    
    // 評価値変更設定を解析してラジオボタンを設定
    const radios = document.querySelectorAll('input[name="defaultEvaluationChangeMode"]');
    if (evaluationChangeMode === 'none') {
      // 変更しない
      radios.forEach(radio => {
        radio.checked = radio.value === 'none';
      });
    } else {
      // 変更する（デフォルト）
      radios.forEach(radio => {
        radio.checked = radio.value === 'change';
      });
      if (defaultEvaluationChangeValue) {
        defaultEvaluationChangeValue.value = evaluationChangeValue.toFixed(1);
      }
    }
  }

  // シミュレーション更新
  function updateDefaultSimulation(base, growth) {
    if (!defaultSimulationBody) return;
    const days = [];
    for (let level = 1; level <= 4; level++) {
      const day = base * Math.pow(growth, level);
      days.push(day.toFixed(1));
    }
    defaultSimulationBody.innerHTML = `<tr><td>復習日（日後）</td>${days.map(d => `<td>${d}</td>`).join('')}</tr>`;
  }

  // 入力値変更時にシミュレーション更新
  defaultReviewBaseInput?.addEventListener('input', () => {
    const base = parseFloat(defaultReviewBaseInput.value) || 0.5;
    const growth = parseFloat(defaultReviewGrowthInput.value) || 2.0;
    updateDefaultSimulation(base, growth);
  });

  defaultReviewGrowthInput?.addEventListener('input', () => {
    const base = parseFloat(defaultReviewBaseInput.value) || 0.5;
    const growth = parseFloat(defaultReviewGrowthInput.value) || 2.0;
    updateDefaultSimulation(base, growth);
  });

  // デフォルト設定保存
  saveDefaultReviewSettingsBtn?.addEventListener('click', () => {
    const base = parseFloat(defaultReviewBaseInput.value);
    const growth = parseFloat(defaultReviewGrowthInput.value);
    
    if (isNaN(base) || base < 0.1) {
      alert('基本日数は0.1以上で入力してください。');
      return;
    }
    if (isNaN(growth) || growth < 1.0) {
      alert('成長率は1.0以上で入力してください。');
      return;
    }

    localStorage.setItem('defaultReviewBase', base.toString());
    localStorage.setItem('defaultReviewGrowth', growth.toString());
    alert('デフォルト設定を保存しました。');
  });

  // 単語本設定保存
  saveWordbookSettingsBtn?.addEventListener('click', () => {
    const maxSize = parseInt(defaultBookMaxSizeInput.value);
    let selectedLevel = '初級';
    
    defaultBookLevelRadios.forEach(radio => {
      if (radio.checked) selectedLevel = radio.value;
    });
    
    if (isNaN(maxSize) || maxSize < 10) {
      alert('大きさは10以上で入力してください。');
      return;
    }

    localStorage.setItem('defaultBookMaxSize', maxSize.toString());
    localStorage.setItem('defaultBookLevel', selectedLevel);
    alert('単語本設定を保存しました。');
  });

  // 学習制御設定保存
  saveStudyControlSettingsBtn?.addEventListener('click', () => {
    const studyStart = parseInt(studyStartPercentageInput.value);
    const levelUpThreshold = parseInt(levelUpProgressThresholdInput.value);
    const defaultInfoPlusThresholdInput = document.getElementById('defaultInfoPlusThreshold');
    const defaultInfoPlusThreshold = parseFloat(defaultInfoPlusThresholdInput?.value);
    
    if (isNaN(studyStart) || studyStart < 0 || studyStart > 100) {
      alert('学習スタート割合は0〜100の範囲で入力してください。');
      return;
    }
    if (isNaN(levelUpThreshold) || levelUpThreshold < 0 || levelUpThreshold > 100) {
      alert('進捗度閾値は0〜100の範囲で入力してください。');
      return;
    }
    if (isNaN(defaultInfoPlusThreshold) || defaultInfoPlusThreshold < 0 || defaultInfoPlusThreshold > 4) {
      alert('情報追加判定の閾値は0.0〜4.0の範囲で入力してください。');
      return;
    }

    // 評価値変更設定を保存（モードと値を別々に保存）
    let selectedMode = 'none';
    const radios = document.querySelectorAll('input[name="defaultEvaluationChangeMode"]');
    radios.forEach(radio => {
      if (radio.checked) selectedMode = radio.value;
    });
    
    const changeValue = parseFloat(defaultEvaluationChangeValue?.value) || 1.0;
    
    if (selectedMode === 'change' && (changeValue < 0 || changeValue > 4)) {
      alert('減算値は0.0〜4.0の範囲で入力してください。');
      return;
    }

    localStorage.setItem('studyStartPercentage', studyStart.toString());
    localStorage.setItem('levelUpProgressThreshold', levelUpThreshold.toString());
    localStorage.setItem('defaultEvaluationChangeMode', selectedMode);
    localStorage.setItem('defaultEvaluationChangeValue', changeValue.toString());
    localStorage.setItem('defaultInfoPlusThreshold', defaultInfoPlusThreshold.toString());
    alert('学習制御設定を保存しました。');
    loadBooks(); // 設定変更を反映するため再読み込み
  });

  // 設定モーダルを閉じる
  closeSettingsBtn?.addEventListener('click', () => {
    settingsModal?.classList.remove('show');
  });

  // モーダル外をクリックしたら閉じる
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('show');
    }
  });
});
