// フォルダのデータを管理する配列
let folders = [];
let selectedFolderId = null;
let selectedDate = null;
let reviewMode = false; // 復習モードのフラグ
let showScheduleMode = false; // 復習日表示モードのフラグ
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

// DOM要素の取得
const folderList = document.getElementById('folderList');
const backLink = document.getElementById('backLink');
const btnReview = document.getElementById('btnReview');
const btnShowSchedule = document.getElementById('btnShowSchedule');
const btnExportCsv = document.getElementById('btnExportCsv');
const calendarModal = document.getElementById('calendarModal');
const calendarElement = document.getElementById('calendar');
const confirmCalendarBtn = document.getElementById('confirmCalendar');
const cancelCalendarBtn = document.getElementById('cancelCalendar');

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

// フォルダを表示する関数
function renderFolders() {
  folderList.innerHTML = '';
  
  if (folders.length === 0) {
    folderList.innerHTML = '<div class="no-folders">フォルダがありません。メニューから「作成」を選択してフォルダを作成してください。</div>';
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
    
    // フォルダクリック処理
    folderElement.addEventListener('click', async () => {
      if (reviewMode) {
        // 復習モードの場合はカレンダーモーダルを表示
        selectedFolderId = folder.id;
        // カレンダーを現在月にリセット
        currentYear = new Date().getFullYear();
        currentMonth = new Date().getMonth();
        generateCalendar();
        if (calendarModal) calendarModal.classList.add('show');
      } else if (showScheduleMode) {
        // 復習日表示モードの場合は復習予定を表示
        await showReviewSchedules(folder.id, folder.name);
        showScheduleMode = false;
        if (btnShowSchedule) {
          btnShowSchedule.classList.remove('active');
          btnShowSchedule.textContent = '復習日表示';
        }
      } else if (window.exportCsvMode) {
        // CSV出力モードの場合はCSVをダウンロード
        await exportFolderToCsv(folder.id, folder.name);
        window.exportCsvMode = false;
        if (btnExportCsv) {
          btnExportCsv.classList.remove('active');
          btnExportCsv.textContent = 'csvに出力';
        }
      } else {
        // 通常モードの場合はcheck.htmlに遷移
        localStorage.setItem('current_folder_id', folder.id);
        window.location.href = 'check.html';
      }
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

// カレンダーを生成する関数
function generateCalendar() {
  const year = currentYear;
  const month = currentMonth;
  
  // カレンダーヘッダー
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  let calendarHTML = `
    <div class="calendar-header">
      <button class="calendar-nav-btn" id="prevMonth">◀</button>
      <div class="calendar-month">${year}年 ${monthNames[month]}</div>
      <button class="calendar-nav-btn" id="nextMonth">▶</button>
    </div>
    <div class="calendar-days">
      <div class="calendar-day-name">日</div>
      <div class="calendar-day-name">月</div>
      <div class="calendar-day-name">火</div>
      <div class="calendar-day-name">水</div>
      <div class="calendar-day-name">木</div>
      <div class="calendar-day-name">金</div>
      <div class="calendar-day-name">土</div>
    </div>
    <div class="calendar-dates">
  `;
  
  // 前月の日付
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevLastDay.getDate() - i;
    calendarHTML += `<div class="calendar-date prev-month">${day}</div>`;
  }
  
  // 今月の日付
  const today = new Date();
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day);
    const todayClass = isToday ? ' today' : '';
    calendarHTML += `<div class="calendar-date${todayClass}" data-date="${dateStr}">${day}</div>`;
  }
  
  // 次月の日付
  const remainingDays = 42 - (firstDayOfWeek + lastDay.getDate());
  for (let day = 1; day <= remainingDays; day++) {
    calendarHTML += `<div class="calendar-date next-month">${day}</div>`;
  }
  
  calendarHTML += `</div>`;
  
  if (calendarElement) {
    calendarElement.innerHTML = calendarHTML;
    
    // 前月ボタン
    const prevMonthBtn = document.getElementById('prevMonth');
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        generateCalendar();
      });
    }
    
    // 次月ボタン
    const nextMonthBtn = document.getElementById('nextMonth');
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        generateCalendar();
      });
    }
    
    // 日付クリックイベント
    const dateElements = calendarElement.querySelectorAll('.calendar-date:not(.prev-month):not(.next-month)');
    dateElements.forEach((dateEl) => {
      dateEl.addEventListener('click', () => {
        // 選択解除
        dateElements.forEach((el) => el.classList.remove('selected'));
        // 選択追加
        dateEl.classList.add('selected');
        selectedDate = dateEl.getAttribute('data-date');
      });
    });
  }
}

// 確認ボタン
if (confirmCalendarBtn) {
  confirmCalendarBtn.addEventListener('click', async () => {
    if (!selectedDate || !selectedFolderId) {
      alert('日付とフォルダを選択してください。');
      return;
    }
    
    try {
      // 既存の復習予定を削除
      const deleteResponse = await fetch(`/api/review-schedules/folder/${selectedFolderId}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        throw new Error('既存の復習予定の削除に失敗しました');
      }
      
      // 選択した日付から追加の復習日を計算
      const baseDate = new Date(selectedDate);
      const reviewDates = [
        selectedDate, // 選択した日
        new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1日後
        new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3日後
        new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7日後
        new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14日後
        new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 30日後
      ];
      
      // すべての復習日をデータベースに保存
      for (let i = 0; i < reviewDates.length; i++) {
        const response = await fetch('/api/review-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId: selectedFolderId,
            reviewDate: reviewDates[i],
            reviewCount: i + 1  // 1回目、2回目...と記録
          })
        });
        
        if (!response.ok) {
          throw new Error('復習予定の保存に失敗しました');
        }
      }
      
      // LocalStorageにも保存
      localStorage.setItem('review_date', selectedDate);
      localStorage.setItem('current_folder_id', selectedFolderId);
      
      // アラート表示
      alert('復習開始！');
      
      // モーダルを閉じる
      if (calendarModal) calendarModal.classList.remove('show');
      selectedDate = null;
      selectedFolderId = null;
      reviewMode = false;
      if (btnReview) {
        btnReview.classList.remove('active');
        btnReview.textContent = '復習';
      }
    } catch (err) {
      console.error(err);
      alert('復習予定の保存に失敗しました。');
    }
  });
}

// キャンセルボタン
if (cancelCalendarBtn) {
  cancelCalendarBtn.addEventListener('click', () => {
    if (calendarModal) calendarModal.classList.remove('show');
    selectedDate = null;
    selectedFolderId = null;
    reviewMode = false; // 復習モードを解除
    if (btnReview) {
      btnReview.classList.remove('active');
      btnReview.textContent = '復習';
    }
  });
}

// モーダル外クリックで閉じる
if (calendarModal) {
  calendarModal.addEventListener('click', (e) => {
    if (e.target === calendarModal) {
      calendarModal.classList.remove('show');
      selectedDate = null;
      selectedFolderId = null;
      reviewMode = false; // 復習モードを解除
      if (btnReview) {
        btnReview.classList.remove('active');
        btnReview.textContent = '復習';
      }
    }
  });
}

// 復習ボタンのクリックイベント
if (btnReview) {
  btnReview.addEventListener('click', () => {
    reviewMode = true;
    showScheduleMode = false;
    btnReview.classList.add('active');
    btnReview.textContent = '復習中...';
    if (btnShowSchedule) {
      btnShowSchedule.classList.remove('active');
      btnShowSchedule.textContent = '復習日表示';
    }
  });
}

// 復習日表示ボタンのクリックイベント
if (btnShowSchedule) {
  btnShowSchedule.addEventListener('click', () => {
    showScheduleMode = true;
    reviewMode = false;
    btnShowSchedule.classList.add('active');
    btnShowSchedule.textContent = '表示中...';
    if (btnReview) {
      btnReview.classList.remove('active');
      btnReview.textContent = '復習';
    }
  });
}

// 復習予定を表示する関数
async function showReviewSchedules(folderId, folderName) {
  try {
    const response = await fetch(`/api/review-schedules?folderId=${folderId}`);
    if (!response.ok) {
      throw new Error('復習予定の取得に失敗しました');
    }
    
    const schedules = await response.json();
    
    if (schedules.length === 0) {
      alert(`「${folderName}」フォルダには復習予定が設定されていません。`);
    } else {
      // 日付を整形して表示
      const dateList = schedules.map(s => {
        const date = new Date(s.reviewDate);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
      }).join('\n');
      
      alert(`「${folderName}」の復習予定:\n\n${dateList}`);
    }
  } catch (err) {
    console.error(err);
    alert('復習予定の取得に失敗しました。');
  }
}

// CSV出力機能の初期化（csv-export.jsから呼び出される）
if (typeof initCsvExport === 'function') {
  initCsvExport(btnExportCsv, btnReview, btnShowSchedule);
}

// 初期表示
loadFolders();
