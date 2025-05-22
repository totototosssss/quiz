document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - まず全て取得試行
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

    // Nullチェック関数 (デバッグ用)
    function checkElementsExist() {
        const elements = {
            questionTextElement, answerLengthHintElement, inputAreaElement, answerBoxesContainerElement,
            stoneImageElement, feedbackDisplayElement, generalFeedbackElement, attemptsLeftDisplayElement,
            actionButtonsElement, submitAnswerButton, nextButton, scoreAreaElement, scoreElement,
            quizFooterElement, resultAreaElement, finalScoreElement, totalQuestionsElement,
            restartButton, quizMainContentElement
        };
        let allFound = true;
        for (const key in elements) {
            if (!elements[key]) {
                console.error(`SCRIPT_CRITICAL: HTML要素が見つかりません - ${key} (IDが正しいか、HTML内に存在するか確認してください)`);
                allFound = false;
            }
        }
        return allFound;
    }

    if (!checkElementsExist()) {
        // 重要な要素が見つからない場合、エラーメッセージを表示して処理を中断
        if (questionTextElement) { // questionTextElement自体は存在すると仮定してエラー表示
            questionTextElement.textContent = "ページの初期化に失敗しました。HTMLのIDを確認してください。詳細はコンソール参照。";
            questionTextElement.style.color = '#e74c3c';
        }
        // 他のUI要素も非表示にする
        if(quizMainContentElement) quizMainContentElement.style.display = 'none';
        if(quizFooterElement) quizFooterElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'none';
        return; // ここで処理を中断
    }


    async function loadQuestions() {
        console.log("SCRIPT: loadQuestions() が呼び出されました。");
        questionTextElement.textContent = "問題を読み込んでいます...";
        questionTextElement.style.color = '#34495e';

        try {
            const response = await fetch('train_questions.json');
            console.log(`SCRIPT: fetch('train_questions.json') のレスポンス - ステータス: ${response.status}, OK: ${response.ok}`);
            
            if (!response.ok) {
                const errorMsg = `問題ファイルの読み込みに失敗 (HTTP ${response.status})。ファイル名や場所を確認してください。`;
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
                    console.error(`SCRIPT: ${lineNumber}行目: JSON解析エラー - ${parseError.message}。 問題のある行: "${line}"`);
                    return null; 
                }
            }).filter(q => q !== null); 

            console.log(`SCRIPT: 解析試行行数: ${parsedLinesCount}, 有効問題数: ${validQuestionsCount}, 最終問題数: ${allQuestions.length}`);

            if (allQuestions.length === 0) {
                const errorMsg = '有効な問題データが読み込めませんでした。詳細はコンソールを確認。';
                console.error("SCRIPT: 処理の結果、有効な問題が0件でした。");
                displayError(errorMsg);
                return;
            }
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

        if(quizMainContentElement) quizMainContentElement.style.display = 'none';
        if(quizFooterElement) quizFooterElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'none';
    }

    function startGame() {
        console.log("SCRIPT: startGame() が呼び出されました。");
        if (!quizMainContentElement || !quizFooterElement || !resultAreaElement || !questionTextElement) {
             console.error("SCRIPT_CRITICAL: startGameに必要な基本UI要素がありません。"); return;
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
        if (totalQuestionsElement) totalQuestionsElement.textContent = selectedQuestions.length;
        
        if (inputAreaElement) inputAreaElement.style.display = 'flex';
        if (answerLengthHintElement) answerLengthHintElement.style.display = 'block';
        if (feedbackDisplayElement) {
            feedbackDisplayElement.style.display = 'block';
            feedbackDisplayElement.innerHTML = '';
        }
        if (generalFeedbackElement) {
            generalFeedbackElement.style.display = 'block';
            generalFeedbackElement.textContent = ""; 
        }
        if (attemptsLeftDisplayElement) attemptsLeftDisplayElement.style.display = 'block';
        if (actionButtonsElement) actionButtonsElement.style.display = 'flex';
        if (submitAnswerButton) submitAnswerButton.style.display = 'inline-block';
        if (stoneImageElement) stoneImageElement.style.display = 'none';

        if (selectedQuestions.length > 0) {
            displayQuestion();
        } else {
            console.error("SCRIPT: startGame() で selectedQuestions が0件です。");
            displayError('表示できるクイズ問題がありません。(startGame)');
        }
    }

    function shuffleArray(array) { /* ... (内容は変更なし) ... */ 
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function createCharInputBoxes(answerLength) { /* ... (内容は変更なし) ... */
        if (!answerBoxesContainerElement) { console.error("SCRIPT_ERROR: answerBoxesContainerElement is null in createCharInputBoxes"); return; }
        answerBoxesContainerElement.innerHTML = ''; 
        charInputBoxes = []; 

        for (let i = 0; i < answerLength; i++) {
            const inputBox = document.createElement('input');
            inputBox.type = 'text';
            inputBox.classList.add('char-box');
            inputBox.maxLength = 1;
            inputBox.dataset.index = i;

            inputBox.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && i < charInputBoxes.length - 1) {
                    charInputBoxes[i + 1].focus();
                }
            });

            inputBox.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && i > 0) {
                    e.preventDefault();
                    charInputBoxes[i - 1].focus();
                } else if (e.key === 'ArrowLeft' && i > 0) {
                    e.preventDefault();
                    charInputBoxes[i - 1].focus();
                } else if (e.key === 'ArrowRight' && i < charInputBoxes.length - 1) {
                    e.preventDefault();
                    charInputBoxes[i + 1].focus();
                }
            });

            inputBox.addEventListener('focus', (e) => {
                e.target.select(); 
            });

            answerBoxesContainerElement.appendChild(inputBox);
            charInputBoxes.push(inputBox);
        }

        if (charInputBoxes.length > 0) {
            charInputBoxes[0].focus(); 
        }
    }

    function displayQuestion() { /* ... (内容は変更なし、ただしstoneImageElementのチェック追加) ... */
        console.log(`SCRIPT: displayQuestion() - 問題 ${currentQuestionIndex + 1} / ${selectedQuestions.length}`);
        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            if (questionTextElement) questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();
            console.log(`SCRIPT: 現在の正解: "${currentAnswer}" (長さ: ${currentAnswer.length})`);

            if (answerLengthHintElement) answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            createCharInputBoxes(currentAnswer.length); 
            if (stoneImageElement) stoneImageElement.style.display = 'block'; 
            
            if (feedbackDisplayElement) feedbackDisplayElement.innerHTML = "";
            if (generalFeedbackElement) {
                generalFeedbackElement.textContent = "";
                generalFeedbackElement.className = ""; 
            }

            attemptsLeft = MAX_ATTEMPTS;
            if (attemptsLeftDisplayElement) attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
            
            charInputBoxes.forEach(box => box.disabled = false);
            if (submitAnswerButton) {
                submitAnswerButton.disabled = false;
                submitAnswerButton.style.display = 'inline-block';
            }
            if (nextButton) nextButton.style.display = 'none';
        } else {
            console.log("SCRIPT: 全問題終了。結果表示。");
            showResults();
        }
    }
    
    function handleSubmitAnswer() { /* ... (内容は変更なし) ... */
        if (!submitAnswerButton || submitAnswerButton.disabled) return;

        let userInput = charInputBoxes.map(box => box.value).join('');
        console.log(`SCRIPT: ユーザー入力: "${userInput}", 正解: "${currentAnswer}"`);

        if (userInput.length !== currentAnswer.length) {
            if(generalFeedbackElement) {
                generalFeedbackElement.textContent = `答えは ${currentAnswer.length} 文字全て入力してください。`;
                generalFeedbackElement.className = "incorrect";
            }
            const firstEmptyBox = charInputBoxes.find(box => box.value === '');
            if (firstEmptyBox) {
                firstEmptyBox.focus();
            } else if (charInputBoxes.length > 0) {
                charInputBoxes[0].focus();
            }
            return;
        }

        attemptsLeft--;
        let isCorrect = userInput === currentAnswer;
        let feedbackSymbols = [];

        if (isCorrect) {
            score++;
            if(generalFeedbackElement) {
                generalFeedbackElement.textContent = "正解！ 🎉";
                generalFeedbackElement.className = "correct";
            }
            feedbackSymbols = userInput.split('').map(() => '✅');
            finalizeAttempt(true); 
        } else {
            const answerChars = currentAnswer.split('');
            const inputChars = userInput.split('');
            const tempFeedback = new Array(currentAnswer.length).fill(null);
            const answerCharCounts = {};

            for (const char of answerChars) {
                answerCharCounts[char] = (answerCharCounts[char] || 0) + 1;
            }
            for (let i = 0; i < currentAnswer.length; i++) {
                if (inputChars[i] === answerChars[i]) {
                    tempFeedback[i] = '✅';
                    answerCharCounts[inputChars[i]]--;
                }
            }
            for (let i = 0; i < currentAnswer.length; i++) {
                if (tempFeedback[i] === null) {
                    if (answerChars.includes(inputChars[i]) && answerCharCounts[inputChars[i]] > 0) {
                        tempFeedback[i] = '☑️';
                        answerCharCounts[inputChars[i]]--;
                    } else {
                        tempFeedback[i] = '❌';
                    }
                }
            }
            feedbackSymbols = tempFeedback;

            if (attemptsLeft > 0) {
                if(generalFeedbackElement) {
                    generalFeedbackElement.textContent = `不正解です。`;
                    generalFeedbackElement.className = "incorrect";
                }
                if (charInputBoxes.length > 0) charInputBoxes[0].focus(); 
                charInputBoxes.forEach(box => box.select());
            } else {
                if(generalFeedbackElement) {
                    generalFeedbackElement.textContent = `残念！正解は「${currentAnswer}」でした。`;
                    generalFeedbackElement.className = "incorrect";
                }
                finalizeAttempt(false); 
            }
        }
        
        if (feedbackDisplayElement) feedbackDisplayElement.innerHTML = feedbackSymbols.join(' ');
        if (attemptsLeftDisplayElement) attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
        updateScoreDisplay();
    }

    function finalizeAttempt(wasCorrect) { /* ... (内容は変更なし) ... */
        charInputBoxes.forEach(box => box.disabled = true);
        if (submitAnswerButton) submitAnswerButton.disabled = true;
        if (nextButton) nextButton.style.display = 'inline-block';
    }

    function updateScoreDisplay() { /* ... (内容は変更なし) ... */
        if (scoreElement) scoreElement.textContent = score;
    }
    
    function showResults() { /* ... (内容は変更なし) ... */
        if(quizMainContentElement) quizMainContentElement.style.display = 'none';
        if(quizFooterElement) quizFooterElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block';
        if(finalScoreElement) finalScoreElement.textContent = score;
    }

    // --- イベントリスナー設定 ---
    // submitAnswerButton の null チェックは checkElementsExist で実施済み
    if (submitAnswerButton) {
        submitAnswerButton.addEventListener('click', handleSubmitAnswer);
    } // else のエラー出力は checkElementsExist で行う

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            currentQuestionIndex++;
            displayQuestion();
        });
    }

    if (restartButton) {
        restartButton.addEventListener('click', () => {
            console.log("SCRIPT: リスタートボタンがクリックされました。");
            startGame();
        });
    }
    
    // --- 初期読み込み実行 ---
    loadQuestions(); // loadQuestions の前に checkElementsExist が実行される
});
