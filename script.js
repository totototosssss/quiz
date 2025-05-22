document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const appContainer = document.querySelector('.app-container'); // Not strictly needed yet
    const startScreenElement = document.getElementById('start-screen');
    const startGameButton = document.getElementById('start-game-button');
    const quizContainerElement = document.getElementById('quiz-container');

    const questionProgressDisplayElement = document.getElementById('question-progress-display'); // New
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
    const scoreElement = document.getElementById('score'); // This will show current points
    const quizFooterElement = document.getElementById('quiz-footer');
    
    const resultAreaElement = document.getElementById('result-area');
    const finalScoreElement = document.getElementById('final-score'); // For number of correct questions
    const totalQuestionsInGameElement = document.getElementById('total-questions-in-game'); // New ID for HTML consistency
    const finalPointsElement = document.getElementById('final-points'); // For total points

    const restartButton = document.getElementById('restart-button');
    const quizMainContentElement = document.getElementById('quiz-main-content');

    // Quiz State
    let allQuestions = [];
    let selectedQuestions = [];
    let currentQuestionIndex = 0;
    let currentAnswer = "";
    let totalPoints = 0; // Changed from 'score' to 'totalPoints' for clarity
    let correctAnswersCount = 0; // To count number of correctly answered questions
    let attemptsLeft = 0;
    let charInputBoxes = [];
    const MAX_ATTEMPTS = 3;
    const NUM_QUESTIONS_TO_PLAY = 10; // Number of questions per game

    let isComposing = false; 
    let programmaticChange = false; 

    // Points system
    const POINTS_ATTEMPT_1 = 10;
    const POINTS_ATTEMPT_2 = 5;
    const POINTS_ATTEMPT_3 = 3;

    function checkCriticalElementsExist() {
        const criticalElements = {
            startScreenElement, startGameButton, quizContainerElement, questionProgressDisplayElement,
            questionTextElement, answerBoxesContainerElement, feedbackDisplayElement,
            generalFeedbackElement, submitAnswerButton, nextButton, restartButton,
            resultAreaElement, quizMainContentElement, scoreElement, finalScoreElement,
            totalQuestionsInGameElement, finalPointsElement
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
        alert("ページの初期化に失敗しました。HTMLの構造やIDが正しいか確認してください。詳細はブラウザのコンソールを参照してください。");
        return; 
    }

    async function initializeApp() {
        console.log("SCRIPT: initializeApp() が呼び出されました。");
        // 問題データを先に読み込む
        await loadQuestions();
        // スタートボタンにイベントリスナーを設定
        if (startGameButton) {
            startGameButton.addEventListener('click', () => {
                if (allQuestions.length === 0) {
                    alert("問題データが読み込まれていません。ページを再読み込みするか、管理者にお問い合わせください。");
                    return;
                }
                startScreenElement.style.display = 'none';
                quizContainerElement.style.display = 'flex'; // quiz-container を表示
                resultAreaElement.style.display = 'none'; // 結果エリアを隠す
                startGame();
            });
        } else {
            console.error("SCRIPT_CRITICAL_ERROR: スタートボタンが見つかりません。");
            if (questionTextElement) questionTextElement.textContent = "スタートボタンが設定されていません。";
        }
    }


    async function loadQuestions() {
        console.log("SCRIPT: loadQuestions() が呼び出されました。");
        // questionTextElement は startGame で初期化されるのでここでは触らない
        try {
            const response = await fetch('train_questions.json');
            console.log(`SCRIPT: fetch('train_questions.json') のレスポンス - ステータス: ${response.status}, OK: ${response.ok}`);
            if (!response.ok) {
                const errorMsg = `問題ファイルの読み込みに失敗 (HTTP ${response.status})。ファイル名や場所を確認。`;
                console.error("SCRIPT: fetchエラー:", errorMsg);
                if (startScreenElement) startScreenElement.innerHTML = `<p style="color:red;">${errorMsg} 問題を読み込めません。</p>`;
                return; 
            }
            const textData = await response.text();
            if (!textData.trim()) {
                const errorMsg = '問題ファイルが空か、内容が空白文字のみです。';
                console.error("SCRIPT: ファイル内容が空です。");
                if (startScreenElement) startScreenElement.innerHTML = `<p style="color:red;">${errorMsg}</p>`;
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
                const errorMsg = '有効な問題データが読み込めませんでした。コンソール確認。';
                console.error("SCRIPT: 有効な問題が0件でした。");
                if (startScreenElement) startScreenElement.innerHTML = `<p style="color:red;">${errorMsg}</p>`;
            } else {
                console.log("SCRIPT: 問題データの読み込み完了。");
            }
        } catch (error) { 
            console.error('SCRIPT: loadQuestions内で致命的エラー:', error);
            if (startScreenElement) startScreenElement.innerHTML = `<p style="color:red;">問題読み込み中に予期せぬエラー: ${error.message}</p>`;
        }
    }

    function displayErrorInQuiz(message) { // クイズ中のエラー表示
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
        quizMainContentElement.style.display = 'block';
        quizFooterElement.style.display = 'block';
        resultAreaElement.style.display = 'none';
        questionTextElement.style.color = '#34495e'; 
        
        totalPoints = 0;
        correctAnswersCount = 0;
        currentQuestionIndex = 0;
        updateScoreDisplay(); // totalPoints を表示

        let shuffled = shuffleArray([...allQuestions]);
        const numToShowThisGame = Math.min(NUM_QUESTIONS_TO_PLAY, shuffled.length);
        if (numToShowThisGame === 0) {
            displayErrorInQuiz("プレイできる問題がありません。");
            return;
        }
        selectedQuestions = shuffled.slice(0, numToShowThisGame);
        
        console.log(`SCRIPT: 今回プレイする問題数: ${selectedQuestions.length}`);
        
        // UI要素の表示状態をリセット
        if(inputAreaElement) inputAreaElement.style.display = 'flex';
        if(answerLengthHintElement) answerLengthHintElement.style.display = 'block';
        if(feedbackDisplayElement) { feedbackDisplayElement.style.display = 'block'; feedbackDisplayElement.innerHTML = ''; }
        if(generalFeedbackElement) { generalFeedbackElement.style.display = 'block'; generalFeedbackElement.textContent = ""; }
        if(attemptsLeftDisplayElement) attemptsLeftDisplayElement.style.display = 'block';
        if(actionButtonsElement) actionButtonsElement.style.display = 'flex';
        if(submitAnswerButton) submitAnswerButton.style.display = 'inline-block';
        if(stoneImageElement) stoneImageElement.style.display = 'none'; // Initially hidden

        displayQuestion();
    }

    function shuffleArray(array) { /* ... (内容は変更なし) ... */
        for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array;
    }

    function createCharInputBoxes(answerLength) { /* ... (内容は変更なし、前回のIME対応版を使用) ... */
        if (!answerBoxesContainerElement) { console.error("SCRIPT_ERROR: answerBoxesContainerElement is null."); return; }
        answerBoxesContainerElement.innerHTML = ''; charInputBoxes = []; 
        for (let i = 0; i < answerLength; i++) {
            const inputBox = document.createElement('input');
            inputBox.type = 'text'; inputBox.classList.add('char-box'); inputBox.maxLength = 1; inputBox.dataset.index = i;
            inputBox.addEventListener('compositionstart', () => { isComposing = true; console.log(`SCRIPT: inputBox ${i} - COMPOSITIONSTART`); });
            inputBox.addEventListener('compositionend', (e) => {
                isComposing = false; const target = e.target; const startIndex = parseInt(target.dataset.index);
                const eventDataString = e.data || ""; const targetValueBeforeProcessing = target.value;
                // alert(`【デバッグ情報】IME変換完了 (ボックス ${startIndex})\ne.data: "${eventDataString}"\n元の値: "${targetValueBeforeProcessing}"`); // 必要ならコメント解除
                console.log(`SCRIPT: inputBox ${startIndex} - COMPOSITIONEND. e.data: "${eventDataString}", target.value: "${targetValueBeforeProcessing}"`);
                let stringToDistribute = eventDataString;
                console.log(`    > 分配試行文字列: "${stringToDistribute}"`);
                if (stringToDistribute && stringToDistribute.length > 0) {
                    programmaticChange = true; let lastFilledBoxActualIndex = startIndex - 1; 
                    for (let k = 0; k < stringToDistribute.length; k++) {
                        const currentProcessingBoxIndex = startIndex + k;
                        if (currentProcessingBoxIndex < charInputBoxes.length) {
                            const charToPlace = stringToDistribute.charAt(k);
                            charInputBoxes[currentProcessingBoxIndex].value = charToPlace;
                            console.log(`    > "${charToPlace}" を ボックス ${currentProcessingBoxIndex} にセット`);
                            lastFilledBoxActualIndex = currentProcessingBoxIndex;
                        } else { console.log(`    > 残り文字 "${stringToDistribute.substring(k)}" セットするボックスなし`); break; }
                    }
                    const nextFocusCandidateIndex = lastFilledBoxActualIndex + 1;
                    if (nextFocusCandidateIndex < charInputBoxes.length) { console.log(`    > フォーカスを ${nextFocusCandidateIndex} へ`); charInputBoxes[nextFocusCandidateIndex].focus(); } 
                    else if (lastFilledBoxActualIndex >= 0 && lastFilledBoxActualIndex < charInputBoxes.length) { console.log(`    > フォーカスを最後にセットした ${lastFilledBoxActualIndex} へ`); charInputBoxes[lastFilledBoxActualIndex].focus(); }
                    Promise.resolve().then(() => { programmaticChange = false; });
                } else {
                    console.log(`    > e.dataから分配文字列なし。target.value: "${target.value}"`);
                    if (target.value.length === 1 && startIndex < charInputBoxes.length - 1) { console.log(`    > フォールバック: target.valueでフォーカス ${startIndex + 1} へ`); charInputBoxes[startIndex + 1].focus(); }
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
        // 必須要素チェックは関数冒頭で実施済みを期待するが、念のため主要なものだけ
        if (!questionTextElement || !answerLengthHintElement || !submitAnswerButton || !nextButton || !questionProgressDisplayElement) {
            console.error("SCRIPT_CRITICAL: displayQuestionに必要なUI要素が不足。"); displayErrorInQuiz("UI表示エラー。"); return;
        }

        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();
            console.log(`SCRIPT: 現在の正解: "${currentAnswer}" (長さ: ${currentAnswer.length})`);

            questionProgressDisplayElement.textContent = `${selectedQuestions.length}問中 ${currentQuestionIndex + 1}問目`; // 進捗表示
            answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            createCharInputBoxes(currentAnswer.length); 
            if (stoneImageElement) stoneImageElement.style.display = 'block'; 
            
            if(feedbackDisplayElement) feedbackDisplayElement.innerHTML = "";
            if(generalFeedbackElement) { generalFeedbackElement.textContent = ""; generalFeedbackElement.className = ""; }
            
            attemptsLeft = MAX_ATTEMPTS; // 各問題で試行回数をリセット
            if(attemptsLeftDisplayElement) attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
            
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
            if (attemptsLeft === MAX_ATTEMPTS) { // 1回目の試行 (3回残っていた)
                pointsAwarded = POINTS_ATTEMPT_1;
            } else if (attemptsLeft === MAX_ATTEMPTS - 1) { // 2回目の試行 (2回残っていた)
                pointsAwarded = POINTS_ATTEMPT_2;
            } else if (attemptsLeft === MAX_ATTEMPTS - 2) { // 3回目の試行 (1回残っていた)
                pointsAwarded = POINTS_ATTEMPT_3;
            }
            totalPoints += pointsAwarded;
            correctAnswersCount++; // 正解数をカウント
            generalFeedbackElement.textContent = `正解！ 🎉 ${pointsAwarded}ポイント獲得！`;
            generalFeedbackElement.className = "correct";
            feedbackSymbols = userInput.split('').map(() => '✅');
            finalizeAttempt(true); 
        } else {
            // 不正解の場合、試行回数を減らす
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

    function updateScoreDisplay() { // 現在の総得点を表示
        if (scoreElement) scoreElement.textContent = totalPoints;
    }
    
    function showResults() {
        if(quizContainerElement) quizContainerElement.style.display = 'none'; // クイズ画面を隠す
        if(resultAreaElement) resultAreaElement.style.display = 'block';   // 結果画面を表示
        
        if(finalScoreElement) finalScoreElement.textContent = correctAnswersCount; // 正解した問題数
        if(totalQuestionsInGameElement) totalQuestionsInGameElement.textContent = selectedQuestions.length; // 総問題数
        if(finalPointsElement) finalPointsElement.textContent = totalPoints; // 最終的な総ポイント
    }

    // --- イベントリスナー設定 ---
    // submitAnswerButtonなどの主要ボタンのリスナーは、checkCriticalElementsExistで要素存在確認後に設定される想定
    if (submitAnswerButton) { submitAnswerButton.addEventListener('click', handleSubmitAnswer); } 
    if (nextButton) { nextButton.addEventListener('click', () => { currentQuestionIndex++; displayQuestion(); }); }
    if (restartButton) { restartButton.addEventListener('click', () => {
        console.log("SCRIPT: リスタートボタンがクリックされました。");
        // スタート画面に戻すか、直接startGameを呼ぶか。ここでは直接startGame。
        resultAreaElement.style.display = 'none';
        quizContainerElement.style.display = 'flex';
        startGame(); 
    }); }
    
    // --- アプリ初期化実行 ---
    initializeApp(); // 最初にこれを呼び出す
});
