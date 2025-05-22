document.addEventListener('DOMContentLoaded', () => {
    const questionTextElement = document.getElementById('question-text');
    const answerOptionsElement = document.getElementById('answer-options');
    const feedbackTextElement = document.getElementById('feedback-text');
    const nextButton = document.getElementById('next-button');
    const scoreElement = document.getElementById('score');
    const resultAreaElement = document.getElementById('result-area');
    const finalScoreElement = document.getElementById('final-score');
    const totalQuestionsElement = document.getElementById('total-questions');
    const restartButton = document.getElementById('restart-button');
    const questionAreaElement = document.getElementById('question-area');
    const controlsAreaElement = document.getElementById('controls-area');
    const scoreAreaElement = document.getElementById('score-area');


    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let selectedQuestions = []; // 表示する問題を格納する配列

    // JSONファイルから問題を読み込む
// script.js の中の loadQuestions 関数を以下のように修正します。
// (他の部分は前回の回答のままで大丈夫です)

    async function loadQuestions() {
        try {
            const response = await fetch('train_questions.json'); // ファイル名はあなたのものに合わせてください
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching ${response.url}`);
            }
            
            // NDJSON形式のデータを処理するために修正
            const textData = await response.text();
            if (!textData.trim()) { // データが空の場合のチェック
                displayError('問題データが空か、ファイルの内容がありません。');
                return;
            }
            allQuestions = textData.trim().split('\n').map(line => {
                try {
                    return JSON.parse(line);
                } catch (parseError) {
                    console.error('JSONの行の解析に失敗しました:', line, parseError);
                    // 不正な行はスキップするか、エラー処理を強化することもできます
                    return null; // 不正な行はnullとしてマーク
                }
            }).filter(q => q !== null); // nullになった不正な行を除外

            if (!allQuestions || allQuestions.length === 0) {
                displayError('問題データの解析に失敗したか、有効な問題がありません。');
                return;
            }
            startGame();
        } catch (error) {
            console.error('問題の読み込みに失敗:', error);
            displayError(`問題の読み込みエラー: ${error.message}。ファイルパスやJSONファイルの形式、内容を確認してください。`);
        }
    }

// displayError 関数 (もし前回コードになければ、以下を追加または確認してください)
    function displayError(message) {
        questionTextElement.textContent = message;
        if (answerLengthHintElement) answerLengthHintElement.style.display = 'none';
        const inputArea = document.getElementById('input-area');
        if (inputArea) inputArea.style.display = 'none';
        if (attemptsLeftDisplayElement) attemptsLeftDisplayElement.style.display = 'none';
        if (generalFeedbackElement) generalFeedbackElement.style.display = 'none';
        // 他に非表示にしたい要素があればここに追加
    }

// startGame, displayQuestion などの他の関数は前回の回答の通りです。
// allQuestions 配列が正しくこの形式で読み込まれれば、残りのロジックは機能するはずです。

    function startGame() {
        currentQuestionIndex = 0;
        score = 0;
        resultAreaElement.style.display = 'none';
        questionAreaElement.style.display = 'block';
        controlsAreaElement.style.display = 'block';
        scoreAreaElement.style.display = 'block';
        nextButton.style.display = 'none';
        updateScoreDisplay();
        // 問題をシャッフルし、一部を選択 (例: 10問)
        selectedQuestions = shuffleArray([...questions]).slice(0, 10); // 全問出す場合は .slice(0, questions.length) または単に shuffleArray([...questions])
        if (selectedQuestions.length === 0 && questions.length > 0) {
            // もし元データはあるがsliceで0件になった場合（例：元の問題数が10未満でslice(0,10)した場合）
            selectedQuestions = shuffleArray([...questions]);
        }
        totalQuestionsElement.textContent = selectedQuestions.length;

        if (selectedQuestions.length > 0) {
            displayQuestion();
        } else {
            questionTextElement.textContent = '表示できる問題がありません。';
        }
    }

    // 配列をシャッフルする関数 (Fisher-Yates shuffle)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function displayQuestion() {
        feedbackTextElement.textContent = '';
        feedbackTextElement.className = ''; // クラスをリセット
        nextButton.style.display = 'none';
        answerOptionsElement.innerHTML = ''; // 前の選択肢をクリア

        if (currentQuestionIndex < selectedQuestions.length) {
            const currentQuestion = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = currentQuestion.question;

            // 正解の選択肢と他の候補を混ぜる
            let choices = [...currentQuestion.answer_candidates];
            // 念のため、正解が必ず候補に含まれるようにする
            if (!choices.includes(currentQuestion.answer_entity)) {
                // もしanswer_candidatesに正解が含まれていなければ、追加する (ただし、通常は含まれているはず)
                // choices.pop(); // 最後の要素を削除して数を合わせるか、そのまま追加するか
                choices.push(currentQuestion.answer_entity);
            }
            choices = shuffleArray(choices);
            // 選択肢の数を制限したい場合 (例: 最大4つ)
            // choices = choices.slice(0, 4);
            // もしスライスした結果、正解が消えてしまった場合、再度含める処理が必要になる。
            // ここでは、answer_candidatesをそのままシャッフルして使うことを想定。

            choices.forEach(choice => {
                const button = document.createElement('button');
                button.textContent = choice;
                button.addEventListener('click', () => handleAnswer(choice, currentQuestion.answer_entity, button));
                answerOptionsElement.appendChild(button);
            });
        } else {
            showResults();
        }
    }

    function handleAnswer(selectedAnswer, correctAnswer, button) {
        const buttons = answerOptionsElement.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true); // すべてのボタンを無効化

        if (selectedAnswer === correctAnswer) {
            score++;
            feedbackTextElement.textContent = '正解！ 🎉';
            feedbackTextElement.className = 'correct';
            button.classList.add('correct');
        } else {
            feedbackTextElement.textContent = `不正解... 😥 正解は「${correctAnswer}」でした。`;
            feedbackTextElement.className = 'incorrect';
            button.classList.add('incorrect');
            // 正解の選択肢もハイライトする
            buttons.forEach(btn => {
                if (btn.textContent === correctAnswer) {
                    btn.classList.add('correct');
                }
            });
        }
        updateScoreDisplay();
        nextButton.style.display = 'inline-block'; // 次へボタン表示
    }

    function updateScoreDisplay() {
        scoreElement.textContent = score;
    }

    function nextQuestionHandler() {
        currentQuestionIndex++;
        displayQuestion();
    }

    function showResults() {
        questionAreaElement.style.display = 'none';
        controlsAreaElement.style.display = 'none';
        // scoreAreaElement.style.display = 'none'; // スコアは結果画面でも見せるのでコメントアウト
        resultAreaElement.style.display = 'block';
        finalScoreElement.textContent = score;
        totalQuestionsElement.textContent = selectedQuestions.length; // 表示した問題数
    }

    nextButton.addEventListener('click', nextQuestionHandler);
    restartButton.addEventListener('click', startGame);

    // 初期化
    loadQuestions();
});
