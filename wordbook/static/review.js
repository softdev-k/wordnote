// DOM要素の取得
const folderList = document.getElementById('folderList');
const backLink = document.getElementById('backLink');

// 戻るボタンの処理
if (backLink) {
  backLink.addEventListener('click', (e) => {
    e.preventDefault();
    history.back();
  });
}

// 今日の日付を取得（YYYY-MM-DD形式）
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// 今日の復習予定があるフォルダを読み込む
async function loadTodayReviewFolders() {
  try {
    const todayDate = getTodayDate();
    
    // すべての復習予定を取得
    const response = await fetch('/api/review-schedules');
    if (!response.ok) throw new Error('復習予定の取得に失敗しました');
    
    const allSchedules = await response.json();
    
    // 今日の日付の復習予定のみフィルタリング
    const todaySchedules = allSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.reviewDate).toISOString().split('T')[0];
      return scheduleDate === todayDate;
    });
    
    if (todaySchedules.length === 0) {
      folderList.innerHTML = '<div class="no-folders">今日の復習予定はありません。</div>';
      return;
    }
    
    // 重複を除いてフォルダIDを取得
    const uniqueFolderIds = [...new Set(todaySchedules.map(s => s.folderId))];
    
    // 各フォルダの情報を取得して表示
    const folderPromises = uniqueFolderIds.map(async (folderId) => {
      const folderResponse = await fetch('/api/folders');
      if (!folderResponse.ok) throw new Error('フォルダ情報の取得に失敗しました');
      const folders = await folderResponse.json();
      return folders.find(f => f.id === folderId);
    });
    
    const folders = await Promise.all(folderPromises);
    renderFolders(folders.filter(f => f !== undefined), todaySchedules);
    
  } catch (err) {
    console.error(err);
    folderList.innerHTML = '<div class="no-folders" style="color:#c0392b">復習予定の読み込みに失敗しました。サーバーが起動しているか確認してください。</div>';
  }
}

// フォルダを表示する関数
function renderFolders(folders, schedules) {
  folderList.innerHTML = '';
  
  folders.forEach((folder) => {
    // このフォルダの今日の復習予定を取得
    const folderSchedules = schedules.filter(s => s.folderId === folder.id);
    const reviewCounts = folderSchedules.map(s => s.reviewCount).sort((a, b) => a - b);
    const reviewCountText = reviewCounts.length > 0 ? reviewCounts.join(', ') : '1';
    
    const folderElement = document.createElement('div');
    folderElement.className = 'folder-item';
    folderElement.setAttribute('data-id', folder.id);
    folderElement.innerHTML = `
      <div class="folder-name">${folder.name}</div>
      <div class="folder-review-info">${reviewCountText}回目の復習</div>
    `;
    
    // フォルダクリックでcheck.htmlに遷移
    folderElement.addEventListener('click', () => {
      localStorage.setItem('current_folder_id', folder.id);
      localStorage.setItem('from_review', 'true');
      window.location.href = 'check.html';
    });
    
    folderList.appendChild(folderElement);
  });
}

// 初期表示
loadTodayReviewFolders();
