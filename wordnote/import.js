/**
 * CSV入力機能
 */

/**
 * CSV行をパースする関数（ダブルクォートとカンマを考慮）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // 次の " をスキップ
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * JSONフィールドを安全にパース
 */
function safeJSONParse(str, defaultValue = null) {
  if (!str || str.trim() === '') {
    return defaultValue;
  }
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('JSON parse error:', str, e);
    return defaultValue;
  }
}

/**
 * CSVファイルから単語をインポート
 */
async function importWordbookFromCSV(bookId, file) {
  try {
    // 単語本情報を取得
    const bookResponse = await fetch(`/api/wordnote/books/${bookId}`);
    if (!bookResponse.ok) {
      throw new Error('単語本の情報取得に失敗しました');
    }
    const book = await bookResponse.json();
    const bookLevel = book.level;
    
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      alert('CSVファイルが空です');
      return;
    }
    
    // ヘッダー行を取得
    const headers = parseCSVLine(lines[0]);
      
      // 必須ヘッダーの確認
      if (!headers.includes('word')) {
        alert('CSVファイルに "word" 列が見つかりません');
        return;
      }
      
      const errors = [];
      let successCount = 0;
      const totalCount = lines.length - 1;
      
      // 進捗表示用の要素を作成
      const progressDiv = document.createElement('div');
      progressDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000; min-width: 300px;';
      progressDiv.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">インポート中...</h3>
        <div style="background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden; margin-bottom: 10px;">
          <div id="import-progress-bar" style="width: 0%; height: 100%; background: #4caf50; transition: width 0.3s;"></div>
        </div>
        <p id="import-progress-text" style="margin: 0; color: #666; font-size: 14px;">0 / ${totalCount}</p>
      `;
      document.body.appendChild(progressDiv);
      
      const progressBar = document.getElementById('import-progress-bar');
      const progressText = document.getElementById('import-progress-text');
      
      // データ行を処理
      for (let i = 1; i < lines.length; i++) {
        const lineNum = i + 1;
        
        try {
          const values = parseCSVLine(lines[i]);
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          // 必須フィールドのバリデーション
          if (!row.word || row.word.trim() === '') {
            errors.push(`行 ${lineNum}: 単語（word）が空です`);
            continue;
          }
          
          // 品詞をパース
          let partOfSpeech = safeJSONParse(row.partOfSpeech, null);
          if (!partOfSpeech) {
            // JSONでない場合はカンマ区切りとして処理
            if (row.partOfSpeech) {
              partOfSpeech = row.partOfSpeech.split(',').map(p => p.trim()).filter(p => p);
            } else {
              partOfSpeech = [];
            }
          }
          
          // データ変換
          const cardData = {
            bookId: parseInt(bookId),
            level: bookLevel,
            word: row.word.trim(),
            pronunciation: row.pronunciation || '',
            partOfSpeech: partOfSpeech,
            meanings: safeJSONParse(row.meanings, []),
            translations: safeJSONParse(row.translations, []),
            subMeanings: safeJSONParse(row.subMeanings, []),
            synonyms: safeJSONParse(row.synonyms, []),
            antonyms: safeJSONParse(row.antonyms, []),
            derivedWords: safeJSONParse(row.derivatives, []),
            exampleSentences: safeJSONParse(row.examples, []),
            chunkExamples: safeJSONParse(row.chunkExamples, []),
            commonExpressions: safeJSONParse(row.phraseExamples, []),
            imageUrl: row.imageUrl || '',
            memo: row.memo || '',
            infoPlusProgress: parseInt(row.infoPlusProgress) || 0,
            evaluation: 0,
            lastThreeScores: [],
            nextReviewDate: null
          };
          
          // APIリクエスト
          const response = await fetch('/api/wordnote/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardData)
          });
          
          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json().catch(() => ({}));
            errors.push(`行 ${lineNum} (${row.word}): ${errorData.error || '保存に失敗'}`);
          }
          
        } catch (error) {
          console.error(`Line ${lineNum} error:`, error);
          errors.push(`行 ${lineNum}: ${error.message}`);
        }
        
        // 進捗を更新
        const progress = ((i) / totalCount * 100).toFixed(0);
        progressBar.style.width = progress + '%';
        progressText.textContent = `${i} / ${totalCount}`;
        
        // UIの更新を待つ
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // 進捗表示を削除
      document.body.removeChild(progressDiv);
      
      // 結果表示
      let message = `インポート完了\n成功: ${successCount}件`;
      if (errors.length > 0) {
        message += `\nエラー: ${errors.length}件`;
        if (errors.length <= 10) {
          message += '\n\n' + errors.join('\n');
        } else {
          message += '\n\n' + errors.slice(0, 10).join('\n') + `\n... 他 ${errors.length - 10} 件`;
        }
      }
      
      alert(message);
      
    // 単語本リストを更新
    if (window.loadBooks) {
      window.loadBooks();
    }
    
  } catch (error) {
    console.error('Import error:', error);
    alert('CSVファイルの読み込みに失敗しました: ' + error.message);
  }
}

// グローバルスコープに公開
window.importWordbookFromCSV = importWordbookFromCSV;
