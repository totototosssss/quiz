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
    const questionAreaElement = document.getElementById('question-area');
    const controlsAreaElement = document.getElementById('controls-area');

    // Quiz State
    let allQuestions = [];
    let selectedQuestions = [];
    let currentQuestionIndex = 0;
    let currentAnswer = "";
    let score = 0;
    let attemptsLeft = 0;
    const MAX_ATTEMPTS = 3;
    const NUM_QUESTIONS_TO_SHOW = 10;

    // --- 初期化と問題読み込み ---
    async function loadQuestions() {
        console.log("SCRIPT: loadQuestions() が呼び出されました。");
        questionTextElement.textContent = "問題を読み込んでいます..."; // 初期メッセージをリセット
        questionTextElement.style.color = '#333'; // エラー表示だった場合に戻す

        try {
            const response = await fetch('train_questions.json'); // ファイル名と場所を確認
            console.log(`SCRIPT: fetch('train_questions.json') のレスポンス - ステータス: ${response.status}, OK: ${response.ok}`);
            
            if (!response.ok) {
                const errorMsg = `問題ファイルの読み込みに失敗しました (HTTPステータス: ${response.status})。ファイル名 ('train_questions.json') や配置場所が正しいか、ファイルがリポジトリに存在するか確認してください。`;
                console.error("SCRIPT: fetchエラー:", errorMsg);
                displayError(errorMsg);
                return; 
            }
            
            const textData = await response.text();
            console.log(`SCRIPT: 読み込まれたテキストデータの長さ: ${textData.length} 文字`);
            if (!textData.trim()) {
                const errorMsg = '問題ファイルが空か、内容が空白文字のみです。ファイルを確認してください。';
                console.error("SCRIPT: ファイル内容が空です。");
                displayError(errorMsg);
                return;
            }

            const lines = textData.trim().split('\n');
            console.log(`SCRIPT: ファイル内の行数 (改行で分割後): ${lines.length} 行`);
            
            let parsedLinesCount = 0;
            let validQuestionsCount = 0;

            allQuestions = lines.map((line, index) => {
                const lineNumber = index + 1;
                if (!line.trim()) {
                    // console.log(`SCRIPT: ${lineNumber}行目: 空行のためスキップします。`);
                    return null; 
                }
                try {
                    const q = JSON.parse(line);
                    parsedLinesCount++;
                    // console.log(`SCRIPT: ${lineNumber}行目: JSON解析成功。内容:`, q);

                    // question と answer_entity が存在し、かつ空でない文字列であることを確認
                    if (q && q.question && typeof q.question === 'string' && q.question.trim() !== "" &&
                        q.answer_entity && typeof q.answer_entity === 'string' && q.answer_entity.trim() !== "") {
                        validQuestionsCount++;
                        return q;
                    } else {
                        console.warn(`SCRIPT: ${lineNumber}行目: 'question'または'answer_entity'が存在しないか空です。この行をスキップします。 question: "${q.question}", answer_entity: "${q.answer_entity}"`);
                        return null;
                    }
                } catch (parseError) {
                    console.error(`SCRIPT: ${lineNumber}行目: JSON解析エラー - ${parseError.message}。 問題のある行: "${line}"`);
                    return null; 
                }
            }).filter(q => q !== null); 

            console.log(`SCRIPT: 解析を試みた行数: ${parsedLinesCount} (空行除く)`);
            console.log(`SCRIPT: 有効な問題として処理された問題数 (question/answer_entityチェック後): ${validQuestionsCount}`);
            console.log(`SCRIPT: 最終的な allQuestions 配列の長さ (null除去後): ${allQuestions.length}`);


            if (allQuestions.length === 0) {
                const errorMsg = '有効な問題データが読み込めませんでした。ファイルは読み込めていますが、中身の形式 (各行が正しいJSONか) や必須項目 (question, answer_entityが空でない文字列であること) を確認してください。詳細はブラウザのコンソールを確認してください。';
                console.error("SCRIPT: 処理の結果、有効な問題が0件でした。");
                displayError(errorMsg);
                return;
            }
            
            console.log("SCRIPT: 最初の有効な問題オブジェクト:", allQuestions[0]); // 最初の問題をログに出力
            startGame();

        } catch (error) { 
            console.error('SCRIPT: loadQuestions内で致命的なエラー(例: ネットワーク問題、fetch自体の失敗など):', error);
            displayError(`問題の読み込み中に予期せぬエラーが発生しました: ${error.message}. 詳細はブラウザのコンソールを確認してください。`);
        }
    }

    function displayError(message) {
        console.error("SCRIPT: displayError がメッセージ付きで呼び出されました:", message);
        questionTextElement.textContent = message;
        questionTextElement.style.color = '#dc3545'; // エラーメッセージは赤字

        // クイズ関連の主要UI要素を非表示にする
        const elementsToHide = [
            answerLengthHintElement, inputAreaElement, feedbackDisplayElement,
            generalFeedbackElement, attemptsLeftDisplayElement, controlsAreaElement,
            scoreAreaElement, resultAreaElement, submitAnswerButton // submitAnswerButtonも直接指定
        ];
        elementsToHide.forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    function startGame() {
        console.log("SCRIPT: startGame() が呼び出されました。");
        questionTextElement.style.color = '#333'; 
        score = 0;
        currentQuestionIndex = 0;
        updateScoreDisplay();

        let shuffled = shuffleArray([...allQuestions]);
        // 表示する問題数を、実際に読み込めた問題数と NUM_QUESTIONS_TO_SHOW の小さい方に合わせる
        const numToShow = Math.min(NUM_QUESTIONS_TO_SHOW, shuffled.length);
        selectedQuestions = shuffled.slice(0, numToShow);
        
        console.log(`SCRIPT: シャッフル後の問題数: ${shuffled.length}, 今回プレイする問題数: ${selectedQuestions.length}`);
        totalQuestionsElement.textContent = selectedQuestions.length;
        
        resultAreaElement.style.display = 'none';
        questionAreaElement.style.display = 'block'; 
        controlsAreaElement.style.display = 'block'; 
        scoreAreaElement.style.display = 'block';  

        answerLengthHintElement.style.display = 'block';
        inputAreaElement.style.display = 'flex';
        feedbackDisplayElement.style.display = 'block';
        generalFeedbackElement.style.display = 'block';
        generalFeedbackElement.textContent = ""; // 前回のフィードバックをクリア
        attemptsLeftDisplayElement.style.display = 'block';
        submitAnswerButton.style.display = 'inline-block';


        if (selectedQuestions.length > 0) {
            displayQuestion();
        } else {
            // この状態は loadQuestions で処理されるはずだが、万が一のためのセーフガード
            console.error("SCRIPT: startGame() で selectedQuestions が0件です。これは予期せぬ状態です。");
            displayError('表示できるクイズ問題がありません。(startGame内の最終チェック)');
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
        console.log(`SCRIPT: displayQuestion() - 問題 ${currentQuestionIndex + 1} / ${selectedQuestions.length} を表示します。`);
        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();
            console.log(`SCRIPT: 現在の問題の正解: "${currentAnswer}" (長さ: ${currentAnswer.length})`);

            answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            answerInputElement.value = "";
            answerInputElement.maxLength = currentAnswer.length;
            answerInputElement.disabled = false;
            
            feedbackDisplayElement.innerHTML = "";
            generalFeedbackElement.textContent = "";
            generalFeedbackElement.className = ""; 

            attemptsLeft = MAX_ATTEMPTS;
            attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
            
            submitAnswerButton.disabled = false;
            nextButton.style.display = 'none';
            answerInputElement.focus(); // 入力フィールドにフォーカス
        } else {
            console.log("SCRIPT: 全ての問題が終了しました。結果を表示します。");
            showResults();
        }
    }

    submitAnswerButton.addEventListener('click', handleSubmitAnswer);
    answerInputElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !submitAnswerButton.disabled) {
            handleSubmitAnswer();
        }
    });

    function handleSubmitAnswer() {
        if (submitAnswerButton.disabled) return;

        const userInput = answerInputElement.value.trim();
        // console.log(`SCRIPT: ユーザー入力: "${userInput}", 正解: "${currentAnswer}"`);

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

    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    restartButton.addEventListener('click', () => {
        console.log("SCRIPT: リスタートボタンがクリックされました。");
        // startGame()を直接呼ぶ代わりに、状態をリセットしてからloadQuestionsを呼ぶ方が
        // JSONファイルが万が一変更された場合にも対応できるが、ここではシンプルにstartGameを呼ぶ
        startGame();
    });

    function showResults() {
        questionAreaElement.style.display = 'none';
        controlsAreaElement.style.display = 'none';
        scoreAreaElement.style.display = 'block'; 
        resultAreaElement.style.display = 'block';
        finalScoreElement.textContent = score;
        totalQuestionsElement.textContent = selectedQuestions.length; 
    }

    loadQuestions();
});
