// カードのデータを管理する配列(サーバーから取得します)
let cards = [];
let deleteMode = false; // 削除モードのフラグ
let editMode = false; // 編集モードのフラグ
let pendingDeleteId = null; // 削除予定のカードID
let pendingEditId = null; // 編集予定のカードID
let editStoredFront = ''; // 編集中の表の内容
let editStoredBack = ''; // 編集中の裏の内容
let editCurrentMode = 'front'; // 編集中のモード
let addStoredFront = ''; // 追加中の表の内容
let addStoredBack = ''; // 追加中の裏の内容
let addCurrentMode = 'front'; // 追加中のモード

// DOM要素の取得
const flashcardsContainer = document.getElementById('flashcards');
const addCardButton = document.getElementById('addCard');
const btnAdd = document.getElementById('btnAdd');
const btnDelete = document.getElementById('btnDelete');
const btnEdit = document.getElementById('btnEdit');
const backLink = document.getElementById('backLink');
const currentFolderNameEl = document.getElementById('currentFolderName');

// 戻るボタンの処理
if (backLink) {
    backLink.addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
    });
}
const deleteModal = document.getElementById('deleteModal');
const deleteMessage = document.getElementById('deleteMessage');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');

// 追加モーダル要素
const addModal = document.getElementById('addModal');
const addEditor = document.getElementById('addEditor');
const addPreviewFront = document.getElementById('addPreviewFront');
const addPreviewBack = document.getElementById('addPreviewBack');
const addPreviewMessage = document.getElementById('addPreviewMessage');
const addBtnFront = document.getElementById('addBtnFront');
const addBtnBack = document.getElementById('addBtnBack');
const confirmAddBtn = document.getElementById('confirmAdd');
const cancelAddBtn = document.getElementById('cancelAdd');

// 編集モーダル要素
const editModal = document.getElementById('editModal');
const editEditor = document.getElementById('editEditor');
const editPreviewFront = document.getElementById('editPreviewFront');
const editPreviewBack = document.getElementById('editPreviewBack');
const editBtnFront = document.getElementById('editBtnFront');
const editBtnBack = document.getElementById('editBtnBack');
const confirmEditBtn = document.getElementById('confirmEdit');
const cancelEditBtn = document.getElementById('cancelEdit');

// left panel elements (may not exist in older version but were added to HTML)
const btnFront = document.getElementById('btnFront');
const btnBack = document.getElementById('btnBack');
const editor = document.getElementById('editor');
const previewFront = document.getElementById('previewFront');
const previewBack = document.getElementById('previewBack');

let currentMode = 'front';
// store per-side inputs so switching preserves content
let storedFront = previewFront && previewFront.textContent !== '(未設定)' ? previewFront.textContent : '';
let storedBack = previewBack && previewBack.textContent !== '(未設定)' ? previewBack.textContent : '';

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
        card.addEventListener('click', async (e) => {
            if (deleteMode) {
                // 削除モードの場合、確認モーダルを表示
                const id = card.getAttribute('data-id');
                if (!id) return;
                
                // カードの内容を取得して確認メッセージに表示
                const frontText = card.querySelector('.card-front').textContent;
                const backText = card.querySelector('.card-back').textContent;
                const confirmMessage = `以下のカードを削除してもよろしいですか？\n\n表: ${frontText}\n裏: ${backText}`;
                
                // モーダルに情報を設定
                pendingDeleteId = id;
                if (deleteMessage) deleteMessage.textContent = confirmMessage;
                if (deleteModal) deleteModal.classList.add('show');
            } else if (editMode) {
                // 編集モードの場合、編集モーダルを表示
                const id = card.getAttribute('data-id');
                if (!id) return;
                
                const frontText = card.querySelector('.card-front').textContent;
                const backText = card.querySelector('.card-back').textContent;
                
                // 編集モーダルに現在の内容を設定
                pendingEditId = id;
                editStoredFront = frontText;
                editStoredBack = backText;
                editCurrentMode = 'front';
                
                if (editEditor) editEditor.value = frontText;
                if (editPreviewFront) editPreviewFront.textContent = frontText;
                if (editPreviewBack) editPreviewBack.textContent = backText;
                if (editBtnFront) editBtnFront.classList.add('active');
                if (editBtnBack) editBtnBack.classList.remove('active');
                if (editModal) editModal.classList.add('show');
            } else {
                // 通常モードの場合、カードをめくる
                card.classList.toggle('flipped');
            }
        });
    });
}

// 追加ボタンのクリックイベント
if (btnAdd) {
    btnAdd.addEventListener('click', () => {
        // モーダルを開く前にフォームをリセット
        addStoredFront = '';
        addStoredBack = '';
        addCurrentMode = 'front';
        if (addEditor) addEditor.value = '';
        if (addPreviewFront) addPreviewFront.textContent = '(未設定)';
        if (addPreviewBack) addPreviewBack.textContent = '(未設定)';
        if (addPreviewMessage) addPreviewMessage.textContent = '';
        if (addBtnFront) addBtnFront.classList.add('active');
        if (addBtnBack) addBtnBack.classList.remove('active');
        if (addModal) addModal.classList.add('show');
    });
}

// 新しいカードを追加する関数（モーダル版）
async function addNewCard() {
    // Use stored values for validation
    const front = addStoredFront || '';
    const back = addStoredBack || '';
    const msgEl = addPreviewMessage;
    // Clear previous messages
    if (msgEl) msgEl.textContent = '';

    // Validation: if both empty -> show message and prevent add
    if (!front && !back) {
        if (msgEl) msgEl.textContent = '表と裏の両方に入力がありません。';
        return;
    }
    // If front missing
    if (!front) {
        if (msgEl) msgEl.textContent = '表に入力がありません。表に入力してください。';
        return;
    }
    // If back missing
    if (!back) {
        if (msgEl) msgEl.textContent = '裏に入力がありません。裏に入力してください。';
        return;
    }

    // Both present -> send to server
    try {
        // フォルダIDを取得
        const folderId = localStorage.getItem('current_folder_id');
        const body = { front, back };
        if (folderId) {
            body.folderId = Number(folderId);
        }
        
        const res = await fetch('/api/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('追加に失敗しました');
        // clear editor and previews and stored values
        addStoredFront = '';
        addStoredBack = '';
        if (addEditor) addEditor.value = '';
        if (addPreviewFront) addPreviewFront.textContent = '(未設定)';
        if (addPreviewBack) addPreviewBack.textContent = '(未設定)';
        if (msgEl) msgEl.textContent = '';
        await loadCards();
        // モーダルを閉じる
        if (addModal) addModal.classList.remove('show');
    } catch (err) {
        console.error(err);
        const userMsg = (err && err.message && /failed to fetch/i.test(err.message))
            ? 'サーバーに接続できませんでした。`npm start` でサーバーを起動してから再試行してください。'
            : (err.message || '追加中にエラーが発生しました');
        if (msgEl) msgEl.textContent = userMsg;
    }
}

// 新規カード追加ボタンのイベントリスナー（旧版は削除）
if (addCardButton) {
    addCardButton.addEventListener('click', addNewCard);
}

// 追加モーダルの表/裏切り替え
if (addBtnFront && addBtnBack && addEditor) {
    addBtnFront.addEventListener('click', () => {
        addCurrentMode = 'front';
        addBtnFront.classList.add('active');
        addBtnBack.classList.remove('active');
        addEditor.placeholder = '表のテキストを入力';
        addEditor.value = addStoredFront || '';
        addEditor.focus();
    });

    addBtnBack.addEventListener('click', () => {
        addCurrentMode = 'back';
        addBtnBack.classList.add('active');
        addBtnFront.classList.remove('active');
        addEditor.placeholder = '裏のテキストを入力';
        addEditor.value = addStoredBack || '';
        addEditor.focus();
    });

    addEditor.addEventListener('input', () => {
        const text = addEditor.value.trim();
        if (addCurrentMode === 'front') {
            addStoredFront = text;
            if (addPreviewFront) addPreviewFront.textContent = text || '(未設定)';
        } else {
            addStoredBack = text;
            if (addPreviewBack) addPreviewBack.textContent = text || '(未設定)';
        }
    });
}

// 追加確定ボタン
if (confirmAddBtn) {
    confirmAddBtn.addEventListener('click', addNewCard);
}

// 追加キャンセルボタン
if (cancelAddBtn) {
    cancelAddBtn.addEventListener('click', () => {
        if (addModal) addModal.classList.remove('show');
        addStoredFront = '';
        addStoredBack = '';
    });
}

// 追加モーダル外をクリックしたら閉じる
if (addModal) {
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.classList.remove('show');
            addStoredFront = '';
            addStoredBack = '';
        }
    });
}

// 削除ボタンのクリックイベント
if (btnDelete) {
    btnDelete.addEventListener('click', () => {
        deleteMode = !deleteMode;
        // 削除モードONの時は他のモードをOFF
        if (deleteMode) {
            editMode = false;
            btnDelete.classList.add('active');
            if (btnEdit) btnEdit.classList.remove('active');
        } else {
            btnDelete.classList.remove('active');
        }
    });
}

// 変更ボタンのクリックイベント
if (btnEdit) {
    btnEdit.addEventListener('click', () => {
        editMode = !editMode;
        // 編集モードONの時は他のモードをOFF
        if (editMode) {
            deleteMode = false;
            btnEdit.classList.add('active');
            if (btnDelete) btnDelete.classList.remove('active');
        } else {
            btnEdit.classList.remove('active');
        }
    });
}

// モーダルの削除確定ボタン
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!pendingDeleteId) return;
        
        try {
            const res = await fetch(`/api/cards/${pendingDeleteId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('削除に失敗しました');
            await loadCards();
            // 削除モードを解除
            deleteMode = false;
            if (btnDelete) btnDelete.classList.remove('active');
        } catch (err) {
            console.error(err);
            const userMsg = (err && err.message && /failed to fetch/i.test(err.message))
                ? 'サーバーに接続できませんでした。サーバーを起動してから再試行してください。'
                : (err.message || 'エラーが発生しました');
            alert(userMsg);
        } finally {
            // モーダルを閉じる
            if (deleteModal) deleteModal.classList.remove('show');
            pendingDeleteId = null;
        }
    });
}

// モーダルのキャンセルボタン
if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
        if (deleteModal) deleteModal.classList.remove('show');
        pendingDeleteId = null;
    });
}

// モーダル外をクリックしたら閉じる
if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.classList.remove('show');
            pendingDeleteId = null;
        }
    });
}

// 編集モーダルの表/裏切り替え
if (editBtnFront && editBtnBack && editEditor) {
    editBtnFront.addEventListener('click', () => {
        editCurrentMode = 'front';
        editBtnFront.classList.add('active');
        editBtnBack.classList.remove('active');
        editEditor.placeholder = '表のテキストを入力';
        editEditor.value = editStoredFront || '';
        editEditor.focus();
    });

    editBtnBack.addEventListener('click', () => {
        editCurrentMode = 'back';
        editBtnBack.classList.add('active');
        editBtnFront.classList.remove('active');
        editEditor.placeholder = '裏のテキストを入力';
        editEditor.value = editStoredBack || '';
        editEditor.focus();
    });

    editEditor.addEventListener('input', () => {
        const text = editEditor.value.trim();
        if (editCurrentMode === 'front') {
            editStoredFront = text;
            if (editPreviewFront) editPreviewFront.textContent = text || '(未設定)';
        } else {
            editStoredBack = text;
            if (editPreviewBack) editPreviewBack.textContent = text || '(未設定)';
        }
    });
}

// 編集保存ボタン
if (confirmEditBtn) {
    confirmEditBtn.addEventListener('click', async () => {
        if (!pendingEditId) return;
        
        const front = editStoredFront || '';
        const back = editStoredBack || '';
        
        // バリデーション
        if (!front || !back) {
            alert('表と裏の両方を入力してください。');
            return;
        }
        
        try {
            // APIがPUTをサポートしていない場合は、DELETEしてPOSTする方法も可能
            // ここでは仮にPUTを使用（server.jsに追加が必要）
            const res = await fetch(`/api/cards/${pendingEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ front, back })
            });
            
            if (!res.ok) throw new Error('更新に失敗しました');
            await loadCards();
            // 編集モードを解除
            editMode = false;
            if (btnEdit) btnEdit.classList.remove('active');
        } catch (err) {
            console.error(err);
            alert('更新に失敗しました: ' + (err.message || ''));
        } finally {
            // モーダルを閉じる
            if (editModal) editModal.classList.remove('show');
            pendingEditId = null;
            editStoredFront = '';
            editStoredBack = '';
        }
    });
}

// 編集キャンセルボタン
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        if (editModal) editModal.classList.remove('show');
        pendingEditId = null;
        editStoredFront = '';
        editStoredBack = '';
    });
}

// 編集モーダル外をクリックしたら閉じる
if (editModal) {
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.remove('show');
            pendingEditId = null;
            editStoredFront = '';
            editStoredBack = '';
        }
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
        if (folderId && currentFolderNameEl) {
            try {
                const fRes = await fetch('/api/folders');
                if (fRes.ok) {
                    const fs = await fRes.json();
                    const f = fs.find(x => String(x.id) === String(folderId));
                    currentFolderNameEl.textContent = f ? `${f.name}` : '';
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
            const folderId = localStorage.getItem('current_folder_id');
            const prefix = folderId ? '' : '全体: ';
            countEl.textContent = `${prefix}${cards.length} 件`;
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
