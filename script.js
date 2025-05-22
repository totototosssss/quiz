document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const questionTextElement = document.getElementById('question-text');
    const answerLengthHintElement = document.getElementById('answer-length-hint');
    const inputAreaElement = document.getElementById('input-area');
    const answerBoxesContainerElement = document.getElementById('answer-boxes-container');
    const stoneImageElement = document.getElementById('stone-image'); // HTMLにあれば使われます
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
    const totalQuestionsElement = document.getElementById('total-questions');
    const restartButton = document.getElementById('restart-button');
    const quizMainContentElement = document.getElementById('quiz-main-content');

    // Quiz State
    let allQuestions = [];
    let selectedQuestions = [];
    let currentQuestionIndex = 0;
    let currentAnswer = "";
    let score = 0;
    let attemptsLeft = 0;
    let charInputBoxes = [];
    const MAX_ATTEMPTS = 3;
    const NUM_QUESTIONS_TO_SHOW = 10;

    let isComposing = false; 
    let programmaticChange = false; 

    function checkAndLogElement(element, id) {
        if (!element) {
            console.error(`SCRIPT_CRITICAL_ERROR: HTML要素 '${id}' が見つかりません。`);
            return false;
        }
        return true;
    }
    
    // 必須要素の存在確認と基本的なUI要素のチェック
    let criticalUIInitializationFailed = false;
    const criticalElementsToVerify = {
        questionTextElement, answerBoxesContainerElement, feedbackDisplayElement,
        generalFeedbackElement, submitAnswerButton, nextButton, restartButton,
        resultAreaElement, quizMainContentElement
    };
    for (const key in criticalElementsToVerify) {
        if (!criticalElementsToVerify[key]) {
            // getElementByIdで再試行 (DOMContentLoaded直後のため、通常は不要だが念のため)
            const elementById = document.getElementById(key.replace(/Element$/, '').replace(/([A-Z])/g, '-$1').toLowerCase().replace('-element','')); // 例: questionTextElement -> question-text
             if(!elementById) {
                console.error(`SCRIPT_CRITICAL_ERROR: HTML要素(ID: ${key} 相当) が見つかりません。処理を中断します。`);
                criticalUIInitializationFailed = true;
                break;
             }
        }
    }

    if (criticalUIInitializationFailed) {
        if (questionTextElement) { // questionTextElement があればエラー表示
            questionTextElement.textContent = "ページの初期化に失敗。HTMLのID等を確認してください。";
            questionTextElement.style.color = '#e74c3c';
        } else {
            alert("致命的なエラー: クイズ表示に必要なHTML要素が不足しています。");
        }
        return; // スクリプトの主要処理を中断
    }


    async function loadQuestions() {
        console.log("SCRIPT: loadQuestions() が呼び出されました。");
        if (!questionTextElement) { alert("エラー表示用の要素がありません。"); return; }
        questionTextElement.textContent = "問題を読み込んでいます...";
        questionTextElement.style.color = '#34495e';

        try {
            const response = await fetch('train_questions.json');
            console.log(`SCRIPT: fetch('train_questions.json') のレスポンス - ステータス: ${response.status}, OK: ${response.ok}`);
            
            if (!response.ok) {
                const errorMsg = `問題ファイルの読み込みに失敗 (HTTP ${response.status})。ファイル名や場所を確認。`;
                console.error("SCRIPT: fetchエラー:", errorMsg);
                displayError(errorMsg);
                return; 
            }
            
            const textData = await response.text();
            console.log(`SCRIPT: 読み込まれたテキストデータの長さ: ${textData.length} 文字`);
            if (!textData.trim()) {
                const errorMsg = '問題ファイルが空か、内容が空白文字のみです。';
                console.error("SCRIPT: ファイル内容が空です。");
                displayError(errorMsg);
                return;
            }

            const lines = textData.trim().split('\n');
            console.log(`SCRIPT: ファイル内の行数: ${lines.length} 行`);
            
            let parsedLinesCount = 0;
            let validQuestionsCount = 0;

            allQuestions = lines.map((line, index) => {
                const lineNumber = index + 1;
                if (!line.trim()) return null; 
                try {
                    const q = JSON.parse(line);
                    parsedLinesCount++;
                    if (q && q.question && typeof q.question === 'string' && q.question.trim() !== "" &&
                        q.answer_entity && typeof q.answer_entity === 'string' && q.answer_entity.trim() !== "") {
                        validQuestionsCount++;
                        return q;
                    } else {
                        console.warn(`SCRIPT: ${lineNumber}行目: 必須項目エラー。 question: "${q.question}", answer_entity: "${q.answer_entity}"`);
                        return null;
                    }
                } catch (parseError) {
                    console.error(`SCRIPT: ${lineNumber}行目: JSON解析エラー - ${parseError.message}。 行: "${line}"`);
                    return null; 
                }
            }).filter(q => q !== null); 

            console.log(`SCRIPT: 解析試行行数: ${parsedLinesCount}, 有効問題数: ${validQuestionsCount}, 最終問題数: ${allQuestions.length}`);

            if (allQuestions.length === 0) {
                const errorMsg = '有効な問題データが読み込めませんでした。詳細はコンソール確認。';
                console.error("SCRIPT: 有効な問題が0件でした。");
                displayError(errorMsg);
                return;
            }
            
            console.log("SCRIPT: 最初の有効な問題:", allQuestions[0]); 
            startGame();

        } catch (error) { 
            console.error('SCRIPT: loadQuestions内で致命的エラー:', error);
            displayError(`問題読み込み中に予期せぬエラー: ${error.message}. コンソール確認。`);
        }
    }

    function displayError(message) {
        console.error("SCRIPT: displayError:", message);
        if (questionTextElement) {
            questionTextElement.textContent = message;
            questionTextElement.style.color = '#e74c3c';
        }
        const elementsToHideOnError = [
            quizMainContentElement, quizFooterElement, resultAreaElement,
            answerLengthHintElement, inputAreaElement, feedbackDisplayElement,
            generalFeedbackElement, attemptsLeftDisplayElement, actionButtonsElement,
            scoreAreaElement 
        ];
        elementsToHideOnError.forEach(el => { if (el) el.style.display = 'none'; });
    }

    function startGame() {
        console.log("SCRIPT: startGame() が呼び出されました。");
        if (!quizMainContentElement || !quizFooterElement || !resultAreaElement || !questionTextElement || !totalQuestionsElement) {
             console.error("SCRIPT_CRITICAL: startGameに必要なUI要素がありません。"); 
             displayError("UI部品不足でゲーム開始不可。");
             return;
        }

        quizMainContentElement.style.display = 'block';
        quizFooterElement.style.display = 'block';
        resultAreaElement.style.display = 'none';
        questionTextElement.style.color = '#34495e'; 
        score = 0;
        currentQuestionIndex = 0;
        updateScoreDisplay();

        let shuffled = shuffleArray([...allQuestions]);
        const numToShow = Math.min(NUM_QUESTIONS_TO_SHOW, shuffled.length);
        selectedQuestions = shuffled.slice(0, numToShow);
        
        console.log(`SCRIPT: 今回プレイする問題数: ${selectedQuestions.length}`);
        totalQuestionsElement.textContent = selectedQuestions.length;
        
        if(inputAreaElement) inputAreaElement.style.display = 'flex';
        if(answerLengthHintElement) answerLengthHintElement.style.display = 'block';
        if(feedbackDisplayElement) {
            feedbackDisplayElement.style.display = 'block';
            feedbackDisplayElement.innerHTML = ''; 
        }
        if(generalFeedbackElement) {
            generalFeedbackElement.style.display = 'block';
            generalFeedbackElement.textContent = ""; 
        }
        if(attemptsLeftDisplayElement) attemptsLeftDisplayElement.style.display = 'block';
        if(actionButtonsElement) actionButtonsElement.style.display = 'flex';
        if(submitAnswerButton) submitAnswerButton.style.display = 'inline-block';
        if(stoneImageElement) stoneImageElement.style.display = 'none'; // Hide stone initially

        if (selectedQuestions.length > 0) {
            displayQuestion();
        } else {
            console.error("SCRIPT: startGame() で selectedQuestions が0件です。");
            displayError('表示できるクイズ問題がありません。(startGame)');
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function createCharInputBoxes(answerLength) {
        if (!answerBoxesContainerElement) { 
            console.error("SCRIPT_ERROR: answerBoxesContainerElement is null in createCharInputBoxes."); 
            return; 
        }
        answerBoxesContainerElement.innerHTML = ''; 
        charInputBoxes = []; 

        for (let i = 0; i < answerLength; i++) {
            const inputBox = document.createElement('input');
            inputBox.type = 'text';
            inputBox.classList.add('char-box');
            inputBox.maxLength = 1; 
            inputBox.dataset.index = i;

            inputBox.addEventListener('compositionstart', () => {
                isComposing = true;
                console.log(`SCRIPT: inputBox ${i} - COMPOSITIONSTART`);
            });

            inputBox.addEventListener('compositionend', (e) => {
                isComposing = false;
                const target = e.target;
                const startIndex = parseInt(target.dataset.index);
                
                const eventDataString = e.data || ""; 
                const targetValueBeforeProcessing = target.value;
                
                // --- ここに一時的なデバッグアラートを追加 ---
                alert(`【デバッグ情報】IME変換完了 (ボックス ${startIndex})\n------------------------------\ne.data: "${eventDataString}" (文字数: ${eventDataString.length})\nボックスの元の値: "${targetValueBeforeProcessing}" (文字数: ${targetValueBeforeProcessing.length})\n------------------------------\nこの情報で文字の「引き継ぎ」を試みます。`);
                // --- デバッグアラートここまで ---

                console.log(`SCRIPT: inputBox ${startIndex} - COMPOSITIONEND FIRED.`);
                console.log(`    > e.data (IMEからの確定文字列): "${eventDataString}" (長さ: ${eventDataString.length})`);
                console.log(`    > target.value (compositionend発生時の要素の値): "${targetValueBeforeProcessing}" (長さ: ${targetValueBeforeProcessing.length})`);

                let stringToDistribute = eventDataString; // e.data を分配対象とする
                
                console.log(`    > 分配試行文字列 (stringToDistribute): "${stringToDistribute}"`);

                if (stringToDistribute && stringToDistribute.length > 0) {
                    programmaticChange = true; 
                    let lastFilledBoxActualIndex = startIndex - 1; 

                    for (let k = 0; k < stringToDistribute.length; k++) {
                        const currentProcessingBoxIndex = startIndex + k;
                        if (currentProcessingBoxIndex < charInputBoxes.length) {
                            const charToPlace = stringToDistribute.charAt(k);
                            charInputBoxes[currentProcessingBoxIndex].value = charToPlace;
                            console.log(`    > "${charToPlace}" を ボックス ${currentProcessingBoxIndex} にセットしました。`);
                            lastFilledBoxActualIndex = currentProcessingBoxIndex;
                        } else {
                            console.log(`    > 残りの文字 "${stringToDistribute.substring(k)}" をセットするボックスがありません。`);
                            break; 
                        }
                    }
                    
                    const nextFocusCandidateIndex = lastFilledBoxActualIndex + 1;
                    if (nextFocusCandidateIndex < charInputBoxes.length) {
                        console.log(`    > フォーカスをボックス ${nextFocusCandidateIndex} に移動します。`);
                        charInputBoxes[nextFocusCandidateIndex].focus();
                    } else if (lastFilledBoxActualIndex >= 0 && lastFilledBoxActualIndex < charInputBoxes.length) {
                        console.log(`    > 最後に文字をセットしたボックス ${lastFilledBoxActualIndex} にフォーカスを維持します。`);
                        charInputBoxes[lastFilledBoxActualIndex].focus();
                    }
                    
                    Promise.resolve().then(() => { programmaticChange = false; });
                } else {
                    console.log(`    > e.dataから分配する文字列がありませんでした。target.value: "${target.value}"`);
                    if (target.value.length === 1 && startIndex < charInputBoxes.length - 1) {
                         console.log(`    > フォールバック: target.valueに基づきフォーカスを ${startIndex + 1} へ移動`);
                         charInputBoxes[startIndex + 1].focus();
                    }
                }
            });

            inputBox.addEventListener('input', (e) => {
                const target = e.target;
                const currentIndex = parseInt(target.dataset.index);
                // console.log(`SCRIPT: inputBox ${currentIndex} - input event. isComposing: ${isComposing}, programmaticChange: ${programmaticChange}, Value: "${target.value}"`);

                if (isComposing || programmaticChange) {
                    return;
                }

                let value = target.value;
                if (value.length > 1) { 
                    target.value = value.charAt(0); 
                    value = target.value; 
                }
                if (value.length === 1 && currentIndex < charInputBoxes.length - 1) {
                    // console.log(`SCRIPT: inputBox ${currentIndex} (on input, direct) - focus moving to ${currentIndex + 1}`);
                    charInputBoxes[currentIndex + 1].focus();
                }
            });

            inputBox.addEventListener('keydown', (e) => {
                const currentIndex = parseInt(e.target.dataset.index);
                if (e.key === 'Backspace' && e.target.value === '' && !isComposing && currentIndex > 0) { e.preventDefault(); charInputBoxes[currentIndex - 1].focus(); } 
                else if (e.key === 'ArrowLeft' && !isComposing && currentIndex > 0) { e.preventDefault(); charInputBoxes[currentIndex - 1].focus(); } 
                else if (e.key === 'ArrowRight' && !isComposing && currentIndex < charInputBoxes.length - 1) { e.preventDefault(); charInputBoxes[currentIndex + 1].focus(); }
            });
            inputBox.addEventListener('focus', (e) => { e.target.select(); });
            answerBoxesContainerElement.appendChild(inputBox);
            charInputBoxes.push(inputBox);
        }
        if (charInputBoxes.length > 0) { charInputBoxes[0].focus(); }
    }

    function displayQuestion() {
        console.log(`SCRIPT: displayQuestion() - 問題 ${currentQuestionIndex + 1} / ${selectedQuestions.length}`);
        if (!questionTextElement || !answerLengthHintElement || !feedbackDisplayElement || !generalFeedbackElement || !attemptsLeftDisplayElement || !submitAnswerButton || !nextButton) {
            console.error("SCRIPT_CRITICAL: displayQuestionに必要なUI要素が不足。"); displayError("UI表示エラー。"); return;
        }
        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();
            console.log(`SCRIPT: 現在の正解: "${currentAnswer}" (長さ: ${currentAnswer.length})`);
            if(answerLengthHintElement) answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            createCharInputBoxes(currentAnswer.length); 
            if (stoneImageElement) stoneImageElement.style.display = 'block'; 
            if(feedbackDisplayElement) feedbackDisplayElement.innerHTML = "";
            if(generalFeedbackElement) { generalFeedbackElement.textContent = ""; generalFeedbackElement.className = ""; }
            attemptsLeft = MAX_ATTEMPTS;
            if(attemptsLeftDisplayElement) attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
            charInputBoxes.forEach(box => box.disabled = false);
            if(submitAnswerButton) { submitAnswerButton.disabled = false; submitAnswerButton.style.display = 'inline-block'; }
            if(nextButton) nextButton.style.display = 'none';
        } else {
            console.log("SCRIPT: 全問題終了。結果表示。"); showResults();
        }
    }
    
    function handleSubmitAnswer() {
        if (!submitAnswerButton || submitAnswerButton.disabled) return;
        if (!generalFeedbackElement || !feedbackDisplayElement || !attemptsLeftDisplayElement) { console.error("SCRIPT_CRITICAL: handleSubmitAnswerに必要なUI要素が不足。"); return;}
        let userInput = charInputBoxes.map(box => box.value).join('');
        console.log(`SCRIPT: ユーザー入力: "${userInput}", 正解: "${currentAnswer}"`);
        if (userInput.length !== currentAnswer.length) {
            if(generalFeedbackElement) { generalFeedbackElement.textContent = `答えは ${currentAnswer.length} 文字全て入力してください。`; generalFeedbackElement.className = "incorrect"; }
            const firstEmptyBox = charInputBoxes.find(box => box.value === '');
            if (firstEmptyBox) { firstEmptyBox.focus(); } else if (charInputBoxes.length > 0) { charInputBoxes[0].focus(); }
            return;
        }
        attemptsLeft--; let isCorrect = userInput === currentAnswer; let feedbackSymbols = [];
        if (isCorrect) {
            score++; if(generalFeedbackElement) { generalFeedbackElement.textContent = "正解！ 🎉"; generalFeedbackElement.className = "correct"; }
            feedbackSymbols = userInput.split('').map(() => '✅'); finalizeAttempt(true); 
        } else {
            const answerChars = currentAnswer.split(''), inputChars = userInput.split('');
            const tempFeedback = new Array(currentAnswer.length).fill(null); const answerCharCounts = {};
            for (const char of answerChars) { answerCharCounts[char] = (answerCharCounts[char] || 0) + 1; }
            for (let i = 0; i < currentAnswer.length; i++) { if (inputChars[i] === answerChars[i]) { tempFeedback[i] = '✅'; answerCharCounts[inputChars[i]]--; } }
            for (let i = 0; i < currentAnswer.length; i++) { if (tempFeedback[i] === null) { if (answerChars.includes(inputChars[i]) && answerCharCounts[inputChars[i]] > 0) { tempFeedback[i] = '☑️'; answerCharCounts[inputChars[i]]--; } else { tempFeedback[i] = '❌'; } } }
            feedbackSymbols = tempFeedback;
            if (attemptsLeft > 0) {
                if(generalFeedbackElement) { generalFeedbackElement.textContent = `不正解です。`; generalFeedbackElement.className = "incorrect"; }
                if (charInputBoxes.length > 0) charInputBoxes[0].focus(); charInputBoxes.forEach(box => box.select()); 
            } else {
                if(generalFeedbackElement) { generalFeedbackElement.textContent = `残念！正解は「${currentAnswer}」でした。`; generalFeedbackElement.className = "incorrect"; }
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
    function updateScoreDisplay() { if (scoreElement) scoreElement.textContent = score; }
    function showResults() {
        if(quizMainContentElement) quizMainContentElement.style.display = 'none';
        if(quizFooterElement) quizFooterElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block';
        if(finalScoreElement) finalScoreElement.textContent = score;
    }

    // Event Listeners
    if (submitAnswerButton) { submitAnswerButton.addEventListener('click', handleSubmitAnswer); } 
    if (nextButton) { nextButton.addEventListener('click', () => { currentQuestionIndex++; displayQuestion(); }); }
    if (restartButton) { restartButton.addEventListener('click', () => { console.log("SCRIPT: リスタートボタン"); startGame(); }); }
    
    loadQuestions();
});
