document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const questionTextElement = document.getElementById('question-text');
    const answerLengthHintElement = document.getElementById('answer-length-hint');
    const inputAreaElement = document.getElementById('input-area');
    const answerInputElement = document.getElementById('answer-input');
    const submitAnswerButton = document.getElementById('submit-answer-button');
    const feedbackDisplayElement = document.getElementById('feedback-display');
    const generalFeedbackElement = document.getElementById('general-feedback');
    const attemptsLeftDisplayElement = document.getElementById('attempts-left-display');
    const nextButton = document.getElementById('next-button');
    const scoreElement = document.getElementById('score');
    const scoreAreaElement = document.getElementById('score-area');

    const resultAreaElement = document.getElementById('result-area');
    const finalScoreElement = document.getElementById('final-score');
    const totalQuestionsElement = document.getElementById('total-questions');
    const restartButton = document.getElementById('restart-button');
    
    const questionAreaElement = document.getElementById('question-area'); // For hiding/showing main quiz part
    const controlsAreaElement = document.getElementById('controls-area');


    // Quiz State
    let allQuestions = [];
    let selectedQuestions = [];
    let currentQuestionIndex = 0;
    let currentAnswer = "";
    let score = 0;
    let attemptsLeft = 0;
    const MAX_ATTEMPTS = 3;
    const NUM_QUESTIONS_TO_SHOW = 10; // 表示する問題数

    // --- 初期化と問題読み込み ---
    async function loadQuestions() {
        // console.log("問題の読み込みを開始します...");
        try {
            const response = await fetch('train_questions.json'); // train_questions.json がHTMLと同じ階層にあることを確認
            // console.log("Fetchステータス:", response.status);
            if (!response.ok) {
                displayError(`問題ファイルの読み込みに失敗 (HTTP ${response.status})。ファイル名やパスを確認してください。`);
                // この throw は下の catch に捕らえられます
                throw new Error(`HTTP error! status: ${response.status} on ${response.url}`);
            }
            
            const textData = await response.text();
            // console.log("読み込んだテキストデータの長さ:", textData.length);
            if (!textData.trim()) {
                displayError('問題ファイルが空です。中身を確認してください。');
                return;
            }

            const lines = textData.trim().split('\n');
            // console.log("ファイル内の行数:", lines.length);
            
            allQuestions = lines.map((line, index) => {
                if (!line.trim()) return null; // 空行はスキップ
                try {
                    const q = JSON.parse(line);
                    // 必須プロパティの確認
                    if (q && q.question && q.answer_entity) {
                        return q;
                    }
                    // console.warn(`行 ${index + 1}: 必須プロパティ (question, answer_entity) が欠けています。スキップします。`, line);
                    return null;
                } catch (parseError) {
                    // console.error(`JSON解析エラー (行 ${index + 1}): ${parseError.message}`, "該当行:", line);
                    return null; 
                }
            }).filter(q => q !== null); // null や不正なオブジェクトを除外

            // console.log("解析後の有効な問題数:", allQuestions.length);

            if (!allQuestions || allQuestions.length === 0) {
                displayError('有効な問題データが読み込めませんでした。JSONファイルの内容や形式、必須プロパティ(question, answer_entity)を確認してください。');
                return;
            }
            startGame();
        } catch (error) {
            console.error('loadQuestionsで致命的なエラーが発生しました:', error);
            // 既にdisplayErrorが呼ばれていなければ、汎用エラーを表示
            if (!questionTextElement.textContent.includes('失敗') && !questionTextElement.textContent.includes('空です') && !questionTextElement.textContent.includes('読み込めませんでした')) {
                 displayError(`問題の読み込み中に予期せぬエラー: ${error.message}`);
            }
        }
    }

    function displayError(message) {
        questionTextElement.textContent = message;
        questionTextElement.style.color = '#dc3545'; // エラーメッセージは赤字で
        answerLengthHintElement.style.display = 'none';
        inputAreaElement.style.display = 'none';
        feedbackDisplayElement.style.display = 'none';
        generalFeedbackElement.style.display = 'none';
        attemptsLeftDisplayElement.style.display = 'none';
        submitAnswerButton.style.display = 'none'; // submitも隠す
        nextButton.style.display = 'none';
        scoreAreaElement.style.display = 'none';
        resultAreaElement.style.display = 'none';
    }

    function startGame() {
        // console.log("ゲームを開始します。");
        questionTextElement.style.color = '#333'; // 通常の文字色に戻す
        score = 0;
        currentQuestionIndex = 0;
        updateScoreDisplay();

        let shuffled = shuffleArray([...allQuestions]);
        selectedQuestions = shuffled.slice(0, Math.min(NUM_QUESTIONS_TO_SHOW, shuffled.length));
        
        // console.log("プレイする問題数:", selectedQuestions.length);
        totalQuestionsElement.textContent = selectedQuestions.length;
        
        resultAreaElement.style.display = 'none';
        questionAreaElement.style.display = 'block'; // Quiz area visible
        controlsAreaElement.style.display = 'block'; // Next button area visible
        scoreAreaElement.style.display = 'block';  // Score area visible

        // UI要素の表示状態をリセット
        answerLengthHintElement.style.display = 'block';
        inputAreaElement.style.display = 'flex';
        feedbackDisplayElement.style.display = 'block';
        generalFeedbackElement.style.display = 'block';
        attemptsLeftDisplayElement.style.display = 'block';
        submitAnswerButton.style.display = 'inline-block';


        if (selectedQuestions.length > 0) {
            displayQuestion();
        } else {
            // このエラーはloadQuestionsでキャッチされるはずだが、念のため
            displayError('表示できるクイズ問題がありません。 (startGame)');
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function displayQuestion() {
        // console.log(`問題 ${currentQuestionIndex + 1} を表示します。`);
        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();

            answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            answerInputElement.value = "";
            answerInputElement.maxLength = currentAnswer.length;
            answerInputElement.disabled = false;
            
            feedbackDisplayElement.innerHTML = "";
            generalFeedbackElement.textContent = "";
            generalFeedbackElement.className = ""; // Reset class for color

            attemptsLeft = MAX_ATTEMPTS;
            attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
            
            submitAnswerButton.disabled = false;
            nextButton.style.display = 'none';
        } else {
            // console.log("全ての問題が終了しました。結果を表示します。");
            showResults();
        }
    }

    // --- 解答処理 ---
    submitAnswerButton.addEventListener('click', handleSubmitAnswer);
    answerInputElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !submitAnswerButton.disabled) {
            handleSubmitAnswer();
        }
    });

    function handleSubmitAnswer() {
        if (submitAnswerButton.disabled) return;

        const userInput = answerInputElement.value.trim();
        // console.log(`ユーザー入力: "${userInput}", 正解: "${currentAnswer}"`);

        if (userInput.length !== currentAnswer.length) {
            generalFeedbackElement.textContent = `答えは ${currentAnswer.length} 文字で入力してください。`;
            generalFeedbackElement.className = "incorrect";
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
            finalizeAttempt();
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
            } else {
                generalFeedbackElement.textContent = `残念！正解は「${currentAnswer}」でした。`;
                generalFeedbackElement.className = "incorrect";
                finalizeAttempt();
            }
        }
        
        feedbackDisplayElement.innerHTML = feedbackSymbols.join(' ');
        attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
        updateScoreDisplay();
    }

    function finalizeAttempt() {
        submitAnswerButton.disabled = true;
        answerInputElement.disabled = true;
        nextButton.style.display = 'inline-block';
    }

    function updateScoreDisplay() {
        scoreElement.textContent = score;
    }

    // --- 次の問題へ / 結果表示 ---
    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    restartButton.addEventListener('click', startGame);

    function showResults() {
        questionAreaElement.style.display = 'none';
        controlsAreaElement.style.display = 'none';
        scoreAreaElement.style.display = 'block'; // Keep score visible for results
        resultAreaElement.style.display = 'block';
        finalScoreElement.textContent = score;
        // totalQuestionsElement は startGame で設定済み
    }

    // --- 初期読み込み実行 ---
    loadQuestions();
});
