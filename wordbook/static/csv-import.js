// CSV Import modal controller
(function () {
  const importBtn = document.getElementById('btnImportCsv');
  const modal = document.getElementById('csvImportModal');
  const fileInput = document.getElementById('csvImportFile');
  const cancelBtn = document.getElementById('btnCsvCancel');
  const createBtn = document.getElementById('btnCsvCreate');

  if (!importBtn || !modal) return;

  // Open modal on button click
  importBtn.addEventListener('click', () => {
    if (fileInput) fileInput.value = '';
    modal.classList.add('show');
    setTimeout(() => {
      if (fileInput) fileInput.focus();
    }, 0);
  });

  // Cancel closes the modal
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
  }

  // Clicking outside modal content closes modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });

  // Create button: no behavior for now as requested
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      try {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
          alert('CSVファイルを選択してください。');
          return;
        }
        const file = fileInput.files[0];
        const folderName = file.name.replace(/\.csv$/i, '');

        const text = await file.text();
        const rows = parseCsv(text);
        if (!rows || rows.length === 0) {
          alert('CSVの内容が空です。');
          return;
        }

        // ヘッダーから列を特定（表/裏）
        const header = rows[0];
        const frontIdx = header.findIndex(h => normalizeHeader(h) === '表');
        const backIdx = header.findIndex(h => normalizeHeader(h) === '裏');
        if (frontIdx === -1 || backIdx === -1) {
          alert('CSVの1行目に「表」「裏」列が見つかりません。');
          return;
        }

        // フォルダ作成（重複エラー時は末尾に(1)を付与して再試行）
        const newFolderId = await createFolderWithRetry(folderName);
        if (!newFolderId) {
          alert('フォルダの作成に失敗しました。');
          return;
        }

        // データ行からカード作成
        const dataRows = rows.slice(1);
        let createdCount = 0;
        for (const r of dataRows) {
          const front = (r[frontIdx] || '').trim();
          const back = (r[backIdx] || '').trim();
          if (!front && !back) continue;
          try {
            await fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folderId: newFolderId, front, back })
            });
            createdCount++;
          } catch (e) {
            // 個別失敗はスキップ
          }
        }

        alert(`フォルダ「${folderName}」を作成し、${createdCount} 件のカードを追加しました。`);
        modal.classList.remove('show');
      } catch (err) {
        console.error(err);
        alert('CSVの取り込みに失敗しました: ' + (err?.message || '不明なエラー'));
      }
    });
  }

  // ヘッダー名の正規化
  function normalizeHeader(s) {
    if (!s) return '';
    return String(s).trim().replace(/\s+/g, '').toLowerCase()
      .replace('ひょう', '表').replace('おもて', '表').replace('ura', '裏')
      .replace('front', '表').replace('back', '裏');
  }

  // 簡易CSVパーサ（ダブルクォート、改行対応）
  function parseCsv(str) {
    const rows = [];
    let i = 0, field = '', row = [], inQuotes = false;
    while (i < str.length) {
      const c = str[i];
      if (inQuotes) {
        if (c === '"') {
          if (str[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
          // 行終端
          // CRLF 対応: \r\n の場合は次の \n をスキップ
          if (c === '\r' && str[i + 1] === '\n') i++;
          row.push(field); field = '';
          rows.push(row); row = [];
        } else {
          field += c;
        }
      }
      i++;
    }
    // 最終フィールド/行
    row.push(field);
    rows.push(row);
    // 末尾の空行除去
    return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
  }

  // フォルダ作成（重複時はフォールバック）
  async function createFolderWithRetry(baseName) {
    let name = baseName.trim() || '新しいフォルダ';
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.status === 409) {
        name = `${baseName}(${attempt + 1})`;
        continue;
      }
      if (!res.ok) return null;
      const folder = await res.json();
      return folder.id;
    }
    return null;
  }
})();
