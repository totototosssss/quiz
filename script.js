document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startScreenElement = document.getElementById('start-screen');
    const startGameButton = document.getElementById('start-game-button');
    const startScreenErrorElement = document.getElementById('start-screen-error');
    const quizContainerElement = document.getElementById('quiz-container');

    const quizTitleElement = document.getElementById('quiz-title');
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
    const giveUpButton = document.getElementById('give-up-button');
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
    let allQuestions = [], selectedQuestions = [], currentQuestionIndex = 0, currentAnswer = "", totalPoints = 0, correctAnswersCount = 0, attemptsLeft = 0, charInputBoxes = [];
    const MAX_ATTEMPTS = 3, NUM_QUESTIONS_TO_PLAY = 10;
    let isComposing = false, programmaticChange = false; 
    const POINTS_ATTEMPT_1 = 10, POINTS_ATTEMPT_2 = 5, POINTS_ATTEMPT_3 = 3;
    const NEW_QUIZ_TITLE = "クイズwith研一";

    function verifyElements() {
        console.log("SCRIPT: HTML要素の存在確認を開始します。");
        const elementIds = [
            'start-screen', 'start-game-button', 'start-screen-error', 'quiz-container',
            'quiz-title', 'question-progress-display', 'question-text', 'answer-length-hint',
            'input-area', 'answer-boxes-container', /* 'stone-image', // オプション扱い */
            'feedback-display', 'general-feedback', 'attempts-left-display', 'action-buttons',
            'submit-answer-button', 'give-up-button', 'next-button', 'score-area', 'score',
            'quiz-footer', 'result-area', 'final-score', 'total-questions-in-game',
            'final-points', 'restart-button', 'quiz-main-content'
        ];
        let allFound = true;
        elementIds.forEach(id => {
            if (!document.getElementById(id)) {
                console.error(`SCRIPT_CRITICAL_ERROR: HTML要素 (ID: ${id}) がDOMに見つかりません。`);
                allFound = false;
            }
        });

        if (!allFound) {
            console.error("SCRIPT_CRITICAL_ERROR: ページ初期化に必要なHTML要素が1つ以上不足しています。上記のログで具体的な要素IDを確認し、index.htmlファイルに正しいIDを持つ要素が存在するか確認してください。");
            const userAlertMessage = "クイズの初期化に失敗しました。\n必要なHTMLの部品が見つからないようです。\nお手数ですが、ブラウザのデベロッパーコンソールを開き、「SCRIPT_CRITICAL_ERROR」から始まるエラーメッセージを確認し、HTMLファイルに必要なIDを持つ要素が存在するかご確認ください。";
            if (startScreenErrorElement) { // startScreenErrorElement はこのチェックリストに入っているので、ここに来る前にnullチェックが必要
                const errEl = document.getElementById('start-screen-error'); // 直接再取得
                if (errEl) {
                    errEl.textContent = "ページエラー。HTMLの部品が不足しています。コンソールを確認してください。";
                    errEl.style.display = 'block';
                } else { alert(userAlertMessage); }
            } else { alert(userAlertMessage); }
            if (startGameButton) startGameButton.disabled = true;
        }
        return allFound;
    }

    if (!verifyElements()) {
        return; // 必須要素がなければ処理を中断
    }
    
    document.title = NEW_QUIZ_TITLE;
    const h1InStartScreen = startScreenElement.querySelector('h1');
    if (h1InStartScreen) h1InStartScreen.textContent = NEW_QUIZ_TITLE;
    if (quizTitleElement) quizTitleElement.textContent = NEW_QUIZ_TITLE;


    function displayStartScreenError(message) {
        console.warn("SCRIPT: displayStartScreenError - ", message);
        if (startScreenErrorElement) { startScreenErrorElement.textContent = message; startScreenErrorElement.style.display = 'block';} 
        else { console.error("SCRIPT_ERROR: スタート画面のエラー表示要素 startScreenErrorElement が見つかりません。"); alert(message); }
        if (startGameButton) { startGameButton.disabled = true; console.log("SCRIPT: エラー発生のため、スタートボタンを無効化しました。");}
    }
    
    async function initializeApp() {
        console.log("SCRIPT: initializeApp() が呼び出されました。"); 
        await loadQuestions(); 
        
        if (startGameButton) {
            if (allQuestions.length > 0) {
                startGameButton.disabled = false; 
                startGameButton.addEventListener('click', handleStartGameClick);
                console.log("SCRIPT: スタートボタンにイベントリスナーを設定しました。(問題あり)");
            } else {
                startGameButton.disabled = true; 
                console.warn("SCRIPT: 問題が0件、または読み込み失敗のため、スタートボタンは無効のままです。");
            }
        } else {
             console.error("SCRIPT_CRITICAL_ERROR: initializeApp - スタートボタン(startGameButton)がnullです。verifyElementsで捕捉されるべきエラーです。");
        }
    }

    function handleStartGameClick() {
        console.log("SCRIPT: スタートボタンがクリックされました。");
        if (allQuestions.length === 0) { alert("問題データが読み込まれていないか、0件です。クイズを開始できません。"); console.warn("SCRIPT: allQuestionsが空の状態でスタートしようとしました。"); return; }
        if(startScreenErrorElement) startScreenErrorElement.style.display = 'none'; 
        if(startScreenElement) startScreenElement.style.display = 'none'; 
        if(quizContainerElement) quizContainerElement.style.display = 'flex'; 
        if(resultAreaElement) resultAreaElement.style.display = 'none'; 
        startGame(); 
    }

    async function loadQuestions() {
        console.log("SCRIPT: loadQuestions() が呼び出されました。");
        allQuestions = []; 
        try {
            const response = await fetch('train_questions.json'); 
            console.log(`SCRIPT: fetchレスポンス - ステータス: ${response.status}, OK: ${response.ok}`);
            if (!response.ok) { const errorMsg = `問題ファイルの読み込みに失敗 (HTTP ${response.status})。ファイル名やパスを確認してください。`; console.error("SCRIPT: fetchエラー:", errorMsg); displayStartScreenError(errorMsg + " クイズを開始できません。"); return; }
            const textData = await response.text(); 
            console.log(`SCRIPT: 読み込まれたテキストデータの長さ: ${textData.length} 文字`);
            if (!textData.trim()) { const errorMsg = '問題ファイルが空か、内容が空白文字のみです。'; console.error("SCRIPT: ファイル内容が空です。"); displayStartScreenError(errorMsg + " クイズを開始できません。"); return; }
            const lines = textData.trim().split('\n'); 
            let parsedLinesCount = 0, validQuestionsCount = 0;
            const tempQuestions = lines.map((line, index) => {
                const lineNumber = index + 1; if (!line.trim()) return null; 
                try {
                    const q = JSON.parse(line); parsedLinesCount++;
                    if (q && q.question && typeof q.question === 'string' && q.question.trim() !== "" && q.answer_entity && typeof q.answer_entity === 'string' && q.answer_entity.trim() !== "") {
                        validQuestionsCount++; return q;
                    } else { console.warn(`SCRIPT: ${lineNumber}行目: 必須項目エラー。 question: "${q.question}", answer_entity: "${q.answer_entity}"`); return null; }
                } catch (parseError) { console.error(`SCRIPT: ${lineNumber}行目: JSON解析エラー - ${parseError.message}。 行: "${line}"`); return null; }
            }).filter(q => q !== null); 
            allQuestions = tempQuestions; 
            console.log(`SCRIPT: 解析試行行数: ${parsedLinesCount}, 有効問題数: ${validQuestionsCount}, 最終問題数 (allQuestions.length): ${allQuestions.length}`);
            if (allQuestions.length === 0) { const errorMsg = '有効な問題データが読み込めませんでした。ファイル内容を確認してください。'; console.error("SCRIPT: 有効な問題が0件でした。"); displayStartScreenError(errorMsg + " クイズを開始できません。"); } 
            else { console.log("SCRIPT: 問題データの読み込み完了。"); if(startScreenErrorElement) startScreenErrorElement.style.display = 'none';}
        } catch (error) { console.error('SCRIPT: loadQuestions内で致命的エラー:', error); displayStartScreenError(`問題読み込み中に予期せぬエラー: ${error.message} クイズを開始できません。`);}
    }

    function displayErrorInQuiz(message) { 
        console.error("SCRIPT: displayErrorInQuiz:", message); 
        if (questionTextElement) { questionTextElement.textContent = message; questionTextElement.style.color = '#e74c3c';}
        const elementsToHideOnError = [ quizMainContentElement, quizFooterElement, resultAreaElement, answerLengthHintElement, inputAreaElement, feedbackDisplayElement, generalFeedbackElement, attemptsLeftDisplayElement, actionButtonsElement, scoreAreaElement ];
        elementsToHideOnError.forEach(el => { if (el) el.style.display = 'none'; });
    }

    function startGame() {
        console.log("SCRIPT: startGame() が呼び出されました。");
        if (!quizMainContentElement || !quizFooterElement || !resultAreaElement || !questionTextElement || !totalQuestionsInGameElement || !questionProgressDisplayElement) {
             console.error("SCRIPT_CRITICAL: startGameに必要なUI要素がありません。"); displayErrorInQuiz("UI部品不足でゲーム開始不可。"); return;
        }
        quizMainContentElement.style.display = 'block'; quizFooterElement.style.display = 'block'; 
        if(resultAreaElement) resultAreaElement.style.display = 'none';
        if (questionTextElement) questionTextElement.style.color = '#34495e'; 
        totalPoints = 0; correctAnswersCount = 0; currentQuestionIndex = 0; updateScoreDisplay(); 
        let shuffled = shuffleArray([...allQuestions]); const numToShowThisGame = Math.min(NUM_QUESTIONS_TO_PLAY, shuffled.length);
        if (numToShowThisGame === 0) { console.error("SCRIPT: startGame - numToShowThisGame is 0."); displayErrorInQuiz("プレイできる問題がありません。"); return; }
        selectedQuestions = shuffled.slice(0, numToShowThisGame); console.log(`SCRIPT: 今回プレイする問題数: ${selectedQuestions.length}`);
        if (totalQuestionsElement) totalQuestionsElement.textContent = selectedQuestions.length; // ここで総問題数を設定

        if(inputAreaElement) inputAreaElement.style.display = 'flex'; if(answerLengthHintElement) answerLengthHintElement.style.display = 'block';
        if(feedbackDisplayElement) { feedbackDisplayElement.style.display = 'block'; feedbackDisplayElement.innerHTML = ''; }
        if(generalFeedbackElement) { generalFeedbackElement.style.display = 'block'; generalFeedbackElement.textContent = ""; }
        if(attemptsLeftDisplayElement) attemptsLeftDisplayElement.style.display = 'block';
        if(actionButtonsElement) actionButtonsElement.style.display = 'flex';
        if(submitAnswerButton) submitAnswerButton.style.display = 'inline-block';
        if(giveUpButton) giveUpButton.style.display = 'inline-block'; 
        if(stoneImageElement && stoneImageElement.src && !stoneImageElement.src.endsWith('#')) { // srcが設定されていれば表示
             stoneImageElement.style.display = 'block'; 
        } else if (stoneImageElement) {
            stoneImageElement.style.display = 'none';
        }
        displayQuestion();
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array;
    }

    function createCharInputBoxes(answerLength) {
        if (!answerBoxesContainerElement) { console.error("SCRIPT_ERROR: answerBoxesContainerElement is null."); return; }
        answerBoxesContainerElement.innerHTML = ''; charInputBoxes = []; 
        for (let i = 0; i < answerLength; i++) {
            const inputBox = document.createElement('input');
            inputBox.type = 'text'; inputBox.classList.add('char-box'); inputBox.maxLength = 1; inputBox.dataset.index = i;
            inputBox.addEventListener('compositionstart', () => { isComposing = true; });
            inputBox.addEventListener('compositionend', (e) => {
                isComposing = false; const target = e.target; const startIndex = parseInt(target.dataset.index);
                const eventDataString = e.data || ""; 
                console.log(`SCRIPT: inputBox ${startIndex} - COMPOSITIONEND. e.data: "${eventDataString}", target.value: "${target.value}"`);
                let stringToDistribute = eventDataString;
                if (stringToDistribute && stringToDistribute.length > 0) {
                    programmaticChange = true; let lastFilledBoxActualIndex = startIndex - 1; 
                    for (let k = 0; k < stringToDistribute.length; k++) {
                        const currentProcessingBoxIndex = startIndex + k;
                        if (currentProcessingBoxIndex < charInputBoxes.length) {
                            const charToPlace = stringToDistribute.charAt(k); charInputBoxes[currentProcessingBoxIndex].value = charToPlace;
                            lastFilledBoxActualIndex = currentProcessingBoxIndex;
                        } else { break; }
                    }
                    const nextFocusCandidateIndex = lastFilledBoxActualIndex + 1;
                    if (nextFocusCandidateIndex < charInputBoxes.length) { charInputBoxes[nextFocusCandidateIndex].focus(); } 
                    else if (lastFilledBoxActualIndex >= 0 && lastFilledBoxActualIndex < charInputBoxes.length) { charInputBoxes[lastFilledBoxActualIndex].focus(); }
                    Promise.resolve().then(() => { programmaticChange = false; });
                } else { if (target.value.length === 1 && startIndex < charInputBoxes.length - 1) { charInputBoxes[startIndex + 1].focus(); } }
            });
            inputBox.addEventListener('input', (e) => {
                const target = e.target; const currentIndex = parseInt(target.dataset.index); if (isComposing || programmaticChange) return;
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
        if (!questionTextElement || !answerLengthHintElement || !submitAnswerButton || !nextButton || !questionProgressDisplayElement || !attemptsLeftDisplayElement || !giveUpButton) {
            console.error("SCRIPT_CRITICAL: displayQuestionに必要なUI要素が不足。"); displayErrorInQuiz("UI表示エラー。"); return;
        }
        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();
            console.log(`SCRIPT: 現在の正解: "${currentAnswer}" (長さ: ${currentAnswer.length})`);
            if(questionProgressDisplayElement) questionProgressDisplayElement.textContent = `${selectedQuestions.length}問中 ${currentQuestionIndex + 1}問目`;
            if(answerLengthHintElement) answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            createCharInputBoxes(currentAnswer.length); 
            if (stoneImageElement && stoneImageElement.src && (stoneImageElement.src.includes('stone.png'))) { // Check if src is set and valid
                stoneImageElement.style.display = 'block'; 
            } else if (stoneImageElement) {
                stoneImageElement.style.display = 'none';
            }
            if(feedbackDisplayElement) feedbackDisplayElement.innerHTML = "";
            if(generalFeedbackElement) { generalFeedbackElement.textContent = ""; generalFeedbackElement.className = ""; }
            attemptsLeft = MAX_ATTEMPTS; 
            if(attemptsLeftDisplayElement) attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
            charInputBoxes.forEach(box => box.disabled = false);
            if(submitAnswerButton) {submitAnswerButton.disabled = false; submitAnswerButton.style.display = 'inline-block';}
            if(giveUpButton) {giveUpButton.disabled = false; giveUpButton.style.display = 'inline-block';}
            if(nextButton) nextButton.style.display = 'none';
        } else {
            console.log("SCRIPT: 全問題終了。結果表示。"); showResults();
        }
    }
    
    function handleSubmitAnswer() {
        if (!submitAnswerButton || submitAnswerButton.disabled) { console.log("SCRIPT: submit button not available or disabled"); return; }
        if (!generalFeedbackElement || !feedbackDisplayElement || !attemptsLeftDisplayElement) { console.error("SCRIPT_CRITICAL: handleSubmitAnswerに必要なUI要素が不足。"); return;}

        let userInput = charInputBoxes.map(box => box.value).join('');
        console.log(`SCRIPT: handleSubmitAnswer - Raw userInput: "${userInput}" (Length: ${userInput.length})`);

        if (userInput.trim() === "") {
            console.log("SCRIPT: handleSubmitAnswer - Input is empty. Blocking.");
            if(generalFeedbackElement) {generalFeedbackElement.textContent = "何か文字を入力してください。"; generalFeedbackElement.className = "incorrect";}
            if (charInputBoxes.length > 0) {charInputBoxes[0].focus();}
            return;
        }
        console.log("SCRIPT: handleSubmitAnswer - Input not empty. Evaluating.");

        let isCorrect = (userInput === currentAnswer); 
        let feedbackSymbols = [];

        if (isCorrect) {
            let pointsAwarded = 0;
            if (attemptsLeft === MAX_ATTEMPTS) { pointsAwarded = POINTS_ATTEMPT_1; }
            else if (attemptsLeft === MAX_ATTEMPTS - 1) { pointsAwarded = POINTS_ATTEMPT_2; }
            else if (attemptsLeft === MAX_ATTEMPTS - 2) { pointsAwarded = POINTS_ATTEMPT_3; }
            // else: 0 points if attemptsLeft was already < MAX_ATTEMPTS - 2 (e.g. 0)

            totalPoints += pointsAwarded; correctAnswersCount++; 
            if(generalFeedbackElement) {generalFeedbackElement.textContent = `正解！ 🎉 ${pointsAwarded}ポイント獲得！`; generalFeedbackElement.className = "correct";}
            feedbackSymbols = currentAnswer.split('').map(() => '✅');
            finalizeAttempt(true); 
        } else { // Incorrect answer
            attemptsLeft--; 
            const answerChars = currentAnswer.split('');
            const inputChars = userInput.split('');
            feedbackSymbols = new Array(answerChars.length).fill('➖'); 
            const answerCharCounts = {};
            for (const char of answerChars) { answerCharCounts[char] = (answerCharCounts[char] || 0) + 1; }
            
            for (let i = 0; i < answerChars.length; i++) { 
                if (i < inputChars.length && inputChars[i] === answerChars[i]) { 
                    feedbackSymbols[i] = '✅'; 
                    if (answerCharCounts[inputChars[i]] > 0) { 
                        answerCharCounts[inputChars[i]]--;
                    }
                }
            }
            for (let i = 0; i < answerChars.length; i++) { 
                if (feedbackSymbols[i] === '➖' && i < inputChars.length) { 
                    if (answerChars.includes(inputChars[i]) && answerCharCounts[inputChars[i]] > 0) { 
                        feedbackSymbols[i] = '☑️'; 
                        answerCharCounts[inputChars[i]]--; 
                    } else { 
                        feedbackSymbols[i] = '❌'; 
                    }
                } else if (feedbackSymbols[i] === '➖' && i >= inputChars.length) { 
                    feedbackSymbols[i] = '❌'; 
                }
            } // End of feedback symbols generation loops

            if (attemptsLeft > 0) {
                if(generalFeedbackElement) {generalFeedbackElement.textContent = `不正解です。`; generalFeedbackElement.className = "incorrect";}
                if (charInputBoxes.length > 0) {charInputBoxes[0].focus();}
            } else { // No attempts left
                if(generalFeedbackElement) {generalFeedbackElement.textContent = `残念！正解は「${currentAnswer}」でした。`; generalFeedbackElement.className = "incorrect";}
                finalizeAttempt(false); 
            }
        } // End of if(isCorrect) else block
        
        if(feedbackDisplayElement) {feedbackDisplayElement.innerHTML = feedbackSymbols.join(' ');}
        if(attemptsLeftDisplayElement) {attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;}
        updateScoreDisplay();
    } // End of handleSubmitAnswer

    function handleGiveUp() {
        console.log("SCRIPT: 諦めるボタンがクリックされました。");
        if (giveUpButton) giveUpButton.disabled = true;
        if (submitAnswerButton) submitAnswerButton.disabled = true;

        attemptsLeft = 0; 
        if (attemptsLeftDisplayElement) attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
        if (generalFeedbackElement) { generalFeedbackElement.textContent = `正解は「${currentAnswer}」でした。`; generalFeedbackElement.className = "info"; }
        if (feedbackDisplayElement) { feedbackDisplayElement.innerHTML = currentAnswer.split('').map(char => `<span style="color: #27ae60;">${char}</span>`).join(' ');}
        charInputBoxes.forEach((box, idx) => {
            if (idx < currentAnswer.length) { box.value = currentAnswer[idx]; box.style.borderColor = '#7f8c8d'; box.style.color = '#7f8c8d';}
        });
        finalizeAttempt(false); 
    }

    function finalizeAttempt(wasCorrect) {
        charInputBoxes.forEach(box => box.disabled = true);
        if (submitAnswerButton) submitAnswerButton.disabled = true;
        if (giveUpButton) giveUpButton.disabled = true; 
        if (nextButton) nextButton.style.display = 'inline-block';
    }
    function updateScoreDisplay() { if (scoreElement) scoreElement.textContent = totalPoints; }
    function showResults() {
        if(quizContainerElement) quizContainerElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block';   
        if(finalScoreElement) finalScoreElement.textContent = correctAnswersCount; 
        if(totalQuestionsInGameElement) totalQuestionsInGameElement.textContent = selectedQuestions.length; 
        if(finalPointsElement) finalPointsElement.textContent = totalPoints; 
    }

    // Event Listeners
    // startGameButton listener is set in initializeApp after loadQuestions
    
    if (submitAnswerButton) { submitAnswerButton.addEventListener('click', handleSubmitAnswer); console.log("SCRIPT: '解答する' ボタンにリスナー設定。"); } 
    else { console.error("SCRIPT_ERROR: submitAnswerButton がnullのためリスナー未設定。"); }
    
    if (giveUpButton) { giveUpButton.addEventListener('click', handleGiveUp); console.log("SCRIPT: '諦める' ボタンにリスナー設定。"); } 
    else { console.error("SCRIPT_ERROR: giveUpButton がnullのためリスナー未設定。"); }
    
    if (nextButton) { nextButton.addEventListener('click', () => { currentQuestionIndex++; displayQuestion(); }); console.log("SCRIPT: '次の問題へ' ボタンにリスナー設定。"); } 
    else { console.error("SCRIPT_ERROR: nextButton がnullのためリスナー未設定。"); }
    
    if (restartButton) { 
        restartButton.addEventListener('click', () => {
            console.log("SCRIPT: リスタートボタンクリック。");
            if (resultAreaElement) resultAreaElement.style.display = 'none';
            if (startScreenElement) startScreenElement.style.display = 'block';
            if (startGameButton) { // startGameButtonは存在するはず
                 // loadQuestionsが成功していればallQuestions > 0のはず
                startGameButton.disabled = !(allQuestions.length > 0);
            }
        });
        console.log("SCRIPT: 'もう一度挑戦' ボタンにリスナー設定。");
    } else { console.error("SCRIPT_ERROR: restartButton がnullのためリスナー未設定。"); }
    
    initializeApp(); 
});
