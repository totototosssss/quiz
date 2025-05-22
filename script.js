document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startScreenElement = document.getElementById('start-screen');
    const startGameButton = document.getElementById('start-game-button');
    const startScreenErrorElement = document.getElementById('start-screen-error'); // New for start screen errors
    const quizContainerElement = document.getElementById('quiz-container');

    const questionProgressDisplayElement = document.getElementById('question-progress-display');
    const questionTextElement = document.getElementById('question-text');
    const answerLengthHintElement = document.getElementById('answer-length-hint');
    const inputAreaElement = document.getElementById('input-area');
    const answerBoxesContainerElement = document.getElementById('answer-boxes-container');
    const stoneImageElement = document.getElementById('stone-image');
    const feedbackDisplayElement = document.getElementById('feedback-display');
    const generalFeedbackElement = document.getElementById('general-feedback');
    const attemptsLeftDisplayElement = document.getElementById('attempts-left-display');
    const actionButtonsElement = document.getElementById('action-buttons');
    const submitAnswerButton = document.getElementById('submit-answer-button');
    const nextButton = document.getElementById('next-button');
    const scoreAreaElement = document.getElementById('score-area');
    const scoreElement = document.getElementById('score');
    const quizFooterElement = document.getElementById('quiz-footer');
    
    const resultAreaElement = document.getElementById('result-area');
    const finalScoreElement = document.getElementById('final-score');
    const totalQuestionsInGameElement = document.getElementById('total-questions-in-game');
    const finalPointsElement = document.getElementById('final-points');

    const restartButton = document.getElementById('restart-button');
    const quizMainContentElement = document.getElementById('quiz-main-content');

    // Quiz State
    let allQuestions = [];
    let selectedQuestions = [];
    let currentQuestionIndex = 0;
    let currentAnswer = "";
    let totalPoints = 0;
    let correctAnswersCount = 0;
    let attemptsLeft = 0;
    let charInputBoxes = [];
    const MAX_ATTEMPTS = 3;
    const NUM_QUESTIONS_TO_PLAY = 10;

    let isComposing = false; 
    let programmaticChange = false; 

    const POINTS_ATTEMPT_1 = 10;
    const POINTS_ATTEMPT_2 = 5;
    const POINTS_ATTEMPT_3 = 3;

    function checkCriticalElementsExist() {
        const criticalElements = {
            startScreenElement, startGameButton, quizContainerElement, questionProgressDisplayElement,
            questionTextElement, answerBoxesContainerElement, feedbackDisplayElement,
            generalFeedbackElement, submitAnswerButton, nextButton, restartButton,
            resultAreaElement, quizMainContentElement, scoreElement, finalScoreElement,
            totalQuestionsInGameElement, finalPointsElement, startScreenErrorElement // Added
        };
        let allCriticalFound = true;
        for (const key in criticalElements) {
            if (!criticalElements[key]) {
                console.error(`SCRIPT_CRITICAL_ERROR: 必須HTML要素が見つかりません - ${key}。IDが正しいか、HTML内に存在するか確認してください。`);
                allCriticalFound = false;
            }
        }
        return allCriticalFound;
    }

    if (!checkCriticalElementsExist()) {
        alert("ページの初期化に必要なHTML要素が不足しています。HTMLのID等を確認してください。詳細はブラウザのコンソールを参照してください。");
        return; 
    }

    // スタート画面にエラーを表示する専用関数
    function displayStartScreenError(message) {
        if (startScreenErrorElement) {
            startScreenErrorElement.textContent = message;
            startScreenErrorElement.style.display = 'block';
        } else {
            // Fallback if the dedicated error element itself is missing
            console.error("SCRIPT_ERROR: スタート画面のエラー表示要素が見つかりません。");
            alert(message); 
        }
        if (startGameButton) {
            startGameButton.disabled = true; // 問題読み込み失敗時はスタートボタンを無効化
            console.log("SCRIPT: 問題読み込みエラーのため、スタートボタンを無効化しました。");
        }
    }
    
    async function initializeApp() {
        console.log("SCRIPT: initializeApp() が呼び出されました。");
        await loadQuestions(); // 問題データを先に読み込む

        if (startGameButton && !startGameButton.disabled) { // ボタンが存在し、無効化されていなければリスナー設定
            startGameButton.addEventListener('click', () => {
                console.log("SCRIPT: スタートボタンがクリックされました。");
                if (allQuestions.length === 0) {
                    alert("問題データが読み込まれていません。ページを再読み込みするか、管理者にお問い合わせください。");
                    console.warn("SCRIPT: allQuestionsが空の状態でスタートしようとしました。");
                    return;
                }
                if(startScreenErrorElement) startScreenErrorElement.style.display = 'none'; // エラーメッセージを隠す
                startScreenElement.style.display = 'none';
                quizContainerElement.style.display = 'flex'; 
                resultAreaElement.style.display = 'none'; 
                startGame(); 
            });
            console.log("SCRIPT: スタートボタンにイベントリスナーを設定しました。");
        } else {
            if (!startGameButton) {
                console.error("SCRIPT_CRITICAL_ERROR: スタートボタン(startGameButton)のHTML要素が見つかりません。");
                displayStartScreenError("スタートボタンの初期化に失敗しました。");
            } else if (startGameButton.disabled) {
                console.warn("SCRIPT: スタートボタンは無効化されています（おそらく問題読み込み失敗のため）。");
            }
        }
    }

    async function loadQuestions() {
        console.log("SCRIPT: loadQuestions() が呼び出されました。");
        try {
            const response = await fetch('train_questions.json');
            console.log(`SCRIPT: fetch('train_questions.json') のレスポンス - ステータス: ${response.status}, OK: ${response.ok}`);
            if (!response.ok) {
                const errorMsg = `問題ファイルの読み込みに失敗 (HTTP ${response.status})。ファイル名やパスを確認してください。`;
                console.error("SCRIPT: fetchエラー:", errorMsg);
                displayStartScreenError(errorMsg + " クイズを開始できません。"); // ここを修正
                return; 
            }
            
            const textData = await response.text();
            console.log(`SCRIPT: 読み込まれたテキストデータの長さ: ${textData.length} 文字`);
            if (!textData.trim()) {
                const errorMsg = '問題ファイルが空か、内容が空白文字のみです。';
                console.error("SCRIPT: ファイル内容が空です。");
                displayStartScreenError(errorMsg + " クイズを開始できません。"); // ここを修正
                return;
            }

            const lines = textData.trim().split('\n');
            let parsedLinesCount = 0, validQuestionsCount = 0;
            allQuestions = lines.map((line, index) => {
                const lineNumber = index + 1; if (!line.trim()) return null; 
                try {
                    const q = JSON.parse(line); parsedLinesCount++;
                    if (q && q.question && typeof q.question === 'string' && q.question.trim() !== "" && q.answer_entity && typeof q.answer_entity === 'string' && q.answer_entity.trim() !== "") {
                        validQuestionsCount++; return q;
                    } else { console.warn(`SCRIPT: ${lineNumber}行目: 必須項目エラー。`); return null; }
                } catch (parseError) { console.error(`SCRIPT: ${lineNumber}行目: JSON解析エラー - ${parseError.message}。`); return null; }
            }).filter(q => q !== null); 

            console.log(`SCRIPT: 解析試行行数: ${parsedLinesCount}, 有効問題数: ${validQuestionsCount}, 最終問題数: ${allQuestions.length}`);
            if (allQuestions.length === 0) {
                const errorMsg = '有効な問題データが読み込めませんでした。ファイル内容を確認してください。';
                console.error("SCRIPT: 有効な問題が0件でした。");
                displayStartScreenError(errorMsg + " クイズを開始できません。"); // ここを修正
            } else {
                console.log("SCRIPT: 問題データの読み込み完了。スタートボタンが有効になります。");
                if(startScreenErrorElement) startScreenErrorElement.style.display = 'none'; // 成功したらエラーメッセージを隠す
                if(startGameButton) startGameButton.disabled = false; // 成功したらボタンを有効化
            }
        } catch (error) { 
            console.error('SCRIPT: loadQuestions内で致命的エラー:', error);
            displayStartScreenError(`問題読み込み中に予期せぬエラー: ${error.message} クイズを開始できません。`); // ここを修正
        }
    }

    function displayErrorInQuiz(message) { 
        console.error("SCRIPT: displayErrorInQuiz:", message);
        if (questionTextElement) {
            questionTextElement.textContent = message;
            questionTextElement.style.color = '#e74c3c';
        }
        const elementsToHideOnError = [ quizMainContentElement, quizFooterElement, resultAreaElement, answerLengthHintElement, inputAreaElement, feedbackDisplayElement, generalFeedbackElement, attemptsLeftDisplayElement, actionButtonsElement, scoreAreaElement ];
        elementsToHideOnError.forEach(el => { if (el) el.style.display = 'none'; });
    }

    function startGame() {
        console.log("SCRIPT: startGame() が呼び出されました。");
        if (!quizMainContentElement || !quizFooterElement || !resultAreaElement || !questionTextElement || !totalQuestionsElement || !questionProgressDisplayElement) {
             console.error("SCRIPT_CRITICAL: startGameに必要なUI要素がありません。"); 
             displayErrorInQuiz("UI部品不足でゲーム開始不可。");
             return;
        }

        quizMainContentElement.style.display = 'block';
        quizFooterElement.style.display = 'block';
        resultAreaElement.style.display = 'none';
        questionTextElement.style.color = '#34495e'; 
        
        totalPoints = 0;
        correctAnswersCount = 0;
        currentQuestionIndex = 0;
        updateScoreDisplay(); 

        let shuffled = shuffleArray([...allQuestions]);
        const numToShowThisGame = Math.min(NUM_QUESTIONS_TO_PLAY, shuffled.length);
        if (numToShowThisGame === 0) {
            displayErrorInQuiz("プレイできる問題がありません。");
            return;
        }
        selectedQuestions = shuffled.slice(0, numToShowThisGame);
        
        console.log(`SCRIPT: 今回プレイする問題数: ${selectedQuestions.length}`);
        
        if(inputAreaElement) inputAreaElement.style.display = 'flex';
        if(answerLengthHintElement) answerLengthHintElement.style.display = 'block';
        if(feedbackDisplayElement) { feedbackDisplayElement.style.display = 'block'; feedbackDisplayElement.innerHTML = ''; }
        if(generalFeedbackElement) { generalFeedbackElement.style.display = 'block'; generalFeedbackElement.textContent = ""; }
        if(attemptsLeftDisplayElement) attemptsLeftDisplayElement.style.display = 'block';
        if(actionButtonsElement) actionButtonsElement.style.display = 'flex';
        if(submitAnswerButton) submitAnswerButton.style.display = 'inline-block';
        if(stoneImageElement) stoneImageElement.style.display = 'none'; 

        displayQuestion();
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array;
    }

    function createCharInputBoxes(answerLength) { /* ... (内容は変更なし、前回のIME対応版を使用) ... */
        if (!answerBoxesContainerElement) { console.error("SCRIPT_ERROR: answerBoxesContainerElement is null."); return; }
        answerBoxesContainerElement.innerHTML = ''; charInputBoxes = []; 
        for (let i = 0; i < answerLength; i++) {
            const inputBox = document.createElement('input');
            inputBox.type = 'text'; inputBox.classList.add('char-box'); inputBox.maxLength = 1; inputBox.dataset.index = i;
            inputBox.addEventListener('compositionstart', () => { isComposing = true; /* console.log(`SCRIPT: inputBox ${i} - COMPOSITIONSTART`); */ });
            inputBox.addEventListener('compositionend', (e) => {
                isComposing = false; const target = e.target; const startIndex = parseInt(target.dataset.index);
                const eventDataString = e.data || ""; 
                // alert(`DEBUG: IME End (Box ${startIndex})\ne.data: "${eventDataString}"\nValue: "${target.value}"`); // 必要ならコメント解除
                // console.log(`SCRIPT: inputBox ${startIndex} - COMPOSITIONEND. e.data: "${eventDataString}", target.value: "${target.value}"`);
                let stringToDistribute = eventDataString;
                // console.log(`    > Distribute: "${stringToDistribute}"`);
                if (stringToDistribute && stringToDistribute.length > 0) {
                    programmaticChange = true; let lastFilledBoxActualIndex = startIndex - 1; 
                    for (let k = 0; k < stringToDistribute.length; k++) {
                        const currentProcessingBoxIndex = startIndex + k;
                        if (currentProcessingBoxIndex < charInputBoxes.length) {
                            const charToPlace = stringToDistribute.charAt(k);
                            charInputBoxes[currentProcessingBoxIndex].value = charToPlace;
                            // console.log(`    > "${charToPlace}" to box ${currentProcessingBoxIndex}`);
                            lastFilledBoxActualIndex = currentProcessingBoxIndex;
                        } else { /* console.log(`    > No more boxes for "${stringToDistribute.substring(k)}"`); */ break; }
                    }
                    const nextFocusCandidateIndex = lastFilledBoxActualIndex + 1;
                    if (nextFocusCandidateIndex < charInputBoxes.length) { /* console.log(`    > Focus to ${nextFocusCandidateIndex}`); */ charInputBoxes[nextFocusCandidateIndex].focus(); } 
                    else if (lastFilledBoxActualIndex >= 0 && lastFilledBoxActualIndex < charInputBoxes.length) { /* console.log(`    > Focus to last filled ${lastFilledBoxActualIndex}`); */ charInputBoxes[lastFilledBoxActualIndex].focus(); }
                    Promise.resolve().then(() => { programmaticChange = false; });
                } else {
                    // console.log(`    > No string from e.data. target.value: "${target.value}"`);
                    if (target.value.length === 1 && startIndex < charInputBoxes.length - 1) { /* console.log(`    > Fallback focus ${startIndex + 1}`); */ charInputBoxes[startIndex + 1].focus(); }
                }
            });
            inputBox.addEventListener('input', (e) => {
                const target = e.target; const currentIndex = parseInt(target.dataset.index);
                if (isComposing || programmaticChange) return;
                let value = target.value; if (value.length > 1) { target.value = value.charAt(0); value = target.value; }
                if (value.length === 1 && currentIndex < charInputBoxes.length - 1) { charInputBoxes[currentIndex + 1].focus(); }
            });
            inputBox.addEventListener('keydown', (e) => {
                const currentIndex = parseInt(e.target.dataset.index);
                if (e.key === 'Backspace' && e.target.value === '' && !isComposing && currentIndex > 0) { e.preventDefault(); charInputBoxes[currentIndex - 1].focus(); } 
                else if (e.key === 'ArrowLeft' && !isComposing && currentIndex > 0) { e.preventDefault(); charInputBoxes[currentIndex - 1].focus(); } 
                else if (e.key === 'ArrowRight' && !isComposing && currentIndex < charInputBoxes.length - 1) { e.preventDefault(); charInputBoxes[currentIndex + 1].focus(); }
            });
            inputBox.addEventListener('focus', (e) => { e.target.select(); });
            answerBoxesContainerElement.appendChild(inputBox); charInputBoxes.push(inputBox);
        }
        if (charInputBoxes.length > 0) { charInputBoxes[0].focus(); }
    }

    function displayQuestion() {
        console.log(`SCRIPT: displayQuestion() - 問題 ${currentQuestionIndex + 1} / ${selectedQuestions.length}`);
        if (!questionTextElement || !answerLengthHintElement || !submitAnswerButton || !nextButton || !questionProgressDisplayElement || !attemptsLeftDisplayElement) {
            console.error("SCRIPT_CRITICAL: displayQuestionに必要なUI要素が不足。"); displayErrorInQuiz("UI表示エラー。"); return;
        }

        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();
            console.log(`SCRIPT: 現在の正解: "${currentAnswer}" (長さ: ${currentAnswer.length})`);

            questionProgressDisplayElement.textContent = `${selectedQuestions.length}問中 ${currentQuestionIndex + 1}問目`;
            answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            createCharInputBoxes(currentAnswer.length); 
            if (stoneImageElement) stoneImageElement.style.display = 'block'; 
            
            if(feedbackDisplayElement) feedbackDisplayElement.innerHTML = "";
            if(generalFeedbackElement) { generalFeedbackElement.textContent = ""; generalFeedbackElement.className = ""; }
            
            attemptsLeft = MAX_ATTEMPTS; 
            attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
            
            charInputBoxes.forEach(box => box.disabled = false);
            submitAnswerButton.disabled = false;
            submitAnswerButton.style.display = 'inline-block';
            nextButton.style.display = 'none';
        } else {
            console.log("SCRIPT: 全問題終了。結果表示。");
            showResults();
        }
    }
    
    function handleSubmitAnswer() {
        if (!submitAnswerButton || submitAnswerButton.disabled) return;
        if (!generalFeedbackElement || !feedbackDisplayElement || !attemptsLeftDisplayElement) { console.error("SCRIPT_CRITICAL: handleSubmitAnswerに必要なUI要素が不足。"); return;}

        let userInput = charInputBoxes.map(box => box.value).join('');
        console.log(`SCRIPT: ユーザー入力: "${userInput}", 正解: "${currentAnswer}"`);

        if (userInput.length !== currentAnswer.length) {
            generalFeedbackElement.textContent = `答えは ${currentAnswer.length} 文字全て入力してください。`;
            generalFeedbackElement.className = "incorrect";
            const firstEmptyBox = charInputBoxes.find(box => box.value === '');
            if (firstEmptyBox) { firstEmptyBox.focus(); } else if (charInputBoxes.length > 0) { charInputBoxes[0].focus(); }
            return;
        }

        let isCorrect = userInput === currentAnswer;
        let feedbackSymbols = [];

        if (isCorrect) {
            let pointsAwarded = 0;
            if (attemptsLeft === MAX_ATTEMPTS) { 
                pointsAwarded = POINTS_ATTEMPT_1;
            } else if (attemptsLeft === MAX_ATTEMPTS - 1) { 
                pointsAwarded = POINTS_ATTEMPT_2;
            } else if (attemptsLeft === MAX_ATTEMPTS - 2) { 
                pointsAwarded = POINTS_ATTEMPT_3;
            }
            totalPoints += pointsAwarded;
            correctAnswersCount++; 
            generalFeedbackElement.textContent = `正解！ 🎉 ${pointsAwarded}ポイント獲得！`;
            generalFeedbackElement.className = "correct";
            feedbackSymbols = userInput.split('').map(() => '✅');
            finalizeAttempt(true); 
        } else {
            attemptsLeft--; 
            const answerChars = currentAnswer.split(''), inputChars = userInput.split('');
            const tempFeedback = new Array(currentAnswer.length).fill(null); const answerCharCounts = {};
            for (const char of answerChars) { answerCharCounts[char] = (answerCharCounts[char] || 0) + 1; }
            for (let i = 0; i < currentAnswer.length; i++) { if (inputChars[i] === answerChars[i]) { tempFeedback[i] = '✅'; answerCharCounts[inputChars[i]]--; } }
            for (let i = 0; i < currentAnswer.length; i++) { if (tempFeedback[i] === null) { if (answerChars.includes(inputChars[i]) && answerCharCounts[inputChars[i]] > 0) { tempFeedback[i] = '☑️'; answerCharCounts[inputChars[i]]--; } else { tempFeedback[i] = '❌'; } } }
            feedbackSymbols = tempFeedback;

            if (attemptsLeft > 0) {
                generalFeedbackElement.textContent = `不正解です。`;
                generalFeedbackElement.className = "incorrect";
                if (charInputBoxes.length > 0) charInputBoxes[0].focus(); 
                charInputBoxes.forEach(box => box.select()); 
            } else {
                generalFeedbackElement.textContent = `残念！正解は「${currentAnswer}」でした。`;
                generalFeedbackElement.className = "incorrect";
                finalizeAttempt(false); 
            }
        }
        
        if(feedbackDisplayElement) feedbackDisplayElement.innerHTML = feedbackSymbols.join(' ');
        if(attemptsLeftDisplayElement) attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
        updateScoreDisplay();
    }

    function finalizeAttempt(wasCorrect) {
        charInputBoxes.forEach(box => box.disabled = true);
        if (submitAnswerButton) submitAnswerButton.disabled = true;
        if (nextButton) nextButton.style.display = 'inline-block';
    }

    function updateScoreDisplay() { 
        if (scoreElement) scoreElement.textContent = totalPoints;
    }
    
    function showResults() {
        if(quizContainerElement) quizContainerElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block';   
        
        if(finalScoreElement) finalScoreElement.textContent = correctAnswersCount; 
        if(totalQuestionsInGameElement) totalQuestionsInGameElement.textContent = selectedQuestions.length; 
        if(finalPointsElement) finalPointsElement.textContent = totalPoints; 
    }

    // --- イベントリスナー設定 ---
    // submitAnswerButton, nextButton, restartButton は checkCriticalElementsExist で存在確認済みと仮定
    if (submitAnswerButton) { submitAnswerButton.addEventListener('click', handleSubmitAnswer); } 
    if (nextButton) { nextButton.addEventListener('click', () => { currentQuestionIndex++; displayQuestion(); }); }
    if (restartButton) { restartButton.addEventListener('click', () => {
        console.log("SCRIPT: リスタートボタンがクリックされました。");
        // スタート画面に戻す
        if (resultAreaElement) resultAreaElement.style.display = 'none';
        if (startScreenElement) startScreenElement.style.display = 'block';
        // startGameButton の状態をリセット (問題が読み込めていれば有効のはず)
        if (startGameButton && allQuestions.length > 0) {
            startGameButton.disabled = false;
        }
    }); }
    
    // --- アプリ初期化実行 ---
    initializeApp(); 
});
