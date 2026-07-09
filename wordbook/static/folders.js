// フォルダのデータを管理する配列(localStorageから取得)
let folders = [];
let deleteMode = false; // 削除モードのフラグ
let renameMode = false; // 名前変更モードのフラグ
let pendingDeleteFolderId = null; // 削除予定のフォルダID

// DOM要素の取得
const folderList = document.getElementById('folderList');
const btnCreateFolder = document.getElementById('btnCreateFolder');
const btnDeleteFolder = document.getElementById('btnDeleteFolder');
const btnEditFolder = document.getElementById('btnEditFolder');
const createFolderModal = document.getElementById('createFolderModal');
const folderNameInput = document.getElementById('folderNameInput');
const confirmCreateFolderBtn = document.getElementById('confirmCreateFolder');
const cancelCreateFolderBtn = document.getElementById('cancelCreateFolder');
const deleteFolderModal = document.getElementById('deleteFolderModal');
const deleteFolderMessage = document.getElementById('deleteFolderMessage');
const confirmDeleteFolderBtn = document.getElementById('confirmDeleteFolder');
const cancelDeleteFolderBtn = document.getElementById('cancelDeleteFolder');
const editFolderModal = document.getElementById('editFolderModal');
const editFolderNameInput = document.getElementById('editFolderNameInput');
const confirmEditFolderBtn = document.getElementById('confirmEditFolder');
const cancelEditFolderBtn = document.getElementById('cancelEditFolder');
let pendingEditFolderId = null;
const backLink = document.getElementById('backLink');

// 戻るボタンの処理
if (backLink) {
  backLink.addEventListener('click', (e) => {
    e.preventDefault();
    history.back();
  });
}

// フォルダをサーバーから読み込む
async function loadFolders() {
  try {
    const res = await fetch('/api/folders');
    if (!res.ok) throw new Error('フォルダ読み込みに失敗しました');
    folders = await res.json();
    renderFolders();
  } catch (err) {
    console.error(err);
    folderList.innerHTML = '<div class="no-folders" style="color:#c0392b">フォルダの読み込みに失敗しました。サーバーが起動しているか確認してください。</div>';
  }
}

// フォルダをlocalStorageに保存（不要になったため削除）
// function saveFolders() {
//   localStorage.setItem('wordbook_folders', JSON.stringify(folders));
// }

// フォルダを表示する関数
function renderFolders() {
  folderList.innerHTML = '';
  
  if (folders.length === 0) {
    folderList.innerHTML = '<div class="no-folders">フォルダがありません。「作成」ボタンから新しいフォルダを作成してください。</div>';
    // 件数表示をクリア
    const countEl = document.getElementById('folderCount');
    if (countEl) countEl.textContent = '0 件';
    return;
  }

  folders.forEach((folder) => {
    const folderElement = document.createElement('div');
    folderElement.className = 'folder-item';
    folderElement.setAttribute('data-id', folder.id);
    folderElement.innerHTML = `
      <div class="folder-name">${folder.name}</div>
      <div class="folder-review-info" data-count>...</div>
    `;
    
    // フォルダクリックイベント
    folderElement.addEventListener('click', () => {
      if (deleteMode) {
        // 削除モードの場合、確認モーダルを表示
        pendingDeleteFolderId = folder.id;
        if (deleteFolderMessage) {
          deleteFolderMessage.textContent = `フォルダ「${folder.name}」を削除してもよろしいですか？\n\nこのフォルダ内のすべてのカードも削除されます。`;
        }
        if (deleteFolderModal) deleteFolderModal.classList.add('show');
      } else if (renameMode) {
        // 名前変更モードの場合、編集モーダルを表示
        pendingEditFolderId = folder.id;
        if (editFolderNameInput) editFolderNameInput.value = folder.name;
        if (editFolderModal) editFolderModal.classList.add('show');
        if (editFolderNameInput) editFolderNameInput.focus();
      } else {
        // 通常モードの場合、フォルダを開く
        localStorage.setItem('current_folder_id', folder.id);
        window.location.href = 'index.html';
      }
    });

    // 右クリックで名前変更モードに入る（補助）
    folderElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      pendingEditFolderId = folder.id;
      if (editFolderNameInput) editFolderNameInput.value = folder.name;
      if (editFolderModal) editFolderModal.classList.add('show');
      if (editFolderNameInput) editFolderNameInput.focus();
    });
    
    folderList.appendChild(folderElement);

    // カード数の取得と表示
    (async () => {
      try {
        const res = await fetch(`/api/cards?folderId=${folder.id}`);
        if (res.ok) {
          const cards = await res.json();
          const countEl = folderElement.querySelector('[data-count]');
          if (countEl) countEl.textContent = `${cards.length} 件`;
        }
      } catch {}
    })();
  });
  
  // フォルダ件数の表示
  const countEl = document.getElementById('folderCount');
  if (countEl) {
    countEl.textContent = `${folders.length} 件`;
  }
}

// 作成ボタンのクリックイベント
if (btnCreateFolder) {
  btnCreateFolder.addEventListener('click', () => {
    if (folderNameInput) folderNameInput.value = '';
    if (createFolderModal) createFolderModal.classList.add('show');
    if (folderNameInput) folderNameInput.focus();
  });
}

// 削除ボタンのクリックイベント
if (btnDeleteFolder) {
  btnDeleteFolder.addEventListener('click', () => {
    deleteMode = !deleteMode;
    if (deleteMode) {
      btnDeleteFolder.classList.add('active');
      btnDeleteFolder.textContent = '削除中...';
    } else {
      btnDeleteFolder.classList.remove('active');
      btnDeleteFolder.textContent = '削除';
    }
  });
}

// 名前変更ボタンのクリックイベント
if (btnEditFolder) {
  btnEditFolder.addEventListener('click', () => {
    // 名前変更モードに切り替え（削除モードは解除）
    renameMode = !renameMode;
    if (renameMode) {
      deleteMode = false;
      if (btnDeleteFolder) {
        btnDeleteFolder.classList.remove('active');
        btnDeleteFolder.textContent = '削除';
      }
      btnEditFolder.classList.add('active');
      btnEditFolder.textContent = '名前変更中...';
    } else {
      btnEditFolder.classList.remove('active');
      btnEditFolder.textContent = '名前変更';
    }
  });
}

// フォルダ作成確定ボタン
if (confirmCreateFolderBtn) {
  confirmCreateFolderBtn.addEventListener('click', async () => {
    const name = folderNameInput.value.trim();
    
    if (!name) {
      alert('フォルダ名を入力してください。');
      return;
    }
    
    // サーバーに新しいフォルダを作成
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (!res.ok) {
        if (res.status === 409) {
          alert('同じ名前のフォルダは作成できません。');
          return;
        }
        throw new Error('フォルダ作成に失敗しました');
      }
      
      // フォルダリストを再読み込み
      await loadFolders();
      
      // モーダルを閉じる
      if (createFolderModal) createFolderModal.classList.remove('show');
      if (folderNameInput) folderNameInput.value = '';
    } catch (err) {
      console.error(err);
      alert('フォルダの作成に失敗しました。');
    }
  });
}

// キャンセルボタン
if (cancelCreateFolderBtn) {
  cancelCreateFolderBtn.addEventListener('click', () => {
    if (createFolderModal) createFolderModal.classList.remove('show');
    if (folderNameInput) folderNameInput.value = '';
  });
}

// フォルダ削除確定ボタン
if (confirmDeleteFolderBtn) {
  confirmDeleteFolderBtn.addEventListener('click', async () => {
    if (!pendingDeleteFolderId) return;
    
    // サーバーからフォルダを削除（カードもCascadeで削除される）
    try {
      const res = await fetch(`/api/folders/${pendingDeleteFolderId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('フォルダ削除に失敗しました');
      
      // フォルダリストを再読み込み
      await loadFolders();
      
      // モーダルを閉じて削除モードを解除
      if (deleteFolderModal) deleteFolderModal.classList.remove('show');
      pendingDeleteFolderId = null;
      deleteMode = false;
      if (btnDeleteFolder) {
        btnDeleteFolder.classList.remove('active');
        btnDeleteFolder.textContent = '削除';
      }
    } catch (err) {
      console.error(err);
      alert('フォルダの削除に失敗しました。');
    }
  });
}

// フォルダ削除キャンセルボタン
if (cancelDeleteFolderBtn) {
  cancelDeleteFolderBtn.addEventListener('click', () => {
    if (deleteFolderModal) deleteFolderModal.classList.remove('show');
    pendingDeleteFolderId = null;
  });
}

// フォルダ名変更確定ボタン
if (confirmEditFolderBtn) {
  confirmEditFolderBtn.addEventListener('click', async () => {
    const newName = (editFolderNameInput?.value || '').trim();
    if (!pendingEditFolderId) return;
    if (!newName) {
      alert('新しいフォルダ名を入力してください。');
      return;
    }

    try {
      const res = await fetch(`/api/folders/${pendingEditFolderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (!res.ok) {
        if (res.status === 409) {
          alert('同じ名前のフォルダには変更できません。');
          return;
        }
        throw new Error('フォルダ名の変更に失敗しました');
      }
      // リスト再読み込み（カードや状態はフォルダID維持で引き継がれる）
      await loadFolders();
      // モーダルを閉じる
      if (editFolderModal) editFolderModal.classList.remove('show');
      pendingEditFolderId = null;
      // モードを解除
      renameMode = false;
      if (btnEditFolder) {
        btnEditFolder.classList.remove('active');
        btnEditFolder.textContent = '名前変更';
      }
    } catch (err) {
      console.error(err);
      alert('フォルダ名の変更に失敗しました。');
    }
  });
}

// フォルダ名変更キャンセルボタン
if (cancelEditFolderBtn) {
  cancelEditFolderBtn.addEventListener('click', () => {
    if (editFolderModal) editFolderModal.classList.remove('show');
    pendingEditFolderId = null;
    // モードを解除
    renameMode = false;
    if (btnEditFolder) {
      btnEditFolder.classList.remove('active');
      btnEditFolder.textContent = '名前変更';
    }
  });
}

// モーダル外クリックで閉じる（編集）
if (editFolderModal) {
  editFolderModal.addEventListener('click', (e) => {
    if (e.target === editFolderModal) {
      editFolderModal.classList.remove('show');
      pendingEditFolderId = null;
        // モードを解除
        renameMode = false;
        if (btnEditFolder) {
          btnEditFolder.classList.remove('active');
          btnEditFolder.textContent = '名前変更';
        }
    }
  });
}

// モーダル外をクリックしたら閉じる
if (createFolderModal) {
  createFolderModal.addEventListener('click', (e) => {
    if (e.target === createFolderModal) {
      createFolderModal.classList.remove('show');
      if (folderNameInput) folderNameInput.value = '';
    }
  });
}

if (deleteFolderModal) {
  deleteFolderModal.addEventListener('click', (e) => {
    if (e.target === deleteFolderModal) {
      deleteFolderModal.classList.remove('show');
      pendingDeleteFolderId = null;
    }
  });
}

// Enterキーでフォルダ作成
if (folderNameInput) {
  folderNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmCreateFolderBtn.click();
    }
  });
}

// 初期表示
loadFolders();
