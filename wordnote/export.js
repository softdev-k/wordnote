/**
 * CSV出力機能
 */

/**
 * 配列またはオブジェクトをJSON文字列に変換（CSV内で安全に扱えるようエスケープ）
 */
function stringifyForCSV(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * CSV用にフィールドをエスケープ（ダブルクォートとカンマ対応）
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '';
  }
  
  const str = String(field);
  
  // ダブルクォート、カンマ、改行を含む場合はダブルクォートで囲む
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    // ダブルクォートを二重にしてエスケープ
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * 単語本のカードデータをCSV形式でエクスポート
 */
async function exportWordbookAsCSV(bookId) {
  try {
    // 単語本情報を取得
    const bookResponse = await fetch(`/api/wordnote/books/${bookId}`);
    if (!bookResponse.ok) {
      throw new Error('単語本の情報取得に失敗しました');
    }
    const book = await bookResponse.json();
    
    // カードデータを取得
    const cardsResponse = await fetch(`/api/wordnote/cards/${bookId}`);
    if (!cardsResponse.ok) {
      throw new Error('カードデータの取得に失敗しました');
    }
    const data = await cardsResponse.json();
    const cards = data.cards;
    
    if (cards.length === 0) {
      alert('エクスポートする単語がありません');
      return;
    }
    
    // CSVヘッダー
    const headers = [
      'word',
      'pronunciation',
      'partOfSpeech',
      'meanings',
      'translations',
      'subMeanings',
      'synonyms',
      'antonyms',
      'derivatives',
      'examples',
      'chunkExamples',
      'phraseExamples',
      'imageUrl',
      'memo',
      'infoPlusProgress'
    ];
    
    // CSVデータを構築
    const csvLines = [];
    csvLines.push(headers.join(','));
    
    for (const card of cards) {
      const row = [
        escapeCSVField(card.word || ''),
        escapeCSVField(card.pronunciation || ''),
        escapeCSVField(stringifyForCSV(card.partOfSpeech)),
        escapeCSVField(stringifyForCSV(card.meanings)),
        escapeCSVField(stringifyForCSV(card.translation)),
        escapeCSVField(stringifyForCSV(card.subMeanings)),
        escapeCSVField(stringifyForCSV(card.synonyms)),
        escapeCSVField(stringifyForCSV(card.antonyms)),
        escapeCSVField(stringifyForCSV(card.derivedWords)),
        escapeCSVField(stringifyForCSV(card.exampleSentences)),
        escapeCSVField(stringifyForCSV(card.chunkExamples)),
        escapeCSVField(stringifyForCSV(card.commonExpressions)),
        escapeCSVField(card.imageUrl || ''),
        escapeCSVField(card.memo || ''),
        escapeCSVField(card.infoPlusProgress || 0)
      ];
      csvLines.push(row.join(','));
    }
    
    const csvContent = csvLines.join('\n');
    
    // BOM付きでUTF-8エンコーディング（Excel対応）
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // ダウンロード
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `${book.name}_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`${cards.length}件の単語をエクスポートしました`);
    
  } catch (error) {
    console.error('Export error:', error);
    alert('エクスポートに失敗しました: ' + error.message);
  }
}

// グローバルスコープに公開
window.exportWordbookAsCSV = exportWordbookAsCSV;
