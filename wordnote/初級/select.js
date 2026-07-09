document.addEventListener('DOMContentLoaded', async () => {
    const modal = document.getElementById('infoPlusModal');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalCloseBtn = document.querySelector('.modal-close-btn');
    
    const step1 = document.getElementById('step1-word-select');
    const step2 = document.getElementById('step2-info-select');
    const step3 = document.getElementById('step3-info-input');
    
    const wordList = document.getElementById('wordList');
    const selectedWordLabel = document.getElementById('selectedWordLabel');
    const inputForm = document.getElementById('inputForm');
    const inputTitle = document.getElementById('inputTitle');
    const completeBtn = document.getElementById('completeBtn');
    const backBtn = document.getElementById('backBtn');
    const addWordFromModalBtn = document.getElementById('addWordFromModalBtn');
    
    let allCards = [];
    let selectedCardId = null;
    let selectedCardWord = null;
    let selectedInfoType = null;
    let completedSteps = [false, false, false]; // 各ステップの完了状態
    let currentDifficultyFilter = '1'; // 難易度フィルタ（デフォルトは初級）
    let infoPlusThreshold = 3.5; // 情報追加判定の閾値（デフォルト3.5）
    
    // モーダル内の「単語を追加」ボタン
    addWordFromModalBtn?.addEventListener('click', () => {
        const bookId = localStorage.getItem('current_wordnote_book_id');
        if (!bookId) {
            alert('単語本を選択してください');
            return;
        }
        // モーダルを閉じて手動/CSV選択モーダルへ遷移
        closeModal();
        // index.jsの手動/CSV選択モーダルを開く
        if (window.triggerAddMethodModal) {
            window.triggerAddMethodModal(bookId);
        }
    });
    
    // モーダルを開く関数（外部から呼び出し用）
    window.openInfoPlusModal = async function() {
        if (!modal || !step1 || !step2 || !step3) {
            alert('モーダルが表示できません。ページを再読み込みしてください。');
            console.error('Modal elements not found:', { modal, step1, step2, step3 });
            return;
        }
        
        modal.classList.remove('hidden');
        modal.classList.add('show');
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
        
        // 単語を読み込み
        await loadCards();
    };
    
    // モーダルを閉じる
    function closeModal() {
        modal.classList.remove('show');
        modal.classList.add('hidden');
        // リセット
        selectedCardId = null;
        selectedCardWord = null;
        selectedInfoType = null;
        completedSteps = [false, false, false];
    }
    
    // 単語を読み込み
    async function loadCards() {
        try {
            const bookId = localStorage.getItem('current_wordnote_book_id');
            if (!bookId) {
                alert('単語本が選択されていません');
                return;
            }
            
            // 単語本情報を取得して閾値を設定
            const bookResponse = await fetch(`/api/wordnote/books/${bookId}`);
            if (bookResponse.ok) {
                const bookData = await bookResponse.json();
                infoPlusThreshold = bookData.infoPlusThreshold ?? 3.5;
            }
            
            const response = await fetch(`/api/wordnote/cards/${bookId}`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            allCards = data.cards || [];
            
            displayWordList();
        } catch (error) {
            console.error('Error loading cards:', error);
            alert('単語の読み込みに失敗しました');
        }
    }
    
    // 単語一覧を表示
    function displayWordList() {
        wordList.innerHTML = '';
        
        if (allCards.length === 0) {
            wordList.innerHTML = '<p style="text-align: center; color: #999;">単語がありません</p>';
            return;
        }
        
        // 難易度でフィルタリング（infoPlusProgressに基づく）
        let filteredCards;
        if (currentDifficultyFilter === 'all') {
            filteredCards = allCards;
        } else {
            // infoPlusProgressを難易度にマッピング
            // 1(初級)=0, 2(中級)=1-3, 3(上級)=4-6, 4(完成)=7
            const difficultyLevel = parseInt(currentDifficultyFilter);
            filteredCards = allCards.filter(card => {
                const progress = card.infoPlusProgress || 0;
                if (difficultyLevel === 1) {
                    return progress === 0;
                } else if (difficultyLevel === 2) {
                    return progress >= 1 && progress <= 3;
                } else if (difficultyLevel === 3) {
                    return progress >= 4 && progress <= 6;
                } else if (difficultyLevel === 4) {
                    return progress === 7;
                }
                return false;
            });
        }
        
        // 単語をアルファベット順（昇順）にソート
        filteredCards = filteredCards.sort((a, b) => {
            const wordA = (a.word || '').toLowerCase();
            const wordB = (b.word || '').toLowerCase();
            return wordA.localeCompare(wordB);
        });
        
        if (filteredCards.length === 0) {
            wordList.innerHTML = '<p style="text-align: center; color: #999;">該当する単語がありません</p>';
            return;
        }
        
        filteredCards.forEach(card => {
            const wordLine = document.createElement('div');
            wordLine.className = 'word-line';
            
            // 過去2回の評価値の平均を計算
            const studyHistory = card.studyHistory ? JSON.parse(card.studyHistory) : [];
            let averageRating = 0;
            let isSelectable = true;
            
            if (studyHistory.length >= 2) {
                // 最新2件の評価値を取得
                const recentTwo = studyHistory.slice(-2);
                const sum = recentTwo.reduce((acc, record) => acc + (record.rating || 0), 0);
                averageRating = sum / 2;
                
                // 閾値と比較
                isSelectable = averageRating >= infoPlusThreshold;
            } else {
                // 学習履歴が2件未満の場合は選択不可
                isSelectable = false;
            }
            
            // 選択不可の場合はグレーアウト
            if (!isSelectable) {
                wordLine.classList.add('disabled');
                wordLine.style.opacity = '0.5';
                wordLine.style.cursor = 'not-allowed';
            }
            
            const meanings = card.meanings ? JSON.parse(card.meanings) : [];
            const difficulty = card.difficulty || 1;
            const infoPlusProgress = card.infoPlusProgress || 0;
            
            // 中級（2）と上級（3）の単語のみチェックボックス3つを表示
            let meaningDisplayHtml = '';
            if (difficulty === 2 || difficulty === 3) {
                // infoPlusProgressに基づいてチェック状態を決定
                let checkedCount = 0;
                if (difficulty === 2) {
                    // 中級の場合
                    if (infoPlusProgress >= 1) checkedCount = 1;
                    if (infoPlusProgress >= 2) checkedCount = 2;
                    if (infoPlusProgress >= 3) checkedCount = 3;
                } else if (difficulty === 3) {
                    // 上級の場合
                    if (infoPlusProgress >= 4) checkedCount = 1;
                    if (infoPlusProgress >= 5) checkedCount = 2;
                    if (infoPlusProgress >= 6) checkedCount = 3;
                }
                
                // チェックボックスを3つ固定で表示
                for (let i = 0; i < 3; i++) {
                    const isChecked = i < checkedCount ? 'checked' : '';
                    const checkboxStyle = i < checkedCount 
                        ? 'width: 18px; height: 18px; cursor: default; accent-color: #4caf50; background-color: #4caf50; border: 2px solid #4caf50;'
                        : 'width: 18px; height: 18px; cursor: default; accent-color: #4caf50; background-color: #f5f5f5; border: 2px solid #ccc;';
                    meaningDisplayHtml += `<label style="margin-right: 15px; display: inline-flex; align-items: center; cursor: pointer;">
                        <span style="margin-right: 5px;">${i + 1}.</span>
                        <input type="checkbox" class="meaning-checkbox" data-meaning-index="${i}" style="${checkboxStyle}" disabled ${isChecked}>
                    </label>`;
                }
            } else {
                // 初級と完成は何も表示しない
                meaningDisplayHtml = '';
            }
            
            // 評価値の平均を常に表示
            let evaluationDisplay = '';
            if (studyHistory.length < 2) {
                evaluationDisplay = '⚠️評価不足（学習回数不足）';
            } else {
                if (!isSelectable) {
                    evaluationDisplay = `⚠️評価不足（平均: ${averageRating.toFixed(1)}）`;
                } else {
                    evaluationDisplay = `（平均: ${averageRating.toFixed(1)}）`;
                }
            }
            
            wordLine.innerHTML = `
                <div class="word-text">${card.word} <span style="font-size: 0.8em; color: #999;">[難易度:${difficulty}]</span> <span style="font-size: 0.75em; color: #666; margin-left: 10px;">[progress: ${infoPlusProgress}] ${evaluationDisplay}</span></div>
                <div class="word-meaning">${meaningDisplayHtml}</div>
                <button class="reset-review-date-btn" data-card-id="${card.id}" style="margin-left: 10px; padding: 4px 8px; font-size: 0.75em; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">復習日を今日に</button>
            `;
            
            // 復習日ボタンのイベント（常に有効）
            const resetBtn = wordLine.querySelector('.reset-review-date-btn');
            resetBtn?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await resetReviewDate(card.id, card.word);
            });
            
            if (isSelectable) {
                wordLine.addEventListener('click', (e) => {
                    // チェックボックスをクリックした場合は単語選択をスキップ
                    if (e.target.type === 'checkbox') {
                        return;
                    }
                    // 復習日ボタンをクリックした場合もスキップ
                    if (e.target.classList.contains('reset-review-date-btn')) {
                        return;
                    }
                    selectWord(card.id, card.word);
                });
            }
            
            wordList.appendChild(wordLine);
        });
    }
    
    // 復習日を今日にリセット
    async function resetReviewDate(cardId, wordText) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/wordnote/cards/${cardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewDate: today })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update review date');
            }
            
            alert(`"${wordText}"の復習日を今日(${today})に設定しました`);
            // カードを再読み込み
            await loadCards();
        } catch (error) {
            console.error('Error resetting review date:', error);
            alert('復習日の更新に失敗しました');
        }
    }
    
    // 単語を選択
    function selectWord(cardId, wordText) {
        // 前の選択を解除
        document.querySelectorAll('.word-line.active').forEach(el => {
            el.classList.remove('active');
        });
        
        selectedCardId = cardId;
        selectedCardWord = wordText;
        selectedInfoType = null;
        completedSteps = [false, false, false];
        
        // 選択状態を表示
        event.currentTarget.classList.add('active');
        
        // ステップ2に移動
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        step3.classList.add('hidden');
        
        selectedWordLabel.textContent = `選択中: ${wordText}`;
        
        // 選択されたカードを取得
        const selectedCard = allCards.find(c => c.id === cardId);
        const infoPlusProgress = selectedCard ? (selectedCard.infoPlusProgress || 0) : 0;
        
        // infoPlusProgressに応じて表示する選択肢を制限
        const buttons = document.querySelectorAll('.info-type-btn');
        
        buttons.forEach((btn, index) => {
            // 現在のinfoPlusProgressと一致する選択肢のみ有効化
            if (index === infoPlusProgress && infoPlusProgress < 7) {
                btn.style.display = '';
                btn.disabled = false;
                btn.classList.remove('completed');
                btn.querySelector('.btn-status').textContent = '未完了';
            } else if (index < infoPlusProgress) {
                // 既に完了した選択肢は「完了」表示
                btn.style.display = '';
                btn.disabled = true;
                btn.classList.add('completed');
                btn.querySelector('.btn-status').textContent = '完了';
            } else {
                // まだ到達していない選択肢は非表示
                btn.style.display = 'none';
            }
        });
        
        // infoPlusProgress = 7 の場合は全て完了
        if (infoPlusProgress >= 7) {
            selectedWordLabel.textContent = `選択中: ${wordText}（全ての情報が完了しています）`;
        }
    }
    
    // 情報種類ボタンをクリック
    document.querySelectorAll('.info-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.disabled) return;
            
            selectedInfoType = this.dataset.type;
            
            // すべての選択肢で info_plus.html に直接移動
            localStorage.setItem('info_plus_card_id', selectedCardId);
            localStorage.setItem('info_plus_word', selectedCardWord);
            localStorage.setItem('info_plus_type', selectedInfoType);
            window.location.href = '初級/info_plus/info_plus.html';
            return;
        });
    });
    
    // 入力フォームを表示
    function displayInputForm(infoType) {
        const titles = {
            'sub-meaning': 'サブの意味＋対義語を入力',
            'derivative': '派生語を入力',
            'synonym': '類義語を入力'
        };
        
        const labels = {
            'sub-meaning': ['サブの意味', '対義語'],
            'derivative': ['派生語', '（カンマで区切る）'],
            'synonym': ['類義語', '（カンマで区切る）']
        };
        
        const placeholders = {
            'sub-meaning': ['例: alternative meaning', '例: antonym'],
            'derivative': ['例: derivation', '例: derived word'],
            'synonym': ['例: similar word', '例: synonym']
        };
        
        inputTitle.textContent = titles[infoType];
        
        const fields = labels[infoType];
        const places = placeholders[infoType];
        inputForm.innerHTML = `
            <div class="form-group">
                <label>${fields[0]}</label>
                <input type="text" id="field1" placeholder="${places[0]}" class="form-input">
            </div>
            <div class="form-group">
                <label>${fields[1]}</label>
                <input type="text" id="field2" placeholder="${places[1]}" class="form-input">
            </div>
        `;
        
        // 最初のフィールドにフォーカス
        document.getElementById('field1').focus();
    }
    
    // 完了ボタン
    completeBtn.addEventListener('click', async () => {
        const field1 = document.getElementById('field1').value.trim();
        const field2 = document.getElementById('field2').value.trim();
        
        if (!field1 || !field2) {
            alert('すべてのフィールドを入力してください');
            return;
        }
        
        // 対応するステップを完了状態に
        const btnIndex = parseInt(document.querySelector(`[data-type="${selectedInfoType}"]`).dataset.index);
        completedSteps[btnIndex] = true;
        
        // ボタンを完了状態にして無効化
        const currentBtn = document.querySelector(`[data-type="${selectedInfoType}"]`);
        currentBtn.classList.add('completed');
        currentBtn.disabled = true;
        currentBtn.querySelector('.btn-status').textContent = '完了';
        
        // 次のボタンを有効化
        if (btnIndex < 2) {
            document.querySelectorAll('.info-type-btn')[btnIndex + 1].disabled = false;
        }
        
        // すべて完了したか確認
        if (completedSteps.every(step => step)) {
            // info_plus.htmlに遷移
            localStorage.setItem('info_plus_card_id', selectedCardId);
            localStorage.setItem('info_plus_word', selectedCardWord);
            
            // info_plus/info_plus.htmlに遷移
            window.location.href = '初級/info_plus/info_plus.html';
            return;
        }
        
        // ステップ2に戻る
        step3.classList.add('hidden');
        step2.classList.remove('hidden');
    });
    
    // 戻るボタン（ステップ3→ステップ2）
    backBtn.addEventListener('click', () => {
        step3.classList.add('hidden');
        step2.classList.remove('hidden');
    });
    
    // 一つ前に戻るボタン（ステップ2→ステップ1）
    const backToStep1Btn = document.getElementById('backToStep1');
    backToStep1Btn?.addEventListener('click', () => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
        selectedCardId = null;
        selectedCardWord = null;
    });
    
    // 難易度フィルタボタン
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDifficultyFilter = this.dataset.difficulty;
            displayWordList();
        });
    });
    
    // モーダルを閉じる
    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
});
