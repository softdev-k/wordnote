// 入力フォームのJavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('wordForm');
    const posButtons = document.querySelectorAll('.pos-btn');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    const partOfSpeechInput = document.getElementById('partOfSpeech');
    const meaningsContainer = document.getElementById('meaningsContainer');
    const addMeaningBtn = document.getElementById('addMeaning');
    const translationsContainer = document.getElementById('translationsContainer');
    const subMeaningsContainer = document.getElementById('subMeaningsContainer');
    const addSubMeaningBtn = document.getElementById('addSubMeaning');
    const synonymsContainer = document.getElementById('synonymsContainer');
    const addSynonymBtn = document.getElementById('addSynonym');
    const antonymsContainer = document.getElementById('antonymsContainer');
    const derivativesContainer = document.getElementById('derivativesContainer');
    const addDerivativeBtn = document.getElementById('addDerivative');
    const examplesContainer = document.getElementById('examplesContainer');
    const addExampleBtn = document.getElementById('addExample');
    const exampleMaxCount = document.getElementById('exampleMaxCount');
    const chunkExamplesContainer = document.getElementById('chunkExamplesContainer');
    const addChunkExampleBtn = document.getElementById('addChunkExample');
    const phraseExamplesContainer = document.getElementById('phraseExamplesContainer');
    const addPhraseExampleBtn = document.getElementById('addPhraseExample');
    const clearFormBtn = document.getElementById('clearForm');
    const finishBtn = document.getElementById('finishBtn');
    const memoTextarea = document.getElementById('memo');
    const charCount = document.getElementById('charCount');
    const wordInput = document.getElementById('word');
    const pronInput = document.getElementById('pronunciation');
    const imageInput = document.getElementById('imageUrl');

    // プレビュー要素
    const previewPos = document.getElementById('previewPos');
    const previewWord = document.getElementById('previewWord');
    const previewPron = document.getElementById('previewPron');
    const previewMeanings = document.getElementById('previewMeanings');
    const previewImage = document.getElementById('previewImage');
    const previewMemo = document.getElementById('previewMemo');

    // 難易度関連
    const levelOrder = ['初級', '中級', '上級', '完成'];
    let selectedLevel = '初級';

    // infoPlusProgress選択肢を更新する関数
    function updateInfoPlusProgressOptions(bookDifficulty, selectedDifficulty) {
        // 編集モードの場合は何もしない（編集モード専用の処理がloadEditCardDataにある）
        if (isEditMode) {
            return;
        }
        
        const infoPlusProgressSelect = document.getElementById('infoPlusProgress');
        if (!infoPlusProgressSelect) return;

        // 難易度とinfoPlusProgressのマッピング
        const levelToMaxProgress = {
            '初級': 0,
            '中級': 3,
            '上級': 6,
            '完成': 7
        };

        // 単語本の難易度による上限
        const bookMaxProgress = levelToMaxProgress[bookDifficulty] || 0;
        
        // 選択された難易度による上限
        const selectedMaxProgress = levelToMaxProgress[selectedDifficulty] || 0;
        
        // 両方の最小値が実際の上限
        const maxProgress = Math.min(bookMaxProgress, selectedMaxProgress);

        // 進捗値のラベル
        const progressLabels = {
            0: '基本の意味のみ',
            1: 'サブの意味・対義語',
            2: '派生語',
            3: '類義語',
            4: '例文',
            5: 'チャンク例文',
            6: 'よく使う表現',
            7: '英訳'
        };

        // 選択肢をクリアして再構築
        if (maxProgress === 0) {
            // 0固定の場合
            infoPlusProgressSelect.innerHTML = '<option value="0">0（基本の意味のみ）</option>';
            infoPlusProgressSelect.disabled = true;
        } else {
            // 範囲選択の場合
            let options = '';
            for (let i = 0; i <= maxProgress; i++) {
                // デフォルトを最大値に設定
                const selected = i === maxProgress ? 'selected' : '';
                options += `<option value="${i}" ${selected}>${i}（${progressLabels[i]}）</option>`;
            }
            infoPlusProgressSelect.innerHTML = options;
            infoPlusProgressSelect.disabled = false;
        }
    }

    // 単語本IDを取得
    const bookId = localStorage.getItem('current_wordnote_book_id');
    const bookNameEl = document.getElementById('bookName');
    let bookDifficulty = '初級'; // デフォルト
    
    // 単語本名と難易度を取得してinfoPlusProgress選択肢を更新
    if (bookId) {
        fetch(`/api/wordnote/books`)
            .then(res => res.json())
            .then(books => {
                const book = books.find(b => b.id === Number(bookId));
                if (book && bookNameEl) {
                    bookNameEl.textContent = `- ${book.name}`;
                    bookDifficulty = book.level || '初級';
                    // 単語本の難易度取得後にinfoPlusProgress選択肢を更新
                    updateInfoPlusProgressOptions(bookDifficulty, selectedLevel);
                }
            })
            .catch(err => console.error('Error fetching book info:', err));
    } else {
        // bookIdがない場合でも初期更新
        updateInfoPlusProgressOptions(bookDifficulty, selectedLevel);
    }

    // 文字数カウンター
    memoTextarea.addEventListener('input', function() {
        charCount.textContent = this.value.length;
        updatePreview();
    });

    // 終了ボタン
    finishBtn.addEventListener('click', function() {
        window.location.href = '../index.html';
    });

    // 難易度ボタン
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedLevel = btn.dataset.level;
            toggleSections(selectedLevel);
            // 難易度変更時にinfoPlusProgress選択肢を更新
            updateInfoPlusProgressOptions(bookDifficulty, selectedLevel);
        });
    });

    // 編集モードのチェックと初期処理
    let isEditMode = false;
    let editCardId = null;
    let editCardData = null;

    // 初期難易度の適用（クリック不要）
    (async function applyInitialDifficulty() {
        // 編集モードかチェック
        const editModeFlag = localStorage.getItem('edit_mode');
        const storedCardId = localStorage.getItem('edit_card_id');
        const storedCardData = localStorage.getItem('edit_card_data');
        
        if (editModeFlag === 'true' && storedCardId && storedCardData) {
            // 編集モード
            isEditMode = true;
            editCardId = storedCardId;
            editCardData = JSON.parse(storedCardData);
            
            // タイトルとボタンを変更
            const titleElement = document.querySelector('h1');
            if (titleElement) {
                titleElement.textContent = '単語編集（初級）';
            }
            const submitButton = document.querySelector('.btn-primary');
            if (submitButton) {
                submitButton.textContent = '更新';
            }
            
            // 常に「完成」レベルのフォームを表示
            selectedLevel = '完成';
            difficultyButtons.forEach(b => b.classList.remove('active'));
            const completionBtn = document.querySelector('.difficulty-btn[data-level="完成"]');
            if (completionBtn) completionBtn.classList.add('active');
            toggleSections('完成');
            
            // データをフォームに読み込み
            await loadEditCardData(editCardData);
            
            // LocalStorageをクリア
            localStorage.removeItem('edit_mode');
            localStorage.removeItem('edit_card_id');
            localStorage.removeItem('edit_card_data');
        } else {
            // 新規作成モード
            const selectedDifficulty = localStorage.getItem('selected_difficulty');
            if (selectedDifficulty) {
                selectedLevel = selectedDifficulty;
                difficultyButtons.forEach(b => b.classList.remove('active'));
                const targetBtn = document.querySelector(`.difficulty-btn[data-level="${selectedDifficulty}"]`);
                if (targetBtn) targetBtn.classList.add('active');
                toggleSections(selectedLevel);
                localStorage.removeItem('selected_difficulty');
            } else {
                // デフォルトの初級状態
                difficultyButtons.forEach(b => b.classList.remove('active'));
                const defaultBtn = document.querySelector('.difficulty-btn[data-level="初級"]');
                if (defaultBtn) defaultBtn.classList.add('active');
                selectedLevel = '初級';
                toggleSections(selectedLevel);
            }
        }
        // bookDifficultyは非同期で取得されるため、fetch完了後にupdateInfoPlusProgressOptionsが呼ばれる
    })();

    function levelRank(level) {
        return levelOrder.indexOf(level);
    }

    // 編集用データをフォームに読み込む関数
    async function loadEditCardData(card) {
        // 品詞
        let selectedPosArray = [];
        try {
            const posArray = JSON.parse(card.partOfSpeech);
            if (Array.isArray(posArray)) {
                selectedPosArray = posArray;
                posArray.forEach(pos => {
                    const checkbox = document.querySelector(`.pos-checkbox[value="${pos}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        } catch (e) {
            console.error('品詞のパースエラー:', e);
        }
        
        // 単語と発音記号
        document.getElementById('word').value = card.word || '';
        document.getElementById('pronunciation').value = card.pronunciation || '';
        
        // 基本の意味（品詞情報を保持）
        let meaningsData = [];
        try {
            const meanings = JSON.parse(card.meanings);
            if (Array.isArray(meanings) && meanings.length > 0) {
                meaningsData = meanings;
                meaningsContainer.innerHTML = '';
                meanings.forEach((meaning, index) => {
                    const text = typeof meaning === 'object' ? meaning.text : meaning;
                    const pos = typeof meaning === 'object' ? meaning.pos : '';
                    const div = document.createElement('div');
                    div.className = 'meaning-input';
                    div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
                    div.innerHTML = `
                        <input type="text" class="meaning" placeholder="意味を入力" required value="${text}" style="flex: 1;">
                        <select class="meaning-pos" style="width: 100px;">
                            <option value="">品詞選択</option>
                        </select>
                    `;
                    meaningsContainer.appendChild(div);
                });
                bindMeaningInputs();
            }
        } catch (e) {
            console.error('基本の意味のパースエラー:', e);
        }
        
        // サブの意味（品詞情報を保持）
        let subMeaningsData = [];
        try {
            const subMeanings = JSON.parse(card.subMeanings || '[]');
            if (Array.isArray(subMeanings) && subMeanings.length > 0) {
                subMeaningsData = subMeanings;
                subMeaningsContainer.innerHTML = '';
                subMeanings.forEach(item => {
                    const text = typeof item === 'object' ? item.text : item;
                    const pos = typeof item === 'object' ? item.pos : '';
                    const div = document.createElement('div');
                    div.className = 'sub-meaning-input';
                    div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
                    div.innerHTML = `
                        <input type="text" class="sub-meaning" placeholder="サブの意味を入力" value="${text}" style="flex: 1;">
                        <select class="sub-meaning-pos" style="width: 100px;">
                            <option value="">品詞選択</option>
                        </select>
                    `;
                    subMeaningsContainer.appendChild(div);
                });
            }
        } catch (e) {
            console.error('サブの意味のパースエラー:', e);
        }
        
        // 品詞ドロップダウンを更新（品詞チェック後に実行）
        updateMeaningPosOptions();
        
        // 基本の意味の品詞を設定
        if (meaningsData.length > 0) {
            const meaningPosSelects = document.querySelectorAll('.meaning-pos');
            meaningsData.forEach((meaning, index) => {
                const pos = typeof meaning === 'object' ? meaning.pos : '';
                if (meaningPosSelects[index] && pos) {
                    meaningPosSelects[index].value = pos;
                }
            });
        }
        
        // サブの意味の品詞を設定
        if (subMeaningsData.length > 0) {
            const subMeaningPosSelects = document.querySelectorAll('.sub-meaning-pos');
            subMeaningsData.forEach((item, index) => {
                const pos = typeof item === 'object' ? item.pos : '';
                if (subMeaningPosSelects[index] && pos) {
                    subMeaningPosSelects[index].value = pos;
                }
            });
        }
        
        // 編集モード用：既存の意味に基づいて英訳セクションを手動生成
        try {
            const translations = JSON.parse(card.translation || '[]');
            
            // 完成レベルの場合、意味ごとに英訳セクションを生成
            translationsContainer.innerHTML = '';
            meaningsData.forEach((meaning, index) => {
                const meaningText = typeof meaning === 'object' ? meaning.text : meaning;
                const translation = translations[index] || '';
                
                const div = document.createElement('div');
                div.className = 'translation-input-group';
                div.setAttribute('data-translation-index', index);
                div.style.cssText = 'margin: 15px 0; padding: 12px; background: #fafafa; border-radius: 6px; border-left: 4px solid #2e7d32;';
                div.innerHTML = `
                    <div style="font-size: 13px; font-weight: bold; color: #555; margin-bottom: 10px;">${meaningText}</div>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" class="translation" placeholder="英訳を入力" value="${translation}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                        <button type="button" class="remove-translation-section" style="padding: 8px 12px; background: #ffebee; color: #c62828; border: 1px solid #c62828; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
                    </div>
                `;
                translationsContainer.appendChild(div);
                div.querySelector('.translation').addEventListener('input', updatePreview);
                
                // 削除ボタンのイベント
                div.querySelector('.remove-translation-section').addEventListener('click', function() {
                    div.remove();
                    updatePreview();
                });
            });
        } catch (e) {
            console.error('英訳のパースエラー:', e);
        }
        
        // 編集モード用：既存の意味と例文に基づいてセクションを手動生成
        try {
            const examples = JSON.parse(card.exampleSentences || '[]');
            
            // まず例文セクションをクリア
            examplesContainer.innerHTML = '';
            
            // 意味ごとに例文セクションを生成
            const allMeanings = [
                ...meaningsData.map(m => typeof m === 'object' ? m.text : m),
                ...subMeaningsData.map(m => typeof m === 'object' ? m.text : m)
            ];
            
            // 全ての意味に対して例文セクションを生成（例文データがあってもなくても）
            allMeanings.forEach((meaningText, index) => {
                const exampleItem = examples[index] || {};
                const example = typeof exampleItem === 'object' ? exampleItem.example : exampleItem;
                
                const exampleSection = document.createElement('div');
                exampleSection.style.cssText = 'margin: 15px 0; padding: 12px; background: #fafafa; border-radius: 6px; border-left: 4px solid #2e7d32;';
                exampleSection.setAttribute('data-meaning', meaningText);
                exampleSection.innerHTML = `
                    <div style="font-size: 13px; font-weight: bold; color: #555; margin-bottom: 10px;">${meaningText}</div>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" class="example" placeholder="例文を入力" value="${example || ''}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                        <button type="button" class="remove-example-section" style="padding: 8px 12px; background: #ffebee; color: #c62828; border: 1px solid #c62828; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
                    </div>
                `;
                examplesContainer.appendChild(exampleSection);
                
                // 削除ボタンのイベント
                exampleSection.querySelector('.remove-example-section').addEventListener('click', function() {
                    exampleSection.remove();
                    updatePreview();
                });
                
                // 入力欄の入力イベント
                exampleSection.querySelector('.example').addEventListener('input', updatePreview);
            });
        } catch (e) {
            console.error('例文のパースエラー:', e);
        }
        
        // 類義語、対義語、派生語
        loadArrayField(card.synonyms, synonymsContainer, 'synonym', 3);
        loadArrayField(card.antonyms, antonymsContainer, 'antonym', 1);
        loadArrayField(card.derivedWords, derivativesContainer, 'derivative', 3);
        
        // 例文
        try {
            const examples = JSON.parse(card.exampleSentences || '[]');
            if (Array.isArray(examples) && examples.length > 0) {
                const exampleInputs = examplesContainer.querySelectorAll('.example');
                examples.forEach((item, index) => {
                    const example = typeof item === 'object' ? item.example : item;
                    if (exampleInputs[index]) {
                        exampleInputs[index].value = example || '';
                    }
                });
            }
        } catch (e) {
            console.error('例文のパースエラー:', e);
        }
        
        // チャンク例文
        try {
            const chunkExamples = JSON.parse(card.chunkExamples || '[]');
            if (Array.isArray(chunkExamples) && chunkExamples.length > 0) {
                chunkExamplesContainer.innerHTML = '';
                chunkExamples.forEach(item => {
                    const example = typeof item === 'object' ? item.example : item;
                    const meaning = typeof item === 'object' ? item.meaning : '';
                    const div = document.createElement('div');
                    div.className = 'chunk-example-input';
                    div.innerHTML = `
                        <input type="text" class="chunk-example" placeholder="チャンク例文を入力" value="${example}">
                        <input type="text" class="chunk-example-meaning" placeholder="意味を入力" value="${meaning}">
                        <button type="button" class="remove-chunk-example">－</button>
                    `;
                    chunkExamplesContainer.appendChild(div);
                });
            }
        } catch (e) {
            console.error('チャンク例文のパースエラー:', e);
        }
        
        // よく使う表現
        try {
            const phraseExamples = JSON.parse(card.commonExpressions || '[]');
            if (Array.isArray(phraseExamples) && phraseExamples.length > 0) {
                phraseExamplesContainer.innerHTML = '';
                phraseExamples.forEach(item => {
                    const example = typeof item === 'object' ? item.example : item;
                    const meaning = typeof item === 'object' ? item.meaning : '';
                    const div = document.createElement('div');
                    div.className = 'phrase-example-input';
                    div.innerHTML = `
                        <input type="text" class="phrase-example" placeholder="よく使う表現の例文を入力" value="${example}">
                        <input type="text" class="phrase-example-meaning" placeholder="意味を入力" value="${meaning}">
                        <button type="button" class="remove-phrase-example">－</button>
                    `;
                    phraseExamplesContainer.appendChild(div);
                });
            }
        } catch (e) {
            console.error('よく使う表現のパースエラー:', e);
        }
        
        // 画像URLとメモ
        document.getElementById('imageUrl').value = card.imageUrl || '';
        document.getElementById('memo').value = card.memo || '';
        charCount.textContent = (card.memo || '').length;
        
        // infoPlusProgress（編集モード用）
        const currentProgress = card.infoPlusProgress !== null && card.infoPlusProgress !== undefined ? card.infoPlusProgress : 0;
        const infoPlusProgressSelect = document.getElementById('infoPlusProgress');
        const currentProgressDisplay = document.getElementById('currentProgressDisplay');
        const currentProgressValue = document.getElementById('currentProgressValue');
        const progressEditCheckbox = document.getElementById('progressEditCheckbox');
        const enableProgressEdit = document.getElementById('enableProgressEdit');
        
        if (infoPlusProgressSelect) {
            // 編集モード用：すべての選択肢（0〜7）を生成
            const progressLabels = {
                0: '基本の意味のみ',
                1: 'サブの意味・対義語',
                2: '派生語',
                3: '類義語',
                4: '例文',
                5: 'チャンク例文',
                6: 'よく使う表現',
                7: '英訳'
            };
            
            // オプションを生成（currentProgressにselected属性を付ける）
            let options = '<option value="">未設定</option>';
            for (let i = 0; i <= 7; i++) {
                const selected = i === currentProgress ? ' selected' : '';
                options += `<option value="${i}"${selected}>${i}（${progressLabels[i]}）</option>`;
            }
            infoPlusProgressSelect.innerHTML = options;
            
            // 現在の進捗を表示
            if (currentProgressDisplay && currentProgressValue) {
                currentProgressDisplay.style.display = 'block';
                currentProgressValue.textContent = `${currentProgress}（${progressLabels[currentProgress]}）`;
            }
            
            // チェックボックスを表示
            if (progressEditCheckbox) {
                progressEditCheckbox.style.display = 'block';
            }
            
            // チェックボックスのイベントリスナー
            if (enableProgressEdit) {
                enableProgressEdit.addEventListener('change', function() {
                    if (this.checked) {
                        // チェックされたら編集可能に
                        infoPlusProgressSelect.disabled = false;
                        infoPlusProgressSelect.style.backgroundColor = '';
                        infoPlusProgressSelect.style.cursor = '';
                    } else {
                        // チェックが外されたら編集不可にして元の値に戻す
                        infoPlusProgressSelect.disabled = true;
                        infoPlusProgressSelect.style.backgroundColor = '#f5f5f5';
                        infoPlusProgressSelect.style.cursor = 'not-allowed';
                        // 値をリセット
                        const options = infoPlusProgressSelect.querySelectorAll('option');
                        options.forEach(opt => {
                            opt.selected = (opt.value === currentProgress.toString());
                        });
                    }
                });
            }
        }
        
        // プレビュー更新
        updatePreview();
    }
    
    // 配列フィールドを読み込む補助関数
    function loadArrayField(jsonStr, container, className, maxCount) {
        try {
            const array = JSON.parse(jsonStr || '[]');
            if (Array.isArray(array) && array.length > 0) {
                container.innerHTML = '';
                array.forEach((value, index) => {
                    const div = document.createElement('div');
                    div.className = `${className}-input`;
                    const showRemove = maxCount > 1 && index > 0;
                    div.innerHTML = `
                        <input type="text" class="${className}" placeholder="${className}を入力" value="${value}">
                        ${showRemove ? `<button type="button" class="remove-${className}">－</button>` : ''}
                    `;
                    container.appendChild(div);
                });
            }
        } catch (e) {
            console.error(`${className}のパースエラー:`, e);
        }
    }

    function toggleSections(level) {
        const rank = levelRank(level);
        // フォーム側のセクション表示切替
        document.querySelectorAll('[data-min-level]').forEach(group => {
            const min = group.dataset.minLevel;
            const show = levelRank(min) <= rank;
            group.style.display = show ? '' : 'none';
            if (!show) {
                resetGroup(group.id);
            }
        });
        
        // プレビュー側の表示切替
        const previewMap = [
            { id: 'previewTranslationsSection', min: '完成' },
            { id: 'previewSubMeaningsSection', min: '中級' },
            { id: 'previewDerivativesSection', min: '中級' },
            { id: 'previewSynAntsSection', min: '中級' },
            { id: 'previewExamples', min: '上級' }
        ];
        previewMap.forEach(({ id, min }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const show = levelRank(min) <= rank;
            el.style.display = show ? '' : 'none';
        });
        bindDynamicInputs();
        syncTranslationsToMeanings();
    }

    // 品詞チェックボックスの処理
    const posCheckboxes = document.querySelectorAll('.pos-checkbox');
    
    posCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateMeaningPosOptions();
            updatePreview();
        });
    });
    
    // 意味の品詞ドロップダウンを更新
    function updateMeaningPosOptions() {
        const selectedPos = Array.from(document.querySelectorAll('.pos-checkbox:checked'))
            .map(cb => cb.value);
        
        // 基本の意味のドロップダウンを更新
        document.querySelectorAll('.meaning-pos').forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">品詞選択</option>' +
                selectedPos.map(pos => `<option value="${pos}">${pos}</option>`).join('');
            // 前の選択を保持（可能な場合）
            if (selectedPos.includes(currentValue)) {
                select.value = currentValue;
            }
        });
        
        // サブの意味のドロップダウンを更新
        document.querySelectorAll('.sub-meaning-pos').forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">品詞選択</option>' +
                selectedPos.map(pos => `<option value="${pos}">${pos}</option>`).join('');
            if (selectedPos.includes(currentValue)) {
                select.value = currentValue;
            }
        });
    }

        // テキスト入力のリアルタイム反映
        wordInput.addEventListener('input', updatePreview);
        pronInput.addEventListener('input', updatePreview);
        imageInput.addEventListener('input', updatePreview);

    // 意味の追加
    addMeaningBtn.addEventListener('click', function() {
        const meaningInputs = meaningsContainer.querySelectorAll('.meaning-input');
        if (meaningInputs.length < 3) { // 最大3個まで
            const newInput = document.createElement('div');
            newInput.className = 'meaning-input';
            newInput.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
            
            // 選択された品詞を取得
            const selectedPos = Array.from(document.querySelectorAll('.pos-checkbox:checked'))
                .map(cb => cb.value);
            
            newInput.innerHTML = `
                <input type="text" class="meaning" placeholder="意味を入力" required style="flex: 1;">
                <select class="meaning-pos" style="width: 100px;">
                    <option value="">品詞選択</option>
                    ${selectedPos.map(pos => `<option value="${pos}">${pos}</option>`).join('')}
                </select>
                <button type="button" class="remove-meaning" style="padding: 8px 12px; background: #ffebee; color: #c62828; border: 1px solid #c62828; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
            `;
            meaningsContainer.appendChild(newInput);

            // 新しい入力欄のプレビュー連動と自動例文セクション生成
            attachMeaningAutoGenerateListener(newInput);

            // 削除ボタンのイベント
            newInput.querySelector('.remove-meaning').addEventListener('click', function() {
                if (meaningsContainer.querySelectorAll('.meaning-input').length > 1) {
                    const meaningValue = newInput.querySelector('.meaning').value.trim();
                    // 対応する例文セクションを削除
                    examplesContainer.querySelectorAll('div').forEach(section => {
                        const label = section.querySelector('div:first-child');
                        if (label && label.textContent.includes(meaningValue)) {
                            section.remove();
                        }
                    });
                    newInput.remove();
                    updatePreview();
                    syncTranslationsToMeanings();
                } else {
                    alert('意味は最低1つ必要です');
                }
            });

            updatePreview();
            syncTranslationsToMeanings();
        } else {
            alert('意味は最大3つまで追加できます');
        }
    });

    // サブの意味追加（最大2）
    addSubMeaningBtn?.addEventListener('click', function() {
        const rows = subMeaningsContainer.querySelectorAll('.sub-meaning-input');
        if (rows.length >= 2) {
            alert('サブの意味は最大2つまでです');
            return;
        }
        const row = document.createElement('div');
        row.className = 'sub-meaning-input';
        row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        
        // 選択された品詞を取得
        const selectedPos = Array.from(document.querySelectorAll('.pos-checkbox:checked'))
            .map(cb => cb.value);
        
        row.innerHTML = `
            <input type="text" class="sub-meaning" placeholder="サブの意味を入力" style="flex: 1;">
            <select class="sub-meaning-pos" style="width: 100px;">
                <option value="">品詞選択</option>
                ${selectedPos.map(pos => `<option value="${pos}">${pos}</option>`).join('')}
            </select>
            <button type="button" class="remove-sub-meaning" style="padding: 8px 12px; background: #ffebee; color: #c62828; border: 1px solid #c62828; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
        `;
        subMeaningsContainer.appendChild(row);
        
        // 自動例文セクション生成リスナーを追加
        attachMeaningAutoGenerateListener(row);
        
        row.querySelector('.remove-sub-meaning').addEventListener('click', () => {
            const subMeaningValue = row.querySelector('.sub-meaning').value.trim();
            // 対応する例文セクションを削除
            examplesContainer.querySelectorAll('div').forEach(section => {
                const label = section.querySelector('div:first-child');
                if (label && label.textContent.includes(subMeaningValue)) {
                    section.remove();
                }
            });
            row.remove();
            updatePreview();
        });

        updatePreview();
    });

    // 類義語追加（最大3）
    addSynonymBtn?.addEventListener('click', function() {
        const rows = synonymsContainer.querySelectorAll('.synonym-input');
        if (rows.length >= 3) {
            alert('類義語は最大3つまでです');
            return;
        }
        const row = document.createElement('div');
        row.className = 'synonym-input';
        row.innerHTML = `
            <input type="text" class="synonym" placeholder="類義語を入力">
            <button type="button" class="remove-synonym">－</button>
        `;
        synonymsContainer.appendChild(row);
        row.querySelector('.synonym').addEventListener('input', updatePreview);
        row.querySelector('.remove-synonym').addEventListener('click', () => {
            row.remove();
            updateSynonymRemoveButtons();
            updatePreview();
        });
        updateSynonymRemoveButtons();
        updatePreview();
    });

    function updateSynonymRemoveButtons() {
        const rows = synonymsContainer?.querySelectorAll('.synonym-input') || [];
        const minusButtons = synonymsContainer?.querySelectorAll('.remove-synonym') || [];
        minusButtons.forEach(btn => {
            btn.style.display = rows.length > 1 ? 'inline-block' : 'none';
        });
    }

    // 派生語追加（最大3）
    addDerivativeBtn?.addEventListener('click', function() {
        const rows = derivativesContainer.querySelectorAll('.derivative-input');
        if (rows.length >= 3) {
            alert('派生語は最大3つまでです');
            return;
        }
        const row = document.createElement('div');
        row.className = 'derivative-input';
        row.innerHTML = `
            <input type="text" class="derivative" placeholder="派生語を入力">
            <button type="button" class="remove-derivative">－</button>
        `;
        derivativesContainer.appendChild(row);
        row.querySelector('.derivative').addEventListener('input', updatePreview);
        row.querySelector('.remove-derivative').addEventListener('click', () => {
            row.remove();
            updateDerivativeRemoveButtons();
            updatePreview();
        });
        updateDerivativeRemoveButtons();
        updatePreview();
    });

    function updateDerivativeRemoveButtons() {
        const rows = derivativesContainer?.querySelectorAll('.derivative-input') || [];
        const minusButtons = derivativesContainer?.querySelectorAll('.remove-derivative') || [];
        minusButtons.forEach(btn => {
            btn.style.display = rows.length > 1 ? 'inline-block' : 'none';
        });
    }

    // 例文の最大数は基本+サブ
    // 例文追加（上限は意味+サブ）
    // チャンク例文（最大4）
    addChunkExampleBtn?.addEventListener('click', function() {
        const rows = chunkExamplesContainer.querySelectorAll('.chunk-example-input');
        if (rows.length >= 4) {
            alert('チャンク例文は最大4つまでです');
            return;
        }
        const row = document.createElement('div');
        row.className = 'chunk-example-input';
        row.innerHTML = `
            <input type="text" class="chunk-example" placeholder="チャンク例文を入力">
            <input type="text" class="chunk-example-meaning" placeholder="意味を入力">
            <button type="button" class="remove-chunk-example">－</button>
        `;
        chunkExamplesContainer.appendChild(row);
        row.querySelector('.chunk-example').addEventListener('input', updatePreview);
        row.querySelector('.chunk-example-meaning').addEventListener('input', updatePreview);
        row.querySelector('.remove-chunk-example').addEventListener('click', () => {
            row.remove();
            updateChunkExampleRemoveButtons();
            updatePreview();
        });
        updateChunkExampleRemoveButtons();
        updatePreview();
    });

    function updateChunkExampleRemoveButtons() {
        const rows = chunkExamplesContainer?.querySelectorAll('.chunk-example-input') || [];
        const minusButtons = chunkExamplesContainer?.querySelectorAll('.remove-chunk-example') || [];
        minusButtons.forEach(btn => {
            btn.style.display = rows.length > 1 ? 'inline-block' : 'none';
        });
    }

    // よく使う表現（最大4）
    addPhraseExampleBtn?.addEventListener('click', function() {
        const rows = phraseExamplesContainer.querySelectorAll('.phrase-example-input');
        if (rows.length >= 4) {
            alert('よく使う表現の例文は最大4つまでです');
            return;
        }
        const row = document.createElement('div');
        row.className = 'phrase-example-input';
        row.innerHTML = `
            <input type="text" class="phrase-example" placeholder="よく使う表現の例文を入力">
            <input type="text" class="phrase-example-meaning" placeholder="意味を入力">
            <button type="button" class="remove-phrase-example">－</button>
        `;
        phraseExamplesContainer.appendChild(row);
        row.querySelector('.phrase-example').addEventListener('input', updatePreview);
        row.querySelector('.phrase-example-meaning').addEventListener('input', updatePreview);
        row.querySelector('.remove-phrase-example').addEventListener('click', () => {
            row.remove();
            updatePhraseExampleRemoveButtons();
            updatePreview();
        });
        updatePhraseExampleRemoveButtons();
        updatePreview();
    });

    function updatePhraseExampleRemoveButtons() {
        const rows = phraseExamplesContainer?.querySelectorAll('.phrase-example-input') || [];
        const minusButtons = phraseExamplesContainer?.querySelectorAll('.remove-phrase-example') || [];
        minusButtons.forEach(btn => {
            btn.style.display = rows.length > 1 ? 'inline-block' : 'none';
        });
    }

    // 基本の意味に合わせて英訳欄を同期（完成のみ）
    function syncTranslationsToMeanings() {
        if (document.getElementById('translationsGroup')?.style.display === 'none') return;
        
        // 完成レベルの場合：意味ごとに英訳入力欄を動的に管理
        if (selectedLevel === '完成') {
            // 意味の入力欄にリスナーを付与
            const meaningInputs = meaningsContainer.querySelectorAll('.meaning');
            meaningInputs.forEach((meaningInput, index) => {
                // 既にリスナーが付与されていない場合のみ追加
                if (!meaningInput.hasAttribute('data-translation-listener')) {
                    meaningInput.setAttribute('data-translation-listener', 'true');
                    meaningInput.setAttribute('data-meaning-index', index);
                    let previousValue = '';
                    
                    meaningInput.addEventListener('input', function() {
                        const meaningValue = this.value.trim();
                        const meaningIndex = this.getAttribute('data-meaning-index');
                        
                        // 前の値の英訳入力欄を削除
                        if (previousValue) {
                            const oldSection = translationsContainer.querySelector(`div[data-translation-index="${meaningIndex}"]`);
                            if (oldSection) oldSection.remove();
                        }
                        
                        // 新しい値の場合、英訳入力欄を作成
                        if (meaningValue) {
                            const existingSection = translationsContainer.querySelector(`div[data-translation-index="${meaningIndex}"]`);
                            if (!existingSection) {
                                const div = document.createElement('div');
                                div.className = 'translation-input-group';
                                div.setAttribute('data-translation-index', meaningIndex);
                                div.style.cssText = 'margin: 15px 0; padding: 12px; background: #fafafa; border-radius: 6px; border-left: 4px solid #2e7d32;';
                                div.innerHTML = `
                                    <div style="font-size: 13px; font-weight: bold; color: #555; margin-bottom: 10px;">${meaningValue}</div>
                                    <div style="display: flex; gap: 10px;">
                                        <input type="text" class="translation" placeholder="英訳を入力" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                                        <button type="button" class="remove-translation-section" style="padding: 8px 12px; background: #ffebee; color: #c62828; border: 1px solid #c62828; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
                                    </div>
                                `;
                                translationsContainer.appendChild(div);
                                div.querySelector('.translation').addEventListener('input', updatePreview);
                                
                                // 削除ボタンのイベント
                                div.querySelector('.remove-translation-section').addEventListener('click', function() {
                                    div.remove();
                                    updatePreview();
                                });
                            } else {
                                // 既存セクションの意味ラベルを更新
                                existingSection.querySelector('div:first-child').textContent = meaningValue;
                            }
                        }
                        
                        previousValue = meaningValue;
                        updatePreview();
                    });
                }
            });
            return;
        }
        
        // その他のレベル：従来の行数合わせ
        let meaningCount = meaningsContainer.querySelectorAll('.meaning-input').length;
        let transCount = translationsContainer.querySelectorAll('.translation-input').length;
        while (transCount < meaningCount) {
            const row = document.createElement('div');
            row.className = 'translation-input';
            row.innerHTML = `<input type="text" class="translation" placeholder="英訳を入力">`;
            translationsContainer.appendChild(row);
            row.querySelector('.translation').addEventListener('input', updatePreview);
            transCount++;
        }
        while (transCount > meaningCount && transCount > 0) {
            const last = translationsContainer.querySelector('.translation-input:last-child');
            if (last) last.remove();
            transCount--;
        }
    }

    function resetGroup(groupId) {
        switch (groupId) {
            case 'translationsGroup':
                translationsContainer.innerHTML = `
                    <div class="translation-input">
                        <input type="text" class="translation" placeholder="英訳を入力">
                    </div>
                `;
                break;
            case 'subMeaningsGroup':
                subMeaningsContainer.innerHTML = `
                    <div class="sub-meaning-input" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                        <input type="text" class="sub-meaning" placeholder="サブの意味を入力" style="flex: 1;">
                        <select class="sub-meaning-pos" style="width: 100px;">
                            <option value="">品詞選択</option>
                        </select>
                    </div>
                `;
                break;
            case 'synonymsGroup':
                synonymsContainer.innerHTML = `
                    <div class="synonym-input">
                        <input type="text" class="synonym" placeholder="類義語を入力">
                        <button type="button" class="remove-synonym" style="display:none;">－</button>
                    </div>
                `;
                updateSynonymRemoveButtons();
                break;
            case 'antonymsGroup':
                antonymsContainer.innerHTML = `
                    <div class="antonym-input">
                        <input type="text" class="antonym" placeholder="対義語を入力">
                    </div>
                `;
                break;
            case 'derivativesGroup':
                derivativesContainer.innerHTML = `
                    <div class="derivative-input">
                        <input type="text" class="derivative" placeholder="派生語を入力">
                        <button type="button" class="remove-derivative" style="display:none;">－</button>
                    </div>
                `;
                updateDerivativeRemoveButtons();
                break;
            case 'chunkExamplesGroup':
                chunkExamplesContainer.innerHTML = `
                    <div class="chunk-example-input">
                        <input type="text" class="chunk-example" placeholder="チャンク例文を入力">
                        <button type="button" class="remove-chunk-example" style="display:none;">－</button>
                    </div>
                `;
                updateChunkExampleRemoveButtons();
                break;
            case 'phraseExamplesGroup':
                phraseExamplesContainer.innerHTML = `
                    <div class="phrase-example-input">
                        <input type="text" class="phrase-example" placeholder="よく使う表現の例文を入力">
                        <button type="button" class="remove-phrase-example" style="display:none;">－</button>
                    </div>
                `;
                updatePhraseExampleRemoveButtons();
                break;
            default:
                break;
        }
    }

    function resetOptionalSections() {
        resetGroup('translationsGroup');
        resetGroup('subMeaningsGroup');
        resetGroup('synonymsGroup');
        resetGroup('antonymsGroup');
        resetGroup('derivativesGroup');
        resetGroup('examplesGroup');
        resetGroup('chunkExamplesGroup');
        resetGroup('phraseExamplesGroup');
        bindDynamicInputs();
    }

    function isGroupVisible(groupId) {
        const el = document.getElementById(groupId);
        if (!el) return false;
        return el.style.display !== 'none';
    }

    function collectValues(container, selector, limit = Infinity) {
        if (!container) return [];
        return Array.from(container.querySelectorAll(selector))
            .map(input => input.value.trim())
            .filter(Boolean)
            .slice(0, limit);
    }

    function bindDynamicInputs() {
        // 類義語
        synonymsContainer?.querySelectorAll('.remove-synonym').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.synonym-input');
                row?.remove();
                updateSynonymRemoveButtons();
                updatePreview();
            });
        });
        synonymsContainer?.querySelectorAll('.synonym').forEach(inp => inp.addEventListener('input', updatePreview));

        // 派生語
        derivativesContainer?.querySelectorAll('.remove-derivative').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.derivative-input');
                row?.remove();
                updateDerivativeRemoveButtons();
                updatePreview();
            });
        });
        derivativesContainer?.querySelectorAll('.derivative').forEach(inp => inp.addEventListener('input', updatePreview));

        // 例文
        examplesContainer?.querySelectorAll('.remove-example').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.example-input');
                row?.remove();
                updateExampleRemoveButtons();
                updatePreview();
            });
        });
        examplesContainer?.querySelectorAll('.example').forEach(inp => inp.addEventListener('input', updatePreview));

        // チャンク例文
        chunkExamplesContainer?.querySelectorAll('.remove-chunk-example').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.chunk-example-input');
                row?.remove();
                updateChunkExampleRemoveButtons();
                updatePreview();
            });
        });
        chunkExamplesContainer?.querySelectorAll('.chunk-example').forEach(inp => inp.addEventListener('input', updatePreview));

        // よく使う表現
        phraseExamplesContainer?.querySelectorAll('.remove-phrase-example').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.phrase-example-input');
                row?.remove();
                updatePhraseExampleRemoveButtons();
                updatePreview();
            });
        });
        phraseExamplesContainer?.querySelectorAll('.phrase-example').forEach(inp => inp.addEventListener('input', updatePreview));

        // 英訳
        translationsContainer?.querySelectorAll('.translation').forEach(inp => inp.addEventListener('input', updatePreview));
    }

    // 意味行に「例文を追加」ボタンのイベントリスナーを付与
    // 意味の入力に応じて自動で例文セクションを生成
    function attachMeaningAutoGenerateListener(meaningRow) {
        const meaningInput = meaningRow.querySelector('.meaning, .sub-meaning');
        if (!meaningInput) return;

        // 前の値を保存
        let previousValue = '';

        meaningInput.addEventListener('input', function() {
            const meaningValue = this.value.trim();
            
            // 前の値のセクションを削除
            if (previousValue) {
                const oldSection = examplesContainer.querySelector(`div[data-meaning="${previousValue}"]`);
                if (oldSection) {
                    oldSection.remove();
                }
            }

            // 入力値がある場合、セクションを作成
            if (meaningValue) {
                const exampleSection = document.createElement('div');
                exampleSection.style.cssText = 'margin: 15px 0; padding: 12px; background: #fafafa; border-radius: 6px; border-left: 4px solid #2e7d32;';
                exampleSection.setAttribute('data-meaning', meaningValue);
                exampleSection.innerHTML = `
                    <div style="font-size: 13px; font-weight: bold; color: #555; margin-bottom: 10px;">${meaningValue}</div>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" class="example" placeholder="例文を入力" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                        <button type="button" class="remove-example-section" style="padding: 8px 12px; background: #ffebee; color: #c62828; border: 1px solid #c62828; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
                    </div>
                `;

                examplesContainer.appendChild(exampleSection);

                // 削除ボタンのイベント
                exampleSection.querySelector('.remove-example-section').addEventListener('click', function() {
                    exampleSection.remove();
                    updatePreview();
                });

                // 入力欄の入力イベント
                exampleSection.querySelector('.example').addEventListener('input', updatePreview);
            }
            
            // 前の値を更新
            previousValue = meaningValue;
            updatePreview();
        });
    }

    // 初期状態の意味行にリスナーを付与
    function initializeMeaningListeners() {
        meaningsContainer.querySelectorAll('.meaning-input').forEach(row => {
            attachMeaningAutoGenerateListener(row);
        });
        subMeaningsContainer.querySelectorAll('.sub-meaning-input').forEach(row => {
            attachMeaningAutoGenerateListener(row);
        });
    }

    // フォームのクリア
    clearFormBtn.addEventListener('click', function() {
        if (confirm('入力内容をクリアしますか？')) {
            form.reset();
            // チェックボックスをクリア
            document.querySelectorAll('.pos-checkbox').forEach(cb => cb.checked = false);
            charCount.textContent = '0';
            
            // 意味の入力欄を1つに戻す
            meaningsContainer.innerHTML = `
                <div class="meaning-input" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                    <input type="text" class="meaning" placeholder="意味を入力" required style="flex: 1;">
                    <select class="meaning-pos" style="width: 100px;">
                        <option value="">品詞選択</option>
                    </select>
                </div>
            `;
            // サブの意味をクリア
            const subMeaningsGroup = document.getElementById('subMeaningsGroup');
            if (subMeaningsGroup && subMeaningsGroup.style.display !== 'none') {
                subMeaningsContainer.innerHTML = `
                    <div class="sub-meaning-input" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                        <input type="text" class="sub-meaning" placeholder="サブの意味を入力" style="flex: 1;">
                        <select class="sub-meaning-pos" style="width: 100px;">
                            <option value="">品詞選択</option>
                        </select>
                    </div>
                `;
            }
            // 例文をクリア
            examplesContainer.innerHTML = '';
            resetOptionalSections();
            initializeMeaningListeners();
            toggleSections(selectedLevel);
            syncTranslationsToMeanings();
            updateExampleMaxCount();
            updatePreview();
        }
    });

    // フォームの送信
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 品詞の収集（複数選択対応）
        const partOfSpeech = Array.from(document.querySelectorAll('.pos-checkbox:checked'))
            .map(cb => cb.value);

        if (partOfSpeech.length === 0) {
            alert('品詞を1つ以上選択してください');
            return;
        }

        // 基本の意味の収集（品詞付き）
        const meaningsData = [];
        const meaningInputs = document.querySelectorAll('.meaning-input');
        for (let i = 0; i < meaningInputs.length; i++) {
            const input = meaningInputs[i];
            const text = input.querySelector('.meaning')?.value.trim();
            const pos = input.querySelector('.meaning-pos')?.value;
            
            if (text) {
                if (!pos) {
                    alert(`意味${i + 1}の品詞を選択してください`);
                    return;
                }
                meaningsData.push({ text, pos });
            }
        }

        if (meaningsData.length === 0) {
            alert('意味を1つ以上入力してください');
            return;
        }

        if (!document.getElementById('word').value.trim()) {
            alert('単語を入力してください');
            return;
        }

        // サブの意味の収集（品詞付き）
        const subMeaningsData = [];
        const subMeaningInputs = Array.from(subMeaningsContainer?.querySelectorAll('.sub-meaning-input') || []);
        for (let i = 0; i < Math.min(subMeaningInputs.length, 2); i++) {
            const input = subMeaningInputs[i];
            const text = input.querySelector('.sub-meaning')?.value.trim();
            const pos = input.querySelector('.sub-meaning-pos')?.value;
            
            if (text) {
                if (!pos) {
                    alert(`サブの意味${i + 1}の品詞を選択してください`);
                    return;
                }
                subMeaningsData.push({ text, pos });
            }
        }
        
        // 完成レベルの場合、動的に生成された英訳入力欄から収集
        let translations;
        if (selectedLevel === '完成') {
            translations = Array.from(translationsContainer.querySelectorAll('.translation-input-group .translation'))
                .map(input => input.value.trim())
                .filter(value => value !== '');
        } else {
            translations = collectValues(translationsContainer, '.translation');
        }
        
        const synonyms = collectValues(synonymsContainer, '.synonym', 3);
        const antonyms = collectValues(antonymsContainer, '.antonym', 1);
        const derivatives = collectValues(derivativesContainer, '.derivative', 3);
        
        // チャンク例文と意味を紐付けて収集
        const chunkExamplesRaw = Array.from(chunkExamplesContainer?.querySelectorAll('.chunk-example-input') || [])
            .map(row => {
                const example = row.querySelector('.chunk-example')?.value.trim() || '';
                const meaning = row.querySelector('.chunk-example-meaning')?.value.trim() || '';
                return { example, meaning };
            });
        
        // チャンク例文のバリデーション：例文と意味は両方入力されているか両方空でなければならない
        for (let i = 0; i < chunkExamplesRaw.length; i++) {
            const item = chunkExamplesRaw[i];
            if ((item.example && !item.meaning) || (!item.example && item.meaning)) {
                alert(`チャンク例文${i + 1}: 例文と意味は両方入力するか、両方空にしてください`);
                return;
            }
        }
        const chunkExamples = chunkExamplesRaw.filter(item => item.example !== '');
        
        // よく使う表現の例文と意味を紐付けて収集
        const phraseExamplesRaw = Array.from(phraseExamplesContainer?.querySelectorAll('.phrase-example-input') || [])
            .map(row => {
                const example = row.querySelector('.phrase-example')?.value.trim() || '';
                const meaning = row.querySelector('.phrase-example-meaning')?.value.trim() || '';
                return { example, meaning };
            });
        
        // よく使う表現の例文のバリデーション：例文と意味は両方入力されているか両方空でなければならない
        for (let i = 0; i < phraseExamplesRaw.length; i++) {
            const item = phraseExamplesRaw[i];
            if ((item.example && !item.meaning) || (!item.example && item.meaning)) {
                alert(`よく使う表現の例文${i + 1}: 例文と意味は両方入力するか、両方空にしてください`);
                return;
            }
        }
        const phraseExamples = phraseExamplesRaw.filter(item => item.example !== '');

        // 例文を収集（意味と紐付けて）
        const exampleSentences = Array.from(examplesContainer.querySelectorAll('div[data-meaning]')).map(section => {
            const meaning = section.getAttribute('data-meaning');
            const example = section.querySelector('.example')?.value.trim() || '';
            return { meaning, example };
        });

        // 難易度に応じてinfoPlusProgressを設定
        let infoPlusProgress = 0;
        if (bookDifficulty === '初級') {
            infoPlusProgress = 0;
        } else {
            // 中級以上は選択された値を使用（未設定の場合はnull）
            const selectedProgress = document.getElementById('infoPlusProgress')?.value;
            infoPlusProgress = selectedProgress !== '' ? Number(selectedProgress) : null;
        }

        const wordData = {
            partOfSpeech: JSON.stringify(partOfSpeech),
            word: document.getElementById('word').value.trim(),
            pronunciation: document.getElementById('pronunciation').value.trim(),
            meanings: JSON.stringify(meaningsData),
            imageUrl: document.getElementById('imageUrl').value.trim(),
            memo: document.getElementById('memo').value.trim(),
            subMeanings: JSON.stringify(subMeaningsData),
            translations,
            synonyms,
            antonyms,
            derivedWords: derivatives,
            exampleSentences,
            chunkExamples,
            commonExpressions: phraseExamples,
            infoPlusProgress: infoPlusProgress,
            reviewDate: new Date().toISOString().split('T')[0], // 作成日を復習日として設定（YYYY-MM-DD形式）
            bookId: bookId ? Number(bookId) : null
        };
        
        // 難易度レベルを設定
        wordData.level = selectedLevel;

        try {
            let response;
            if (isEditMode && editCardId) {
                // 編集モード：infoPlusProgress変更のチェック
                const currentProgress = editCardData?.infoPlusProgress !== null && editCardData?.infoPlusProgress !== undefined ? editCardData.infoPlusProgress : 0;
                const newProgress = infoPlusProgress !== null ? infoPlusProgress : 0;
                
                // 進捗が変更された場合
                if (newProgress !== currentProgress) {
                    // 後退する場合は確認ダイアログ
                    if (newProgress < currentProgress) {
                        const progressLabels = {
                            0: '基本の意味のみ', 1: 'サブの意味・対義語', 2: '派生語', 3: '類義語',
                            4: '例文', 5: 'チャンク例文', 6: 'よく使う表現', 7: '英訳'
                        };
                        const confirmed = confirm(
                            `学習進捗を下げますか？\n` +
                            `${currentProgress}（${progressLabels[currentProgress]}） → ${newProgress}（${progressLabels[newProgress]}）\n\n` +
                            `この操作により以下がリセットされます：\n` +
                            `- 評価値（過去3回分）\n` +
                            `- 復習日（今日に設定）\n` +
                            `- 学習進捗（0に設定）`
                        );
                        if (!confirmed) {
                            return;
                        }
                    }
                    
                    // 進捗が変更された場合は評価値と復習日をリセット
                    // 注意: これらのフィールドはスキーマに存在しないため送信しない
                    // wordData.lastThreeScores = [0, 0, 0];
                    // wordData.nextReviewDate = new Date().toISOString().split('T')[0];
                    // wordData.studyProgress = 0;
                }
                
                // 編集モード：更新処理
                response = await fetch(`/api/wordnote/cards/${editCardId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(wordData)
                });
            } else {
                // 新規作成モード：保存処理
                response = await fetch('/api/wordnote/cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(wordData)
                });
            }

            if (!response.ok) {
                const error = await response.json();
                alert('保存に失敗しました: ' + (error.error || 'Unknown error'));
                return;
            }

            // 成功メッセージ
            if (isEditMode) {
                alert('単語を更新しました！');
                // 編集モードの場合はdisplay.htmlに戻る
                window.location.href = 'display.html';
                return;
            } else {
                alert('単語をデータベースに保存しました！');
            }
            
            // フォームをクリア（新規作成モードのみ）
            form.reset();
            // チェックボックスをクリア
            document.querySelectorAll('.pos-checkbox').forEach(cb => cb.checked = false);
            meaningsContainer.innerHTML = `
                <div class="meaning-input" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                    <input type="text" class="meaning" placeholder="意味を入力" required style="flex: 1;">
                    <select class="meaning-pos" style="width: 100px;">
                        <option value="">品詞選択</option>
                    </select>
                </div>
            `;
            resetOptionalSections();
            charCount.textContent = '0';
            bindMeaningInputs();
            toggleSections(selectedLevel);
            syncTranslationsToMeanings();
            updatePreview();
        } catch (error) {
            console.error('Error:', error);
            alert('通信エラーが発生しました。サーバーが起動しているか確認してください。');
        }
    });

    // --------------- プレビュー更新 ---------------
    function bindMeaningInputs() {
        const meaningInputs = meaningsContainer.querySelectorAll('.meaning');
        meaningInputs.forEach(input => {
            input.addEventListener('input', updatePreview);
        });
    }

    function updatePreview() {
        // 品詞（複数選択対応）
        const selectedPos = Array.from(document.querySelectorAll('.pos-checkbox:checked'))
            .map(cb => cb.value);
        previewPos.textContent = selectedPos.length > 0 ? selectedPos.join(' / ') : '品詞';

        // 単語
        const word = document.getElementById('word').value.trim();
        previewWord.textContent = word || '単語';

        // 発音記号
        const pron = document.getElementById('pronunciation').value.trim();
        previewPron.textContent = pron || '発音記号';

        // 意味（品詞付き）
        const meaningInputs = Array.from(meaningsContainer.querySelectorAll('.meaning-input'));
        const meanings = meaningInputs.map(input => {
            const text = input.querySelector('.meaning')?.value.trim();
            const pos = input.querySelector('.meaning-pos')?.value;
            if (!text) return null;
            return pos ? `${pos}：${text}` : text;
        }).filter(m => m);
        
        if (meanings.length === 0) {
            previewMeanings.innerHTML = '<li>1. 意味</li>';
        } else {
            previewMeanings.innerHTML = meanings
                .slice(0, 3)
                .map((m, idx) => `<li>${idx + 1}. ${m}</li>`)
                .join('');
        }

        // 画像
        const imageUrl = document.getElementById('imageUrl').value.trim();
        if (imageUrl) {
            previewImage.innerHTML = `<img src="${imageUrl}" alt="preview">`;
        } else {
            previewImage.innerHTML = '画像';
        }

        // メモ
        const memo = memoTextarea.value.trim();
        if (memo) {
            previewMemo.innerHTML = '<h3>メモ（任意）</h3><p>' + memo + '</p>';
        } else {
            previewMemo.innerHTML = '<h3>メモ（任意）</h3><p>メモがここに表示されます</p>';
        }
    }

    // 初期バインド（既に難易度が選択されていない場合のみ初級を適用）
    if (!document.querySelector('.difficulty-btn.active')) {
        difficultyButtons[0]?.classList.add('active');
        selectedLevel = difficultyButtons[0]?.dataset.level || selectedLevel;
        toggleSections(selectedLevel);
    }
    bindDynamicInputs();
    updateSynonymRemoveButtons();
    updateDerivativeRemoveButtons();
    updateChunkExampleRemoveButtons();
    updatePhraseExampleRemoveButtons();
    syncTranslationsToMeanings();
    initializeMeaningListeners();
    updatePreview();
});

