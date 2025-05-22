document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const questionTextElement = document.getElementById('question-text');
    const answerLengthHintElement = document.getElementById('answer-length-hint');
    const inputAreaElement = document.getElementById('input-area');
    const answerBoxesContainerElement = document.getElementById('answer-boxes-container'); // New
    const stoneImageElement = document.getElementById('stone-image'); // New

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
    let charInputBoxes = []; // To store references to the input boxes
    const MAX_ATTEMPTS = 3;
    const NUM_QUESTIONS_TO_SHOW = 10;

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
            
            // console.log("SCRIPT: 最初の有効な問題オブジェクト:", allQuestions[0]);
            startGame();

        } catch (error) { 
            console.error('SCRIPT: loadQuestions内で致命的エラー:', error);
            displayError(`問題読み込み中に予期せぬエラー: ${error.message}. コンソール確認。`);
        }
    }

    function displayError(message) {
        console.error("SCRIPT: displayError:", message);
        questionTextElement.textContent = message;
        questionTextElement.style.color = '#e74c3c';

        quizMainContentElement.style.display = 'none'; // Hide main quiz content
        quizFooterElement.style.display = 'none';
        resultAreaElement.style.display = 'none';
    }

    function startGame() {
        console.log("SCRIPT: startGame() が呼び出されました。");
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
        
        // UI要素の表示状態をリセット
        inputAreaElement.style.display = 'flex';
        answerLengthHintElement.style.display = 'block';
        feedbackDisplayElement.style.display = 'block';
        feedbackDisplayElement.innerHTML = ''; // Clear previous feedback symbols
        generalFeedbackElement.style.display = 'block';
        generalFeedbackElement.textContent = ""; 
        attemptsLeftDisplayElement.style.display = 'block';
        actionButtonsElement.style.display = 'flex';
        submitAnswerButton.style.display = 'inline-block';
        stoneImageElement.style.display = 'none'; // Initially hide stone until question is displayed

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
        answerBoxesContainerElement.innerHTML = ''; 
        charInputBoxes = []; // Reset the array

        for (let i = 0; i < answerLength; i++) {
            const inputBox = document.createElement('input');
            inputBox.type = 'text';
            inputBox.classList.add('char-box');
            inputBox.maxLength = 1;
            inputBox.dataset.index = i; // Store index for easy access

            inputBox.addEventListener('input', (e) => {
                const value = e.target.value;
                // If a character is entered and it's not the last box, move to the next box.
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
                // Allow typing single characters. maxlength=1 handles overflow.
            });

            inputBox.addEventListener('focus', (e) => {
                e.target.select(); // Select text in box on focus for easy replacement
            });

            answerBoxesContainerElement.appendChild(inputBox);
            charInputBoxes.push(inputBox);
        }

        if (charInputBoxes.length > 0) {
            charInputBoxes[0].focus(); 
        }
    }

    function displayQuestion() {
        console.log(`SCRIPT: displayQuestion() - 問題 ${currentQuestionIndex + 1} / ${selectedQuestions.length}`);
        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();
            console.log(`SCRIPT: 現在の正解: "${currentAnswer}" (長さ: ${currentAnswer.length})`);

            answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            createCharInputBoxes(currentAnswer.length); // Create new input boxes
            stoneImageElement.style.display = 'block'; // Show stone image
            
            feedbackDisplayElement.innerHTML = "";
            generalFeedbackElement.textContent = "";
            generalFeedbackElement.className = ""; 

            attemptsLeft = MAX_ATTEMPTS;
            attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
            
            charInputBoxes.forEach(box => box.disabled = false); // Enable boxes
            submitAnswerButton.disabled = false;
            submitAnswerButton.style.display = 'inline-block';
            nextButton.style.display = 'none';
        } else {
            console.log("SCRIPT: 全問題終了。結果表示。");
            showResults();
        }
    }

    submitAnswerButton.addEventListener('click', handleSubmitAnswer);
    // Optional: Allow submitting with Enter key if all boxes are filled or last box has focus
    // This would require more complex event handling on the input boxes themselves.

    function handleSubmitAnswer() {
        if (submitAnswerButton.disabled) return;

        let userInput = charInputBoxes.map(box => box.value).join('');
        console.log(`SCRIPT: ユーザー入力: "${userInput}", 正解: "${currentAnswer}"`);

        if (userInput.length !== currentAnswer.length) {
            generalFeedbackElement.textContent = `答えは ${currentAnswer.length} 文字全て入力してください。`;
            generalFeedbackElement.className = "incorrect";
            // Highlight empty boxes? (Optional enhancement)
            charInputBoxes.find(box => box.value === '')?.focus();
            return;
        }

        attemptsLeft--;
        let isCorrect = userInput === currentAnswer;
        let feedbackSymbols = [];

        if (isCorrect) {
            score++;
            generalFeedbackElement.textContent = "正解！ 🎉";
            generalFeedbackElement.className = "correct";
            feedbackSymbols = userInput.split('').map(() => '✅');
            finalizeAttempt(true); // Pass true for correct answer
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
                generalFeedbackElement.textContent = `不正解です。`;
                generalFeedbackElement.className = "incorrect";
                // Focus first incorrect box or first box
                charInputBoxes[0].focus(); 
                charInputBoxes.forEach(box => box.select());
            } else {
                generalFeedbackElement.textContent = `残念！正解は「${currentAnswer}」でした。`;
                generalFeedbackElement.className = "incorrect";
                finalizeAttempt(false); // Pass false for incorrect answer
            }
        }
        
        feedbackDisplayElement.innerHTML = feedbackSymbols.join(' ');
        attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
        updateScoreDisplay();
    }

    function finalizeAttempt(wasCorrect) {
        charInputBoxes.forEach(box => box.disabled = true);
        submitAnswerButton.disabled = true;
        nextButton.style.display = 'inline-block';
        // Optionally change char-box styles based on correctness
        if(wasCorrect) {
            // charInputBoxes.forEach(box => box.style.borderColor = '#27ae60');
        } else if (attemptsLeft <=0) {
            // charInputBoxes.forEach(box => box.style.borderColor = '#e74c3c');
        }
    }

    function updateScoreDisplay() {
        scoreElement.textContent = score;
    }

    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    restartButton.addEventListener('click', () => {
        console.log("SCRIPT: リスタートボタンがクリックされました。");
        startGame();
    });

    function showResults() {
        quizMainContentElement.style.display = 'none';
        quizFooterElement.style.display = 'none';
        resultAreaElement.style.display = 'block';
        finalScoreElement.textContent = score;
        // totalQuestionsElement は startGame で設定済み
    }

    loadQuestions();
});
