// 表示画面のJavaScript
document.addEventListener('DOMContentLoaded', function() {
    const leftPage = document.getElementById('leftPage');
    const rightPage = document.getElementById('rightPage');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    const goToPageZeroBtn = document.getElementById('goToPageZeroBtn');
    
    let allWords = [];
    let currentPage = 0;
    const CARDS_PER_SPREAD = 4; // 見開き全体で4つのカード（各ページに2つ）
    
    // 単語本IDを取得
    const bookId = localStorage.getItem('current_wordnote_book_id');
    
    // 品詞を略称に変換
    function getShortPos(pos) {
        const posMap = {
            '名詞': '名',
            '動詞': '動',
            '形容詞': '形',
            '副詞': '副',
            '前置詞': '前',
            '接続詞': '接',
            '代名詞': '代',
            '間投詞': '間'
        };
        return posMap[pos] || pos;
    }
    
    // 品詞の解析（配列または文字列）
    function parsePartOfSpeech(posString) {
        if (!posString) return '';
        
        try {
            const posArray = JSON.parse(posString);
            if (Array.isArray(posArray)) {
                return posArray.map(p => getShortPos(p)).join('/');
            }
        } catch {
            // JSON解析失敗時は旧形式として扱う
        }
        
        // 旧形式の場合はそのまま返す
        return posString;
    }
    
    // 意味の解析（{text, pos}配列または文字列配列）
    function parseMeanings(meaningsString) {
        if (!meaningsString) return [];
        
        try {
            const meanings = JSON.parse(meaningsString);
            if (!Array.isArray(meanings)) return [];
            
            return meanings.map(item => {
                // 新形式: {text, pos}
                if (typeof item === 'object' && item.text) {
                    const posLabel = item.pos ? `${getShortPos(item.pos)}：` : '';
                    return `${posLabel}${item.text}`;
                }
                // 旧形式: 文字列
                return item;
            });
        } catch {
            // JSON解析失敗時は空配列
            return [];
        }
    }
    
    // データベースから単語を読み込み
    loadWords();

    async function loadWords() {
        try {
            let cards = [];
            
            if (bookId) {
                // 特定の単語本のカードを取得
                const cardsResponse = await fetch(`/api/wordnote/cards/${bookId}`);
                if (!cardsResponse.ok) {
                    throw new Error('Failed to fetch wordnote cards');
                }
                const data = await cardsResponse.json();
                cards = data.cards || [];
            } else {
                // 従来の方法: レベルで取得
                const booksResponse = await fetch('/api/wordnote/books/初級');
                if (!booksResponse.ok) {
                    throw new Error('Failed to fetch wordnote books');
                }
                const books = await booksResponse.json();
                
                if (books.length === 0) {
                    allWords = [];
                    displayCurrentSpread();
                    return;
                }

                // 最初の単語帳から単語を取得
                const firstBookId = books[0].id;
                const cardsResponse = await fetch(`/api/wordnote/cards/${firstBookId}`);
                if (!cardsResponse.ok) {
                    throw new Error('Failed to fetch wordnote cards');
                }
                const data = await cardsResponse.json();
                cards = data.cards || [];
            }
            
            // APIから取得したカードをローカル形式に変換
            allWords = cards.map(card => ({
                id: card.id,
                partOfSpeech: parsePartOfSpeech(card.partOfSpeech),
                word: card.word,
                pronunciation: card.pronunciation || '',
                meanings: parseMeanings(card.meanings),
                imageUrl: card.imageUrl || '',
                memo: card.memo || ''
            }));

            allWords.reverse(); // 新しい順に表示
            displayCurrentSpread();
        } catch (error) {
            console.error('Error loading words:', error);
            alert('単語の読み込みに失敗しました');
            allWords = [];
            displayCurrentSpread();
        }
    }

    function displayCurrentSpread() {
        const totalSpreads = Math.ceil(allWords.length / CARDS_PER_SPREAD);
        const maxSpreads = 13; // 最大ページ数を13に固定
        
        // ページ0（表紙・空白ページ）
        if (currentPage === 0) {
            leftPage.innerHTML = `
                <div class="info-section">
                    <h2>使い方</h2>
                    <p>1. 「単語を追加」から新しい単語を登録できます</p>
                    <p>2. 「単語帳を見る」で登録した単語を確認できます</p>
                    <p>3. 左右の矢印ボタンでページをめくれます</p>
                    <p>4. 音声ボタンで英単語を読み上げます</p>
                </div>
            `;
            rightPage.innerHTML = `
                <div class="button-section">
                    <button id="deleteWordBtn" class="btn btn-secondary" type="button">単語の削除</button>
                    <button id="editWordBtn" class="btn btn-secondary" type="button">単語の変更</button>
                    <button id="duplicateWordBtn" class="btn btn-secondary" type="button">複製</button>
                    <button id="moveWordBtn" class="btn btn-secondary" type="button">移動</button>
                    <button id="printBtn" class="btn btn-secondary" type="button">印刷</button>
                </div>
            `;
            // 右側のボタンのイベント設定（機能は未実装）
            document.getElementById('deleteWordBtn').addEventListener('click', function() {
                openDeleteModal();
            });
            document.getElementById('editWordBtn').addEventListener('click', function() {
                openEditModal();
            });
            document.getElementById('duplicateWordBtn').addEventListener('click', function() {
                alert('複製機能は準備中です');
            });
            document.getElementById('moveWordBtn').addEventListener('click', function() {
                alert('移動機能は準備中です');
            });
            document.getElementById('printBtn').addEventListener('click', function() {
                alert('印刷機能は準備中です');
            });
            pageInfo.textContent = `0 / ${maxSpreads}`;
            prevBtn.disabled = true;
            nextBtn.disabled = false;
            return;
        }
        
        // ページ1以降（実際の単語表示）
        const startIndex = (currentPage - 1) * CARDS_PER_SPREAD;
        
        // 左ページ（1つ目と2つ目のカード）
        leftPage.innerHTML = '';
        for (let i = 0; i < 2; i++) {
            const word = allWords[startIndex + i];
            if (word) {
                leftPage.appendChild(createWordCard(word));
            }
        }
        
        // 右ページ（3つ目と4つ目のカード）
        rightPage.innerHTML = '';
        for (let i = 2; i < 4; i++) {
            const word = allWords[startIndex + i];
            if (word) {
                rightPage.appendChild(createWordCard(word));
            }
        }
        
        // ページ情報の更新（常に13ページ表示）
        pageInfo.textContent = `${currentPage} / ${maxSpreads}`;
        
        // ボタンの有効/無効
        prevBtn.disabled = currentPage === 0;
        nextBtn.disabled = currentPage >= totalSpreads;
    }

    function createWordCard(word) {
        const card = document.createElement('div');
        card.className = 'word-card';
        
        // 意味のリスト（番号付き）
        const meaningsHTML = word.meanings.slice(0, 3).map((meaning, index) => 
            `<li>${index + 1}. ${meaning}</li>`
        ).join('');

        // 画像部分
        const imageHTML = word.imageUrl 
            ? `<div class="card-image"><img src="${word.imageUrl}" alt="${word.word}"></div>`
            : `<div class="card-image">画像</div>`;

        // メモ部分
        const memoHTML = word.memo 
            ? `<div class="card-memo">
                <h3>メモ（任意）</h3>
                <p>${word.memo}</p>
               </div>`
            : '';

        card.innerHTML = `
            <div class="card-header">
                <div class="card-pos">${word.partOfSpeech}</div>
                <div class="card-word">${word.word}</div>
                <button class="card-audio-btn" onclick="speakWord('${word.word}')">音声</button>
            </div>
            ${word.pronunciation ? `<div class="card-pronunciation">${word.pronunciation}</div>` : ''}
            <div class="card-body">
                <div class="card-meanings">
                    <h3>和訳</h3>
                    <ul>${meaningsHTML}</ul>
                </div>
                ${imageHTML}
            </div>
            ${memoHTML}
        `;

        return card;
    }

    // 0ページ移動
    goToPageZeroBtn.addEventListener('click', function() {
        currentPage = 0;
        displayCurrentSpread();
    });

    // ページめくり
    prevBtn.addEventListener('click', function() {
        if (currentPage > 0) {
            currentPage--;
            displayCurrentSpread();
        }
    });

    nextBtn.addEventListener('click', function() {
        const totalSpreads = Math.ceil(allWords.length / CARDS_PER_SPREAD);
        if (currentPage < totalSpreads) {
            currentPage++;
            displayCurrentSpread();
        }
    });

    // グローバルスコープに音声読み上げ関数を追加
    window.speakWord = function(word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        } else {
            alert('お使いのブラウザは音声合成に対応していません');
        }
    };

    // ======================
    // 削除機能
    // ======================
    const deleteModal = document.getElementById('deleteModal');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const executeDeleteBtn = document.getElementById('executeDeleteBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const deleteWordList = document.getElementById('deleteWordList');
    const deleteModalOverlay = deleteModal?.querySelector('.modal-overlay');

    // 削除モーダルを開く
    window.openDeleteModal = function() {
        if (!deleteModal) return;
        
        // 単語一覧を表示
        displayDeleteWordList();
        
        deleteModal.classList.remove('hidden');
        deleteModal.classList.add('show');
    };

    // 削除モーダルを閉じる
    function closeDeleteModal() {
        if (!deleteModal) return;
        deleteModal.classList.remove('show');
        deleteModal.classList.add('hidden');
    }

    // 削除用の単語一覧を表示
    function displayDeleteWordList() {
        deleteWordList.innerHTML = '';
        
        if (allWords.length === 0) {
            deleteWordList.innerHTML = '<p style="text-align: center; color: #999;">単語がありません</p>';
            return;
        }
        
        allWords.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-line';
            wordItem.style.cssText = 'display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid #e0e0e0; cursor: pointer;';
            
            const meanings = parseMeanings(word.meanings);
            const meaningText = meanings.map(m => m.text).join(', ');
            
            wordItem.innerHTML = `
                <input type="checkbox" class="delete-checkbox" data-card-id="${word.id}" style="margin-right: 1rem; width: 18px; height: 18px; cursor: pointer;">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${word.word}</div>
                    <div style="font-size: 0.85em; color: #666;">${meaningText}</div>
                </div>
            `;
            
            wordItem.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = wordItem.querySelector('.delete-checkbox');
                    checkbox.checked = !checkbox.checked;
                }
            });
            
            deleteWordList.appendChild(wordItem);
        });
    }

    // 全選択
    selectAllBtn?.addEventListener('click', () => {
        document.querySelectorAll('.delete-checkbox').forEach(cb => cb.checked = true);
    });

    // 全解除
    deselectAllBtn?.addEventListener('click', () => {
        document.querySelectorAll('.delete-checkbox').forEach(cb => cb.checked = false);
    });

    // 削除実行
    executeDeleteBtn?.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('.delete-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.cardId));
        
        if (selectedIds.length === 0) {
            alert('削除する単語を選択してください。');
            return;
        }
        
        if (!confirm(`${selectedIds.length}件の単語を削除しますか？`)) {
            return;
        }
        
        try {
            // 一つずつ削除
            let successCount = 0;
            for (const cardId of selectedIds) {
                const response = await fetch(`/api/wordnote/cards/${cardId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    successCount++;
                }
            }
            
            alert(`${successCount}件の単語を削除しました。`);
            closeDeleteModal();
            
            // 単語一覧を再読み込み
            await loadWords();
            displayCurrentSpread();
        } catch (error) {
            console.error('Error deleting cards:', error);
            alert('削除に失敗しました。');
        }
    });

    // モーダルを閉じる
    closeDeleteModalBtn?.addEventListener('click', closeDeleteModal);
    cancelDeleteBtn?.addEventListener('click', closeDeleteModal);
    deleteModalOverlay?.addEventListener('click', closeDeleteModal);

    // ======================
    // 変更機能
    // ======================
    const editModal = document.getElementById('editModal');
    const closeEditModalBtn = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const executeEditBtn = document.getElementById('executeEditBtn');
    const editWordList = document.getElementById('editWordList');
    const editModalOverlay = editModal?.querySelector('.modal-overlay');
    let selectedEditCardId = null;

    // 変更モーダルを開く
    window.openEditModal = function() {
        if (!editModal) return;
        
        // 単語一覧を表示
        displayEditWordList();
        
        editModal.classList.remove('hidden');
        editModal.classList.add('show');
        selectedEditCardId = null;
    };

    // 変更モーダルを閉じる
    function closeEditModal() {
        if (!editModal) return;
        editModal.classList.remove('show');
        editModal.classList.add('hidden');
        selectedEditCardId = null;
    }

    // 変更用の単語一覧を表示
    function displayEditWordList() {
        editWordList.innerHTML = '';
        
        if (allWords.length === 0) {
            editWordList.innerHTML = '<p style="text-align: center; color: #999;">単語がありません</p>';
            return;
        }
        
        allWords.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-line';
            wordItem.style.cssText = 'display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid #e0e0e0; cursor: pointer; transition: background 0.2s;';
            
            const meaningsText = Array.isArray(word.meanings) ? word.meanings.join(', ') : '';
            
            wordItem.innerHTML = `
                <input type="radio" name="edit-word" class="edit-radio" data-card-id="${word.id}" style="margin-right: 1rem; width: 18px; height: 18px; cursor: pointer;">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${word.word}</div>
                    <div style="font-size: 0.85em; color: #666;">${meaningsText}</div>
                </div>
            `;
            
            wordItem.addEventListener('click', (e) => {
                if (e.target.type !== 'radio') {
                    const radio = wordItem.querySelector('.edit-radio');
                    radio.checked = true;
                    selectedEditCardId = parseInt(radio.dataset.cardId);
                }
            });
            
            wordItem.addEventListener('mouseenter', () => {
                wordItem.style.background = '#f0f0f0';
            });
            
            wordItem.addEventListener('mouseleave', () => {
                wordItem.style.background = '#fafbfc';
            });
            
            const radio = wordItem.querySelector('.edit-radio');
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    selectedEditCardId = parseInt(radio.dataset.cardId);
                }
            });
            
            editWordList.appendChild(wordItem);
        });
    }

    // 変更実行（input.htmlに遷移）
    executeEditBtn?.addEventListener('click', async () => {
        if (!selectedEditCardId) {
            alert('変更する単語を選択してください。');
            return;
        }
        
        try {
            // カードの詳細データをAPIから取得
            const response = await fetch(`/api/wordnote/card/${selectedEditCardId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch card details');
            }
            const cardData = await response.json();
            
            // 編集モードとしてlocalStorageに保存
            localStorage.setItem('edit_mode', 'true');
            localStorage.setItem('edit_card_id', selectedEditCardId.toString());
            localStorage.setItem('edit_card_data', JSON.stringify(cardData));
            
            // input.htmlに遷移
            window.location.href = 'input.html';
        } catch (error) {
            console.error('Error fetching card details:', error);
            alert('単語データの取得に失敗しました。');
        }
    });

    // モーダルを閉じる
    closeEditModalBtn?.addEventListener('click', closeEditModal);
    cancelEditBtn?.addEventListener('click', closeEditModal);
    editModalOverlay?.addEventListener('click', closeEditModal);
});
