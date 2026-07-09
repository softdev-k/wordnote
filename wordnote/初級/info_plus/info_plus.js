document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('wordForm');
  const cardId = Number(localStorage.getItem('info_plus_card_id'));
  const infoType = localStorage.getItem('info_plus_type') || 'sub-meaning';
  let loadedCard = null;
  let bookDifficulty = '初級'; // デフォルト

  // 情報タイプから難易度を推定
  const infoTypeToDifficulty = {
    'sub-meaning': '中級',
    'derivative': '中級',
    'synonym': '中級',
    'example': '上級',
    'chunk-example': '上級',
    'phrase-example': '上級',
    'translation': '完成'
  };
  const infoTypeDifficulty = infoTypeToDifficulty[infoType] || '初級';

  // 単語本の難易度を取得してinfoPlusProgress選択肢を更新
  const bookId = Number(localStorage.getItem('current_wordnote_book_id'));
  if (bookId) {
    try {
      const bookResp = await fetch(`/api/wordnote/books`);
      if (bookResp.ok) {
        const books = await bookResp.json();
        const book = books.find(b => b.id === bookId);
        if (book) {
          bookDifficulty = book.level || '初級';
          updateInfoPlusProgressOptions(bookDifficulty, infoTypeDifficulty);
        }
      }
    } catch (err) {
      console.error('Error fetching book difficulty:', err);
    }
  }

  // 既存カードの読み込み
  if (cardId) {
    try {
      if (bookId) {
        const resp = await fetch(`/api/wordnote/cards/${bookId}`);
        if (resp.ok) {
          const data = await resp.json();
          loadedCard = (data.cards || []).find(c => c.id === cardId) || null;
          if (loadedCard) {
            // 品詞チェックボックスを先にチェック（サブの意味のドロップダウンに必要）
            if (loadedCard.partOfSpeech) {
              try {
                const posArray = JSON.parse(loadedCard.partOfSpeech);
                if (Array.isArray(posArray)) {
                  posArray.forEach(pos => {
                    const checkbox = document.querySelector(`.pos-checkbox[value="${pos}"]`);
                    if (checkbox) checkbox.checked = true;
                  });
                }
              } catch {
                // 旧形式の場合は無視
              }
            }
            
            // 選択された情報タイプに応じてフォームを調整（loadedCard取得後）
            adjustFormByInfoType(infoType, loadedCard);
            
            // 拡張フィールドのみフォームへ反映
            // サブの意味は{text, pos}形式の可能性があるため、専用処理
            const subMeaningsData = parseJSON(loadedCard.subMeanings);
            
            const subMeaningsContainer = document.getElementById('subMeaningsContainer');
            if (subMeaningsContainer) {
              subMeaningsContainer.innerHTML = '';
              const items = subMeaningsData.length > 0 ? subMeaningsData : [{ text: '', pos: '' }];
              items.forEach((item, idx) => {
                // itemが二重にJSON化されている可能性を考慮
                let text = '';
                let pos = '';
                
                if (typeof item === 'string') {
                  // 文字列の場合はそのまま使用
                  text = item;
                } else if (typeof item === 'object' && item !== null) {
                  // オブジェクトの場合
                  if (typeof item.text === 'string') {
                    // item.textが文字列の場合
                    if (item.text.startsWith('{') || item.text.startsWith('[')) {
                      // JSON文字列の可能性がある場合、パースを試みる
                      try {
                        const parsed = JSON.parse(item.text);
                        text = parsed.text || item.text;
                        pos = parsed.pos || item.pos || '';
                      } catch (e) {
                        text = item.text;
                        pos = item.pos || '';
                      }
                    } else {
                      text = item.text;
                      pos = item.pos || '';
                    }
                  } else if (typeof item.text === 'object' && item.text !== null) {
                    // item.textがオブジェクトの場合（二重ネスト）
                    text = item.text.text || '';
                    pos = item.text.pos || item.pos || '';
                  }
                }
                
                // 選択された品詞を取得
                const selectedPos = Array.from(document.querySelectorAll('.pos-checkbox:checked'))
                  .map(cb => cb.value);
                
                const div = document.createElement('div');
                div.className = 'sub-meaning-input';
                div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
                div.innerHTML = `
                  <input type="text" class="sub-meaning" placeholder="サブの意味を入力" value="${text || ''}" style="flex: 1;">
                  <select class="sub-meaning-pos" style="width: 100px;">
                    <option value="">品詞選択</option>
                    ${selectedPos.map(p => `<option value="${p}" ${p === pos ? 'selected' : ''}>${p}</option>`).join('')}
                  </select>
                `;
                subMeaningsContainer.appendChild(div);
              });
            }
            setArrayInputs('#synonymsContainer', 'synonym', parseJSON(loadedCard.synonyms), 3, true);
            setArrayInputs('#antonymsContainer', 'antonym', parseJSON(loadedCard.antonyms), 1);
            setArrayInputs('#derivativesContainer', 'derivative', parseJSON(loadedCard.derivedWords), 3, true);
            
            // 例文の反映（意味と紐付いている形式）
            const exampleSentences = parseJSON(loadedCard.exampleSentences);
            if (Array.isArray(exampleSentences) && exampleSentences.length > 0) {
              const examplesContainer = document.getElementById('examplesContainer');
              if (examplesContainer) {
                examplesContainer.innerHTML = '';
                exampleSentences.forEach((item, idx) => {
                  const example = typeof item === 'string' ? item : (item.example || '');
                  const div = document.createElement('div');
                  div.className = 'example-input';
                  div.innerHTML = `<input type="text" class="example" placeholder="例文を入力" value="${example}">`;
                  examplesContainer.appendChild(div);
                });
              }
            }
            
            // チャンク例文の反映（オブジェクト形式に対応）
            const chunkExamplesData = parseJSON(loadedCard.chunkExamples);
            const chunkExamplesContainer = document.getElementById('chunkExamplesContainer');
            chunkExamplesContainer.innerHTML = '';
            if (Array.isArray(chunkExamplesData) && chunkExamplesData.length > 0) {
              chunkExamplesData.forEach(item => {
                const div = document.createElement('div');
                div.className = 'chunk-example-input';
                const example = typeof item === 'string' ? item : (item.example || '');
                const meaning = typeof item === 'object' ? (item.meaning || '') : '';
                div.innerHTML = `<input type="text" class="chunk-example" placeholder="チャンク例文を入力" value="${example}"> <input type="text" class="chunk-example-meaning" placeholder="意味を入力" value="${meaning}"> <button type="button" class="remove-chunk-example">－</button>`;
                chunkExamplesContainer.appendChild(div);
              });
            }
            
            // よく使う表現の例文の反映（オブジェクト形式に対応）
            const phraseExamplesData = parseJSON(loadedCard.commonExpressions);
            const phraseExamplesContainer = document.getElementById('phraseExamplesContainer');
            phraseExamplesContainer.innerHTML = '';
            if (Array.isArray(phraseExamplesData) && phraseExamplesData.length > 0) {
              phraseExamplesData.forEach(item => {
                const div = document.createElement('div');
                div.className = 'phrase-example-input';
                const example = typeof item === 'string' ? item : (item.example || '');
                const meaning = typeof item === 'object' ? (item.meaning || '') : '';
                div.innerHTML = `<input type="text" class="phrase-example" placeholder="よく使う表現の例文を入力" value="${example}"> <input type="text" class="phrase-example-meaning" placeholder="意味を入力" value="${meaning}"> <button type="button" class="remove-phrase-example">－</button>`;
                phraseExamplesContainer.appendChild(div);
              });
            }
            
            setValue('#imageUrl', loadedCard.imageUrl || '');
            setValue('#memo', loadedCard.memo || '');
            
            // infoPlusProgressの値を設定（選択肢が更新された後）
            if (loadedCard.infoPlusProgress !== null && loadedCard.infoPlusProgress !== undefined) {
              const infoPlusProgressSelect = document.getElementById('infoPlusProgress');
              if (infoPlusProgressSelect && !infoPlusProgressSelect.disabled) {
                infoPlusProgressSelect.value = loadedCard.infoPlusProgress;
              }
            }
            
            updatePreview();
          }
        }
      }
    } catch (e) {
      console.error('Failed to init form:', e);
    }
  } else {
    // カードIDがない場合もフォームを調整
    adjustFormByInfoType(infoType, null);
  }

  // 情報タイプに応じてフォームを調整
  function adjustFormByInfoType(type, card) {
    // すべてのフォームグループを非表示にし、required属性を無効化
    const allGroups = document.querySelectorAll('.form-group');
    allGroups.forEach(group => {
      group.style.display = 'none';
      // required属性を持つ入力欄を無効化
      const requiredInputs = group.querySelectorAll('[required]');
      requiredInputs.forEach(input => {
        input.removeAttribute('required');
        input.dataset.wasRequired = 'true';
      });
    });

    if (type === 'sub-meaning') {
      // サブの意味＋対義語
      showFormGroup('#subMeaningsContainer');
      showFormGroup('#antonymsContainer');
      showFormGroup('#imageUrl');
      showFormGroup('#memo');
    } else if (type === 'derivative') {
      // 派生語
      showFormGroup('#derivativesContainer');
      showFormGroup('#imageUrl');
      showFormGroup('#memo');
    } else if (type === 'synonym') {
      // 類義語
      showFormGroup('#synonymsContainer');
      showFormGroup('#imageUrl');
      showFormGroup('#memo');
    } else if (type === 'example') {
      // 例文（上級）- 意味ごとに入力欄を表示
      addWordInfoHeader('#examplesContainer', card, 'example', '例文を入力');
      showFormGroup('#examplesContainer');
      hideAddButton('#addExample');
      showFormGroup('#imageUrl');
      showFormGroup('#memo');
    } else if (type === 'chunk-example') {
      // チャンク例文（上級）- 通常の表示
      showFormGroup('#chunkExamplesContainer');
      showFormGroup('#imageUrl');
      showFormGroup('#memo');
    } else if (type === 'phrase-example') {
      // よく使う表現の例文（上級）- 通常の表示
      showFormGroup('#phraseExamplesContainer');
      showFormGroup('#imageUrl');
      showFormGroup('#memo');
    } else if (type === 'translation') {
      // 英訳（完成）- 意味ごとに入力欄を表示
      addWordInfoHeader('#translationsContainer', card, 'translation', '英訳を入力');
      showFormGroup('#translationsContainer');
      hideAddButton('#addTranslation');
      showFormGroup('#imageUrl');
      showFormGroup('#memo');
    }
  }

  function hideAddButton(selector) {
    const btn = document.querySelector(selector);
    if (btn) btn.style.display = 'none';
  }

  function addWordInfoHeader(containerSelector, card, inputClass, placeholder) {
    const container = document.querySelector(containerSelector);
    if (!container || !card) return;
    
    const formGroup = container.closest('.form-group');
    if (!formGroup) return;
    
    // 既存のヘッダーやコンテナをクリア
    const existingHeaders = formGroup.querySelectorAll('.word-info-header, .meaning-example-pair');
    existingHeaders.forEach(el => el.remove());
    
    // 元のコンテナを非表示
    container.style.display = 'none';
    
    const word = card.word || '';
    const meaningsRaw = parseJSON(card.meanings);
    const subMeaningsRaw = parseJSON(card.subMeanings);
    
    // {text, pos}形式のオブジェクトからtextのみを抽出
    const meanings = meaningsRaw.map(m => typeof m === 'object' && m.text ? m.text : String(m || ''));
    const subMeanings = subMeaningsRaw.map(sm => typeof sm === 'object' && sm.text ? sm.text : String(sm || ''));
    
    // 既存の例文データを取得（例文の場合のみ）- 順番を維持して格納
    let existingExamples = [];
    if (inputClass === 'example' && card.exampleSentences) {
      const exampleSentences = parseJSON(card.exampleSentences);
      // 順番を維持した配列として格納
      if (Array.isArray(exampleSentences)) {
        existingExamples = exampleSentences.map(item => {
          if (typeof item === 'object') {
            return item.example || '';
          }
          return item || '';
        });
      }
    }

    // 既存の英訳を取得（翻訳の場合のみ）
    let existingTranslations = {};
    if (inputClass === 'translation') {
      const raw = card.translation;
      const parsed = parseJSON(raw);
      if (Array.isArray(parsed) && parsed.length) {
        parsed.forEach((t, idx) => {
          const key = meanings[idx] ?? `idx-${idx}`;
          existingTranslations[key] = t;
        });
      } else if (raw) {
        const firstKey = meanings[0] ?? 'translation';
        existingTranslations[firstKey] = String(raw);
      }
    }
    
    const label = formGroup.querySelector('label');
    
    // 単語名を表示
    const wordHeader = document.createElement('div');
    wordHeader.className = 'word-info-header';
    wordHeader.style.cssText = 'background: #f5f5f5; padding: 12px 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #333;';
    wordHeader.textContent = word;
    formGroup.appendChild(wordHeader);
    
    // 基本の意味ごとに入力欄を作成
    meanings.forEach((meaning, index) => {
      const existingValue = inputClass === 'example' ? (existingExamples[index] || '') : '';
      const pairDiv = document.createElement('div');
      pairDiv.className = 'meaning-example-pair';
      pairDiv.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #fafafa; border-radius: 6px; border: 1px solid #e0e0e0;';
      
      const preset = inputClass === 'translation' ? (existingTranslations[meaning] || '') : existingValue;
      pairDiv.innerHTML = `
        <div style="font-size: 14px; font-weight: bold; color: #555; margin-bottom: 10px;">${meaning}</div>
        <input type="text" class="${inputClass}" placeholder="${placeholder}" value="${preset}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
      `;
      
      formGroup.appendChild(pairDiv);
    });
    
    // サブの意味ごとに入力欄を作成（例文のみ）
    if (inputClass === 'example' && subMeanings.length > 0) {
      subMeanings.forEach((subMeaning, index) => {
        const existingValue = inputClass === 'example' ? (existingExamples[meanings.length + index] || '') : '';
        const preset = inputClass === 'translation' ? (existingTranslations[subMeaning] || '') : existingValue;
        const pairDiv = document.createElement('div');
        pairDiv.className = 'meaning-example-pair';
        pairDiv.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #fff3e0; border-radius: 6px; border: 1px solid #ffcc80;';
        
        pairDiv.innerHTML = `
          <div style="font-size: 14px; font-weight: bold; color: #555; margin-bottom: 10px;">${subMeaning} <span style="color: #ff9800; font-size: 12px;">(サブの意味)</span></div>
          <input type="text" class="${inputClass}" placeholder="${placeholder}" value="${preset}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
        `;
        
        formGroup.appendChild(pairDiv);
      });
    }
  }

  function showFormGroup(selector) {
    const input = document.querySelector(selector);
    if (input) {
      const group = input.closest('.form-group');
      if (group) group.style.display = '';
    }
  }

  // 入力補助: 追加ボタン
  bindAddButtons();
  bindPreviewUpdates();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!cardId || isNaN(cardId)) {
      alert('編集対象のカードが見つかりません（cardId: ' + cardId + '）');
      return;
    }

    // 例文の収集（意味と紐付けるために、loadedCard.meanings + subMeanings を使用）
    const meaningsRaw = loadedCard ? parseJSON(loadedCard.meanings) : [];
    const subMeaningsRaw = loadedCard ? parseJSON(loadedCard.subMeanings) : [];
    
    // {text, pos}形式のオブジェクトからtextのみを抽出
    const meanings = meaningsRaw.map(m => typeof m === 'object' && m.text ? m.text : String(m || ''));
    const subMeanings = subMeaningsRaw.map(sm => typeof sm === 'object' && sm.text ? sm.text : String(sm || ''));
    const allMeanings = [...meanings, ...subMeanings]; // 基本の意味とサブの意味を結合
    
    // 例文
    const exampleElements = document.querySelectorAll('.meaning-example-pair .example');
    const exampleInputs = Array.from(exampleElements).map(el => el.value.trim());
    const exampleSentences = allMeanings.map((meaning, idx) => ({
      meaning: meaning,
      example: exampleInputs[idx] || ''
    }));

    // 英訳（基本の意味のみ）
    const translationElements = document.querySelectorAll('.meaning-example-pair .translation');
    const translationInputs = Array.from(translationElements).map(el => el.value.trim());
    const translations = meanings.map((meaning, idx) => translationInputs[idx] || '');

    // チャンク例文と意味を紐付けて収集
    const chunkExamplesRaw = Array.from(document.querySelectorAll('#chunkExamplesContainer .chunk-example-input'))
      .map(row => {
        const example = row.querySelector('.chunk-example')?.value.trim() || '';
        const meaning = row.querySelector('.chunk-example-meaning')?.value.trim() || '';
        return { example, meaning };
      });
    
    // チャンク例文のバリデーション：チャンク例文を編集する場合のみ検証
    if (infoType === 'chunk-example') {
      for (let i = 0; i < chunkExamplesRaw.length; i++) {
        const item = chunkExamplesRaw[i];
        if ((item.example && !item.meaning) || (!item.example && item.meaning)) {
          alert(`チャンク例文${i + 1}: 例文と意味は両方入力するか、両方空にしてください`);
          return;
        }
      }
    }
    const chunkExamples = chunkExamplesRaw.filter(item => item.example !== '');

    // よく使う表現の例文と意味を紐付けて収集
    const commonExpressionsRaw = Array.from(document.querySelectorAll('#phraseExamplesContainer .phrase-example-input'))
      .map(row => {
        const example = row.querySelector('.phrase-example')?.value.trim() || '';
        const meaning = row.querySelector('.phrase-example-meaning')?.value.trim() || '';
        return { example, meaning };
      });
    
    // よく使う表現の例文のバリデーション：よく使う表現を編集する場合のみ検証
    if (infoType === 'phrase-example') {
      for (let i = 0; i < commonExpressionsRaw.length; i++) {
        const item = commonExpressionsRaw[i];
        if ((item.example && !item.meaning) || (!item.example && item.meaning)) {
          alert(`よく使う表現の例文${i + 1}: 例文と意味は両方入力するか、両方空にしてください`);
          return;
        }
      }
    }
    const commonExpressions = commonExpressionsRaw.filter(item => item.example !== '');

    // infoTypeに応じた進捗値を決定
    const progressMap = {
      'sub-meaning': 1,
      'derivative': 2,
      'synonym': 3,
      'example': 4,
      'chunk-example': 5,
      'phrase-example': 6,
      'translation': 7
    };
    const requiredProgress = progressMap[infoType] || 0;
    
    // 現在のinfoPlusProgressと比較して、大きい方を採用
    const currentProgress = loadedCard?.infoPlusProgress || 0;
    
    // ユーザーが選択したinfoPlusProgressを取得
    const selectedProgress = document.getElementById('infoPlusProgress')?.value;
    const userSelectedProgress = selectedProgress !== '' && !isNaN(Number(selectedProgress)) ? Number(selectedProgress) : null;
    
    // infoPlusProgressを決定：
    // 1. requiredProgress（情報タイプに応じた最小値）
    // 2. currentProgress（既存の値）
    // 3. userSelectedProgress（ユーザーが選択した値）
    // この3つの中で最大値を採用
    let infoPlusProgress = Math.max(currentProgress, requiredProgress);
    if (userSelectedProgress !== null) {
      infoPlusProgress = Math.max(infoPlusProgress, userSelectedProgress);
    }

    // サブの意味を品詞付きで収集
    const subMeaningsData = [];
    const subMeaningInputs = document.querySelectorAll('#subMeaningsContainer .sub-meaning-input');
    subMeaningInputs.forEach(input => {
      const text = input.querySelector('.sub-meaning')?.value.trim();
      const pos = input.querySelector('.sub-meaning-pos')?.value;
      if (text) {
        subMeaningsData.push({ text, pos: pos || '' });
      }
    });

    const payload = {
      subMeanings: JSON.stringify(subMeaningsData),
      antonyms: collectArray('#antonymsContainer', '.antonym'),
      synonyms: collectArray('#synonymsContainer', '.synonym'),
      derivedWords: collectArray('#derivativesContainer', '.derivative'),
      exampleSentences: exampleSentences,
      chunkExamples: chunkExamples,
      commonExpressions: commonExpressions,
      translation: JSON.stringify(translations),
      difficulty: loadedCard?.difficulty || 1 // 現在の難易度を保持
      // infoPlusProgressは保存時に変更しない（完了ボタンでのみ変更）
    };
    
    try {
      const resp = await fetch(`/api/wordnote/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      alert('保存しました');
    } catch (err) {
      console.error('Save error:', err);
      alert('保存に失敗しました: ' + err.message);
    }
  });

  document.getElementById('clearForm')?.addEventListener('click', () => {
    form.reset();
  });
  document.getElementById('finishBtn')?.addEventListener('click', () => {
    history.back();
  });

  // 完了ボタン：infoPlusProgressを更新し、評価値を変更
  document.getElementById('completeBtn')?.addEventListener('click', async () => {
    if (!cardId || isNaN(cardId)) {
      alert('編集対象のカードが見つかりません');
      return;
    }

    // infoTypeに応じた進捗値を決定
    const progressMap = {
      'sub-meaning': 1,
      'derivative': 2,
      'synonym': 3,
      'example': 4,
      'chunk-example': 5,
      'phrase-example': 6,
      'translation': 7
    };
    const requiredProgress = progressMap[infoType] || 0;

    // 現在のinfoPlusProgressを取得
    const currentProgress = loadedCard?.infoPlusProgress || 0;

    // 新しいinfoPlusProgressを決定：currentProgress + 1
    const newProgress = currentProgress + 1;
    
    // difficultyの更新を決定
    let newDifficulty = loadedCard?.difficulty || 1;
    const currentDifficultyName = ['初級', '中級', '上級', '完成'][newDifficulty - 1] || '初級';
    
    // infoPlusProgress = 3 で中級に昇格
    if (newProgress === 3 && newDifficulty < 2) {
      newDifficulty = 2; // 中級
      alert(`おめでとうございます！この単語は「中級」に昇格しました。`);
    }
    // infoPlusProgress = 7 で上級に昇格
    else if (newProgress === 7 && newDifficulty < 3) {
      newDifficulty = 3; // 上級
      alert(`おめでとうございます！この単語は「上級」に昇格しました。`);
    }

    // 評価値変更設定を取得
    let evaluationChange = null;
    if (bookId) {
      try {
        const bookResponse = await fetch(`/api/wordnote/books/${bookId}`);
        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          evaluationChange = bookData.evaluationChange || null;
        }
      } catch (err) {
        console.error('Error loading book settings:', err);
      }
    }
    
    // 個別設定がない場合（nullまたは空文字列）は全体設定を使用
    if (!evaluationChange || evaluationChange === '') {
      evaluationChange = localStorage.getItem('defaultEvaluationChange') || 'none';
    }

    // 評価値を変更
    let newStudyProgress = loadedCard?.studyProgress || 0;
    if (evaluationChange !== 'none' && evaluationChange !== '') {
      const decreaseValue = parseFloat(evaluationChange);
      if (!isNaN(decreaseValue) && decreaseValue > 0) {
        newStudyProgress = Math.max(0, newStudyProgress - decreaseValue);
      }
    }
    // 'none'の場合や無効な値の場合は変更しない

    try {
      const resp = await fetch(`/api/wordnote/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          infoPlusProgress: newProgress,
          difficulty: newDifficulty,
          studyProgress: newStudyProgress
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      
      if (newProgress < 7) {
        alert('完了しました！次の情報を追加できます。');
      } else {
        alert('完了しました！この単語のすべての情報が完了しました。');
      }
      history.back();
    } catch (err) {
      console.error('Complete error:', err);
      alert('完了に失敗しました: ' + err.message);
    }
  });

  function setValue(sel, val) {
    const el = document.querySelector(sel);
    if (el) el.value = val || '';
  }

  // infoPlusProgress選択肢を更新する関数
  function updateInfoPlusProgressOptions(bookDifficulty, infoTypeDifficulty) {
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
    
    // 情報タイプから推定される難易度による上限
    const infoTypeMaxProgress = levelToMaxProgress[infoTypeDifficulty] || 0;
    
    // 両方の最小値が実際の上限
    const maxProgress = Math.min(bookMaxProgress, infoTypeMaxProgress);

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
      infoPlusProgressSelect.disabled = true; // 常に変更不可
    }
  }

  function parseJSON(str) {
    try { return str ? JSON.parse(str) : []; } catch { return []; }
  }
  function setArrayInputs(containerSel, cls, arr, max = undefined, removable = false) {
    const container = document.querySelector(containerSel);
    if (!container) return;
    container.innerHTML = '';
    const count = arr && Array.isArray(arr) ? arr.length : 0;
    const items = count > 0 ? arr : [''];
    items.forEach((val, idx) => {
      const div = document.createElement('div');
      div.className = `${cls}-input`;
      div.innerHTML = `<input type="text" class="${cls}" placeholder="${cls}を入力" value="${val || ''}">` +
        (removable ? ` <button type="button" class="remove-${cls}" ${idx === 0 ? 'style="display:none;"' : ''}>－</button>` : '');
      container.appendChild(div);
    });
  }
  function collectArray(containerSel, inputSel) {
    return Array.from(document.querySelectorAll(`${containerSel} ${inputSel}`))
      .map(i => i.value.trim())
      .filter(v => v);
  }
  function bindAddButtons() {
    const addSubMeaning = document.getElementById('addSubMeaning');
    const subMeaningsContainer = document.getElementById('subMeaningsContainer');
    addSubMeaning?.addEventListener('click', () => {
      const existing = subMeaningsContainer.querySelectorAll('.sub-meaning').length;
      if (existing >= 2) return alert('サブの意味は最大2つです');
      
      // 選択された品詞を取得
      const selectedPos = Array.from(document.querySelectorAll('.pos-checkbox:checked'))
        .map(cb => cb.value);
      
      const div = document.createElement('div');
      div.className = 'sub-meaning-input';
      div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
      div.innerHTML = `
        <input type="text" class="sub-meaning" placeholder="サブの意味を入力" style="flex: 1;">
        <select class="sub-meaning-pos" style="width: 100px;">
          <option value="">品詞選択</option>
          ${selectedPos.map(pos => `<option value="${pos}">${pos}</option>`).join('')}
        </select>
      `;
      subMeaningsContainer.appendChild(div);
    });

    const addSynonym = document.getElementById('addSynonym');
    const synonymsContainer = document.getElementById('synonymsContainer');
    addSynonym?.addEventListener('click', () => {
      const existing = synonymsContainer.querySelectorAll('.synonym').length;
      if (existing >= 3) return alert('類義語は最大3つです');
      const div = document.createElement('div');
      div.className = 'synonym-input';
      div.innerHTML = `<input type="text" class="synonym" placeholder="類義語を入力"> <button type="button" class="remove-synonym">－</button>`;
      synonymsContainer.appendChild(div);
    });

    const addDerivative = document.getElementById('addDerivative');
    const derivativesContainer = document.getElementById('derivativesContainer');
    addDerivative?.addEventListener('click', () => {
      const existing = derivativesContainer.querySelectorAll('.derivative').length;
      if (existing >= 3) return alert('派生語は最大3つです');
      const div = document.createElement('div');
      div.className = 'derivative-input';
      div.innerHTML = `<input type="text" class="derivative" placeholder="派生語を入力"> <button type="button" class="remove-derivative">－</button>`;
      derivativesContainer.appendChild(div);
    });

    const addChunkExample = document.getElementById('addChunkExample');
    const chunkExamplesContainer = document.getElementById('chunkExamplesContainer');
    addChunkExample?.addEventListener('click', () => {
      const existing = chunkExamplesContainer.querySelectorAll('.chunk-example').length;
      if (existing >= 4) return alert('チャンク例文は最大4つです');
      const div = document.createElement('div');
      div.className = 'chunk-example-input';
      div.innerHTML = `<input type="text" class="chunk-example" placeholder="チャンク例文を入力"> <input type="text" class="chunk-example-meaning" placeholder="意味を入力"> <button type="button" class="remove-chunk-example">－</button>`;
      chunkExamplesContainer.appendChild(div);
    });

    const addPhraseExample = document.getElementById('addPhraseExample');
    const phraseExamplesContainer = document.getElementById('phraseExamplesContainer');
    addPhraseExample?.addEventListener('click', () => {
      const existing = phraseExamplesContainer.querySelectorAll('.phrase-example').length;
      if (existing >= 4) return alert('よく使う表現の例文は最大4つです');
      const div = document.createElement('div');
      div.className = 'phrase-example-input';
      div.innerHTML = `<input type="text" class="phrase-example" placeholder="よく使う表現の例文を入力"> <input type="text" class="phrase-example-meaning" placeholder="意味を入力"> <button type="button" class="remove-phrase-example">－</button>`;
      phraseExamplesContainer.appendChild(div);
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-synonym')) {
        e.target.closest('.synonym-input')?.remove();
      }
      if (e.target.classList.contains('remove-derivative')) {
        e.target.closest('.derivative-input')?.remove();
      }
      if (e.target.classList.contains('remove-chunk-example')) {
        e.target.closest('.chunk-example-input')?.remove();
      }
      if (e.target.classList.contains('remove-phrase-example')) {
        e.target.closest('.phrase-example-input')?.remove();
      }
    });
  }
  function bindPreviewUpdates() {
    const imageUrl = document.getElementById('imageUrl');
    const memo = document.getElementById('memo');
    const subMeaningsContainer = document.getElementById('subMeaningsContainer');
    const antonymsContainer = document.getElementById('antonymsContainer');
    const chunkExamplesContainer = document.getElementById('chunkExamplesContainer');
    const phraseExamplesContainer = document.getElementById('phraseExamplesContainer');
    
    if (imageUrl) imageUrl.addEventListener('input', updatePreview);
    if (memo) memo.addEventListener('input', updatePreview);
    if (subMeaningsContainer) subMeaningsContainer.addEventListener('input', updatePreview);
    if (antonymsContainer) antonymsContainer.addEventListener('input', updatePreview);
    if (chunkExamplesContainer) chunkExamplesContainer.addEventListener('input', updatePreview);
    if (phraseExamplesContainer) phraseExamplesContainer.addEventListener('input', updatePreview);
  }
  // 品詞チェックボックスの処理
  const posCheckboxes = document.querySelectorAll('.pos-checkbox');
  
  posCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      updateSubMeaningPosOptions();
      updatePreview();
    });
  });
  
  // サブの意味の品詞ドロップダウンを更新
  function updateSubMeaningPosOptions() {
    const selectedPos = Array.from(document.querySelectorAll('.pos-checkbox:checked'))
      .map(cb => cb.value);
    
    document.querySelectorAll('.sub-meaning-pos').forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">品詞選択</option>' +
        selectedPos.map(pos => `<option value="${pos}">${pos}</option>`).join('');
      if (selectedPos.includes(currentValue)) {
        select.value = currentValue;
      }
    });
  }
  
  // 初期読み込み後にドロップダウンを更新
  updateSubMeaningPosOptions();

  function updatePreview() {
    const pos = loadedCard?.partOfSpeech || '品詞';
    const word = loadedCard?.word || '単語';
    const pron = loadedCard?.pronunciation || '発音記号';
    const meaningsRaw = loadedCard ? parseJSON(loadedCard.meanings) : [];
    // サブの意味は入力欄から直接テキストと品詞を取得
    const subInputs = document.querySelectorAll('#subMeaningsContainer .sub-meaning-input');
    const subs = Array.from(subInputs).map(inputGroup => {
      const textInput = inputGroup.querySelector('.sub-meaning');
      const posSelect = inputGroup.querySelector('.sub-meaning-pos');
      const text = textInput ? textInput.value.trim() : '';
      const pos = posSelect ? posSelect.value : '';
      return { text, pos };
    }).filter(item => item.text); // 空のテキストを除外
    
    const antonyms = collectArray('#antonymsContainer', '.antonym');
    
    const imageUrlEl = document.getElementById('imageUrl');
    const memoEl = document.getElementById('memo');
    const imageUrl = imageUrlEl ? imageUrlEl.value : '';
    const memo = memoEl ? memoEl.value : '';

    const previewPos = document.getElementById('previewPos');
    const previewWord = document.getElementById('previewWord');
    const previewPron = document.getElementById('previewPron');
    
    // 品詞を略称で表示（配列対応）
    let posDisplay = pos;
    try {
      const posArray = JSON.parse(pos);
      if (Array.isArray(posArray)) {
        const posMap = {
          '名詞': '名', '動詞': '動', '形容詞': '形', '副詞': '副',
          '前置詞': '前', '接続詞': '接', '代名詞': '代', '間投詞': '間'
        };
        posDisplay = posArray.map(p => posMap[p] || p).join('/');
      }
    } catch {
      // JSON解析失敗時はそのまま
    }
    
    if (previewPos) previewPos.textContent = posDisplay;
    if (previewWord) previewWord.textContent = word;
    if (previewPron) previewPron.textContent = pron;

    // 基本の意味を表示（{text, pos}形式対応）
    const list = document.getElementById('previewMeanings');
    if (list) {
      list.innerHTML = '';
      meaningsRaw.forEach((m, i) => {
        const li = document.createElement('li');
        if (typeof m === 'object' && m.text) {
          // 新形式: {text, pos}
          const posMap = {
            '名詞': '名', '動詞': '動', '形容詞': '形', '副詞': '副',
            '前置詞': '前', '接続詞': '接', '代名詞': '代', '間投詞': '間'
          };
          const posLabel = m.pos ? `${posMap[m.pos] || m.pos}：` : '';
          li.textContent = `${i + 1}. ${posLabel}${m.text}`;
        } else {
          // 旧形式: 文字列
          li.textContent = `${i + 1}. ${m}`;
        }
        list.appendChild(li);
      });
    }

    const sublist = document.getElementById('previewSubMeanings');
    const subSection = document.getElementById('previewSubMeaningsSection');
    if (sublist) {
      sublist.innerHTML = '';
      if (subs.length > 0) {
        subs.forEach((item) => {
          const li = document.createElement('li');
          // 品詞の略称マップ
          const posMap = {
            '名詞': '名', '動詞': '動', '形容詞': '形', '副詞': '副',
            '前置詞': '前', '接続詞': '接', '代名詞': '代', '間投詞': '間'
          };
          const posLabel = item.pos ? `${posMap[item.pos] || item.pos}：` : '';
          li.textContent = `${posLabel}${item.text}`;
          sublist.appendChild(li);
        });
        if (subSection) subSection.style.display = 'block';
      } else {
        // サブの意味がない場合はセクション全体を非表示
        if (subSection) subSection.style.display = 'none';
      }
    }

    // 対義語をプレビューの extras に表示
    const previewExtras = document.getElementById('previewExtras');
    if (previewExtras) {
      previewExtras.innerHTML = '';
      const validAntonyms = antonyms.filter(a => a && a.trim() !== '');
      if (validAntonyms.length > 0) {
        const antDiv = document.createElement('div');
        antDiv.className = 'extras-item';
        antDiv.innerHTML = `<strong>対義語:</strong> ${validAntonyms.join(', ')}`;
        previewExtras.appendChild(antDiv);
      }
    }

    const previewImg = document.getElementById('previewImage');
    if (previewImg) {
      previewImg.textContent = imageUrl ? '' : '画像';
      previewImg.style.backgroundImage = imageUrl ? `url(${imageUrl})` : 'none';
    }

    const previewMemo = document.getElementById('previewMemo');
    if (previewMemo) {
      const memoP = previewMemo.querySelector('p');
      if (memoP) memoP.textContent = memo || 'メモがここに表示されます';
    }
  }
});