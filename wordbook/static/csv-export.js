// CSV出力機能
// このファイルは folders-check.html から読み込まれ、CSV出力機能を提供します

// CSV出力モードのフラグ（グローバル変数として定義）
let exportCsvMode = false;

// CSV出力ボタンのイベントリスナーを初期化
function initCsvExport(btnExportCsv, btnReview, btnShowSchedule) {
  if (!btnExportCsv) return;
  
  btnExportCsv.addEventListener('click', () => {
    // トグル動作: 出力中 → 解除、解除 → 出力中
    const isActive = btnExportCsv.classList.contains('active');
    if (isActive) {
      // 解除
      window.exportCsvMode = false;
      btnExportCsv.classList.remove('active');
      btnExportCsv.textContent = 'csvに出力';
    } else {
      // 有効化
      window.exportCsvMode = true;
      if (window.reviewMode !== undefined) window.reviewMode = false;
      if (window.showScheduleMode !== undefined) window.showScheduleMode = false;
      btnExportCsv.classList.add('active');
      btnExportCsv.textContent = '出力中...';
      if (btnReview) {
        btnReview.classList.remove('active');
        btnReview.textContent = '復習';
      }
      if (btnShowSchedule) {
        btnShowSchedule.classList.remove('active');
        btnShowSchedule.textContent = '復習日表示';
      }
    }
  });
}

// フォルダのカードをCSV形式でエクスポート
async function exportFolderToCsv(folderId, folderName) {
  try {
    // フォルダのカードを取得
    const response = await fetch(`/api/cards?folderId=${folderId}`);
    if (!response.ok) {
      throw new Error('カードの取得に失敗しました');
    }
    
    const cards = await response.json();
    
    if (cards.length === 0) {
      alert('このフォルダにはカードがありません。');
      return;
    }
    
    // CSVヘッダー（BOM付きでExcel対応）
    let csvContent = '\ufeffID,表,裏,作成日\n';
    
    // 各カードをCSV行に変換
    cards.forEach(card => {
      // CSVエスケープ処理
      const escapeCsv = (field) => {
        if (field == null) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      
      const id = card.id;
      const front = escapeCsv(card.front);
      const back = escapeCsv(card.back);
      const createdAt = card.createdAt ? new Date(card.createdAt).toLocaleString('ja-JP') : '';
      
      csvContent += `${id},${front},${back},${createdAt}\n`;
    });
    
    // Blobを作成してダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${folderName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`${folderName}.csv をダウンロードしました。`);
    
  } catch (err) {
    console.error(err);
    alert('CSVのエクスポートに失敗しました: ' + err.message);
  }
}
