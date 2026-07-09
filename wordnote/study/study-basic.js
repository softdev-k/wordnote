// study-basic.js - 初級学習用関数

// 品詞を略称に変換
function getShortPos(pos) {
  const posMap = {
    '名詞': '名',
    '動詞': '動',
    '形容詞': '形',
    '副詞': '副',
    '前置詞': '前',
    '接続詞': '接',
    '代名詞': '代',
    '間投詞': '間'
  };
  return posMap[pos] || pos;
}

// 品詞の解析（配列または文字列）
function parsePartOfSpeech(posString) {
  if (!posString) return '';
  
  // すでに配列の場合
  if (Array.isArray(posString)) {
    return posString.map(p => getShortPos(p)).join('/');
  }
  
  try {
    const posArray = JSON.parse(posString);
    if (Array.isArray(posArray)) {
      return posArray.map(p => getShortPos(p)).join('/');
    }
  } catch {
    // JSON解析失敗時は旧形式として扱う
  }
  
  // 旧形式の場合はそのまま返す
  return getShortPos(posString);
}

// 意味の解析（{text, pos}配列または文字列配列）
function parseMeanings(meaningsString) {
  if (!meaningsString) return [];
  
  try {
    const meanings = JSON.parse(meaningsString);
    if (!Array.isArray(meanings)) return [];
    
    return meanings.map((item, index) => {
      // 新形式: {text, pos}
      if (typeof item === 'object' && item.text) {
        const posLabel = item.pos ? `${getShortPos(item.pos)}：` : '';
        return { posLabel, text: item.text, index: index + 1 };
      }
      // 旧形式: 文字列
      return { posLabel: '', text: item, index: index + 1 };
    });
  } catch {
    // JSON解析失敗時は空配列
    return [];
  }
}

// コンテンツの存在チェック
function hasContent(jsonString) {
  if (!jsonString) return false;
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // 配列の場合
    if (Array.isArray(parsed)) {
      return parsed.length > 0;
    }
    
    // 文字列の場合
    if (typeof parsed === 'string') {
      return parsed.trim().length > 0;
    }
    
    return false;
  } catch {
    // JSON形式でない場合は文字列として扱う
    return jsonString.trim().length > 0;
  }
}

// 初級学習の初期化
function initBasicStudy(card, questionPrompt, questionBtn) {
  // 問題文とボタンを設定
  questionPrompt.textContent = '和訳を思い出せますか？';
  questionBtn.textContent = '答えを見る';
  questionBtn.disabled = false;

  // ボタンクリック時の処理
  questionBtn.onclick = () => {
    showBasicAnswer();
  };
}

// 初級：答えを見るボタンのイベント処理
function showBasicAnswer() {
  const hiddenTexts = document.querySelectorAll('.meaning-text.hidden-text');
  hiddenTexts.forEach(text => {
    text.classList.remove('hidden-text');
  });
  
  // 学習方法に応じて処理を分岐
  const urlParams = new URLSearchParams(window.location.search);
  const studyMethod = urlParams.get('studyMethod');
  const difficulty = urlParams.get('difficulty');
  
  if (studyMethod === 'random' || difficulty) {
    // ランダム学習・難易度別学習：次へボタンを表示
    showNextButton();
  } else {
    // 今日の学習：評価ボタンを表示
    showEvaluationButtons();
  }
}

// 単語カードのHTML作成（初級・中級共用）
function createWordCard(card, currentDifficulty) {
  // 上級の場合は例文形式で表示
  if (currentDifficulty === '上級') {
    return createAdvancedWordCard(card);
  }

  // 品詞の表示（複数対応）
  const partOfSpeechDisplay = parsePartOfSpeech(card.partOfSpeech);

  // 基本の意味の表示設定（品詞付き）
  const meaningsData = parseMeanings(card.meanings);
  const meaningHiddenClass = currentDifficulty === '中級' ? '' : 'hidden-text';
  const meaningsHTML = meaningsData.slice(0, 3).map(item => 
    `<li>${item.index}. ${item.posLabel}<span class="meaning-text ${meaningHiddenClass}">${item.text}</span></li>`
  ).join('');

  const imageHTML = card.imageUrl && card.imageUrl.trim() !== ''
    ? `<div class="card-image"><img src="${card.imageUrl}" alt="${card.word}"></div>`
    : '';

  // infoPlusProgressに応じた追加情報の表示
  let additionalInfoHTML = '';
  const infoPlusProgress = card.infoPlusProgress || 0;
  
  // 初級の場合は追加情報を表示しない
  if (currentDifficulty !== '初級') {
    // 中級の場合：すべてモザイク表示
    const hiddenClass = currentDifficulty === '中級' ? 'hidden-text' : '';

    // infoPlusProgress >= 1: サブの意味 + 対義語を表示（データがある場合のみ）
    if (infoPlusProgress >= 1) {
      let subMeaningsHTML = '';
      let antonymsHTML = '';

      if (hasContent(card.subMeanings)) {
        try {
          const subMeaningsData = parseMeanings(card.subMeanings);
          if (subMeaningsData.length > 0) {
            subMeaningsHTML = `
              <div class="card-sub-meanings card-subMeanings">
                <h3>サブの意味</h3>
                <ul>
                  ${subMeaningsData.map(item => `<li>${item.posLabel}<span class="${hiddenClass}">${item.text}</span></li>`).join('')}
                </ul>
              </div>
            `;
          }
        } catch (e) {
          console.error('Error parsing subMeanings:', e);
        }
      }

      if (hasContent(card.antonyms)) {
        try {
          const antonyms = JSON.parse(card.antonyms);
          antonymsHTML = `
            <div class="card-antonyms card-antonyms">
              <h3>対義語</h3>
              <ul>
                ${antonyms.map((antonym, index) => `<li><span class="${hiddenClass}">${antonym}</span></li>`).join('')}
              </ul>
            </div>
          `;
        } catch (e) {
          console.error('Error parsing antonyms:', e);
        }
      }

      additionalInfoHTML += subMeaningsHTML + antonymsHTML;
    }

    // infoPlusProgress >= 2: 派生語を表示（データがある場合のみ）
    if (infoPlusProgress >= 2 && hasContent(card.derivedWords)) {
      try {
        const derivedWords = JSON.parse(card.derivedWords);
        const derivedWordsHTML = `
          <div class="card-derived-words card-derivedWords">
            <h3>派生語</h3>
            <ul>
              ${derivedWords.map((word, index) => `<li><span class="${hiddenClass}">${word}</span></li>`).join('')}
            </ul>
          </div>
        `;
        additionalInfoHTML += derivedWordsHTML;
      } catch (e) {
        console.error('Error parsing derivedWords:', e);
      }
    }

    // infoPlusProgress >= 3: 類義語を表示（データがある場合のみ）
    if (infoPlusProgress >= 3 && hasContent(card.synonyms)) {
      try {
        const synonyms = JSON.parse(card.synonyms);
        const synonymsHTML = `
          <div class="card-synonyms card-synonyms">
            <h3>類義語</h3>
            <ul>
              ${synonyms.map((synonym, index) => `<li><span class="${hiddenClass}">${synonym}</span></li>`).join('')}
            </ul>
          </div>
        `;
        additionalInfoHTML += synonymsHTML;
      } catch (e) {
        console.error('Error parsing synonyms:', e);
      }
    }
  }

  return `
    <div class="word-card">
      <div class="card-header">
        <div class="card-pos">${partOfSpeechDisplay}</div>
        <div class="card-word">${card.word}</div>
        <button class="card-audio-btn" onclick="speakWord('${card.word}')">音声</button>
      </div>
      ${card.pronunciation ? `<div class="card-pronunciation">${card.pronunciation}</div>` : ''}
      <div class="card-body">
        <div class="card-meanings" id="cardMeanings">
          <h3>和訳</h3>
          <ul>${meaningsHTML}</ul>
        </div>
        ${additionalInfoHTML ? `
          <div class="card-body-lower">
            <div class="relations-container">
              ${additionalInfoHTML}
            </div>
            <div class="card-image">${imageHTML ? imageHTML : ''}</div>
          </div>
        ` : imageHTML}
      </div>
    </div>
  `;
}
