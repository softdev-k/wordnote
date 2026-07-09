// カードのデータを管理する配列（サーバーから取得します）
let cards = [];

// DOM要素の取得
const flashcardsContainer = document.getElementById('flashcards');
const backLink = document.getElementById('backLink');

// 戻るボタンの処理
if (backLink) {
    backLink.addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
    });
}

// review.htmlから来た場合の処理
const fromReview = localStorage.getItem('from_review') === 'true';
if (fromReview) {
    // フラグをクリア
    localStorage.removeItem('from_review');
    
    // 学習ボタンを表示（件数は残す）
    const studyButtonArea = document.getElementById('studyButtonArea');
    if (studyButtonArea) {
        studyButtonArea.innerHTML = '<button id="btnStudy" class="control-btn">学習</button>';
        
        const btnStudy = document.getElementById('btnStudy');
        if (btnStudy) {
            btnStudy.addEventListener('click', () => {
                // 学習モーダルを表示
                openStudyModal();
            });
        }
    }
}

// 学習モーダル関連の変数
let currentStudyIndex = 0;
const studyModal = document.getElementById('studyModal');
const closeStudyModalBtn = document.getElementById('closeStudyModal');
const studyProgress = document.getElementById('studyProgress');
const prevCardBtn = document.getElementById('prevCard');
const nextCardBtn = document.getElementById('nextCard');
const showFrontBtn = document.getElementById('showFront');
const showBackBtn = document.getElementById('showBack');

// 学習モーダルを開く
function openStudyModal() {
    if (cards.length === 0) {
        alert('学習するカードがありません。');
        return;
    }
    
    currentStudyIndex = 0;
    if (studyModal) studyModal.classList.add('show');
    showStudyCard(currentStudyIndex);
}

// 学習カードを表示
function showStudyCard(index) {
    if (!cards || cards.length === 0) return;
    
    const card = cards[index];
    const studyCard = document.getElementById('studyCard');
    const cardFront = studyCard.querySelector('.card-front');
    const cardBack = studyCard.querySelector('.card-back');
    
    if (cardFront) cardFront.textContent = card.front;
    if (cardBack) cardBack.textContent = card.back;
    
    // カードを表にリセット
    studyCard.classList.remove('flipped');
    
    // 表/裏ボタンの状態を更新
    if (showFrontBtn) showFrontBtn.classList.add('active');
    if (showBackBtn) showBackBtn.classList.remove('active');
    
    // 進捗表示を更新
    if (studyProgress) {
        studyProgress.textContent = `${index + 1} / ${cards.length}`;
    }
    
    // ボタンの有効/無効化
    if (prevCardBtn) {
        prevCardBtn.disabled = index === 0;
        prevCardBtn.style.opacity = index === 0 ? '0.5' : '1';
    }
    if (nextCardBtn) {
        nextCardBtn.disabled = index === cards.length - 1;
        nextCardBtn.style.opacity = index === cards.length - 1 ? '0.5' : '1';
    }
}

// カードをクリックでめくる - より正確なイベント処理
document.addEventListener('click', (e) => {
    const studyCard = document.getElementById('studyCard');
    const modal = document.getElementById('studyModal');
    
    // モーダルが表示されていない場合は何もしない
    if (!modal || !modal.classList.contains('show')) return;
    
    // ボタンをクリックした場合は何もしない
    if (e.target.id === 'prevCard' || e.target.id === 'nextCard' || 
        e.target.id === 'closeStudyModal' || e.target.id === 'showFront' || 
        e.target.id === 'showBack') {
        return;
    }
    
    // studyCard自体、またはその子要素（card-front/card-back）をクリックした場合
    if (studyCard && (e.target === studyCard || 
        e.target.classList.contains('card-front') || 
        e.target.classList.contains('card-back'))) {
        e.stopPropagation();
        studyCard.classList.toggle('flipped');
        console.log('Card flipped:', studyCard.classList.contains('flipped'));
    }
});

// 表ボタン
if (showFrontBtn) {
    showFrontBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const studyCard = document.getElementById('studyCard');
        if (studyCard) {
            studyCard.classList.remove('flipped');
            showFrontBtn.classList.add('active');
            if (showBackBtn) showBackBtn.classList.remove('active');
        }
    });
}

// 裏ボタン
if (showBackBtn) {
    showBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const studyCard = document.getElementById('studyCard');
        if (studyCard) {
            studyCard.classList.add('flipped');
            showBackBtn.classList.add('active');
            if (showFrontBtn) showFrontBtn.classList.remove('active');
        }
    });
}

// 前へボタン
if (prevCardBtn) {
    prevCardBtn.addEventListener('click', () => {
        if (currentStudyIndex > 0) {
            currentStudyIndex--;
            showStudyCard(currentStudyIndex);
        }
    });
}

// 次へボタン
if (nextCardBtn) {
    nextCardBtn.addEventListener('click', () => {
        if (currentStudyIndex < cards.length - 1) {
            currentStudyIndex++;
            showStudyCard(currentStudyIndex);
        }
    });
}

// モーダルを閉じる
if (closeStudyModalBtn) {
    closeStudyModalBtn.addEventListener('click', () => {
        if (studyModal) studyModal.classList.remove('show');
    });
}

// モーダル外をクリックで閉じる
if (studyModal) {
    studyModal.addEventListener('click', (e) => {
        if (e.target === studyModal) {
            studyModal.classList.remove('show');
        }
    });
}

// カードを表示する関数
function renderCards() {
    flashcardsContainer.innerHTML = '';
    cards.forEach((card) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'flashcard';
        cardElement.innerHTML = `
            <div class="card" data-id="${card.id}">
                <div class="card-front">${card.front}</div>
                <div class="card-back">${card.back}</div>
            </div>
        `;
        flashcardsContainer.appendChild(cardElement);
    });

    // カードのクリックイベントを設定
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });
}

// 初期表示
// サーバーからカードを読み込む
async function loadCards() {
    try {
        // フォルダIDを取得
        const folderId = localStorage.getItem('current_folder_id');
        const url = folderId ? `/api/cards?folderId=${folderId}` : '/api/cards';
        
        // ヘッダーにフォルダ名を表示
        const currentFolderNameEl = document.getElementById('currentFolderName');
        if (folderId && currentFolderNameEl) {
            try {
                const fRes = await fetch('/api/folders');
                if (fRes.ok) {
                    const fs = await fRes.json();
                    const f = fs.find(x => String(x.id) === String(folderId));
                    currentFolderNameEl.textContent = f ? f.name : '';
                } else {
                    currentFolderNameEl.textContent = '';
                }
            } catch (e) {
                currentFolderNameEl.textContent = '';
            }
        } else if (currentFolderNameEl) {
            currentFolderNameEl.textContent = '';
        }
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('カード読み込みに失敗しました');
        cards = await res.json();
        renderCards();
        
        // 件数の表示
        const countEl = document.getElementById('cardCount');
        if (countEl) {
            countEl.textContent = `${cards.length} 件`;
        }
    } catch (err) {
        console.error(err);
        const userMsg = (err && err.message && /failed to fetch/i.test(err.message))
            ? 'サーバーに接続できませんでした。プロジェクトのルートで `npm start` してから http://localhost:3000 で開いてください。'
            : 'カードの読み込みに失敗しました';
        flashcardsContainer.innerHTML = `<div style="color:#c0392b">${userMsg}</div>`;
        const countEl = document.getElementById('cardCount');
        if (countEl) countEl.textContent = '';
    }
}

loadCards();
