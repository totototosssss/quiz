document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - まず全て取得試行
    const questionTextElement = document.getElementById('question-text');
    const answerLengthHintElement = document.getElementById('answer-length-hint');
    const inputAreaElement = document.getElementById('input-area');
    const answerBoxesContainerElement = document.getElementById('answer-boxes-container');
    const stoneImageElement = document.getElementById('stone-image'); // stone.png用 (HTMLになくてもOK)
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

    // 必須HTML要素の存在確認関数
    function checkCriticalElementsExist() {
        const criticalElements = {
            questionTextElement, // 問題文表示エリア
            answerBoxesContainerElement, // 回答ボックスの親
            feedbackDisplayElement, // 正誤フィードバックシンボル表示
            generalFeedbackElement, // 正解！不正解...メッセージ表示
            submitAnswerButton,   // 解答ボタン
            nextButton,           // 次へボタン
            restartButton,        // リスタートボタン
            resultAreaElement,    // 結果表示エリア
            quizMainContentElement // メインコンテンツエリア
        };
        let allCriticalFound = true;
        for (const key in criticalElements) {
            if (!criticalElements[key]) {
                console.error(`SCRIPT_CRITICAL_ERROR: 必須HTML要素が見つかりません - ${key}。 HTMLのid属性が正しいか、要素が存在するか確認してください。`);
                allCriticalFound = false;
            }
        }
        return allCriticalFound;
    }

    // スクリプト開始時に必須要素をチェック
    if (!checkCriticalElementsExist()) {
        if (questionTextElement) { // questionTextElement自体はエラー表示に使うため、存在すると仮定
            questionTextElement.textContent = "ページの初期化に失敗しました。HTMLの構造を確認してください。詳細はブラウザのコンソールを参照してください。";
            questionTextElement.style.color = '#e74c3c'; // エラー色
        } else {
            // questionTextElementすら無い場合はアラートを出すなどするしかない
            alert("致命的なエラー: 基本的なページ構造が読み取れません。");
        }
        // 他の関連UI要素を非表示にする
        const nonEssentialAreas = [inputAreaElement, quizFooterElement, scoreAreaElement, actionButtonsElement];
        nonEssentialAreas.forEach(el => { if(el) el.style.display = 'none'; });
        return; // 必須要素がなければ処理を中断
    }


    async function loadQuestions() {
        console.log("SCRIPT: loadQuestions() が呼び出されました。");
        questionTextElement.textContent = "問題を読み込んでいます...";
        questionTextElement.style.color = '#34495e'; // 通常の文字色

        try {
            const response = await fetch('train_questions.json'); // ファイル名と場所を確認
            console.log(`SCRIPT: fetch('train_questions.json') のレスポンス - ステータス: ${response.status}, OK: ${response.ok}`);
            
            if (!response.ok) {
                const errorMsg = `問題ファイルの読み込みに失敗 (HTTPステータス: ${response.status})。ファイル名 ('train_questions.json') や配置場所が正しいか、ファイルがリポジトリに存在するか確認してください。`;
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
                    // console.log(`SCRIPT: ${lineNumber}行目: 空行のためスキップします。`); // 詳細ログが必要な場合
                    return null; 
                }
                try {
                    const q = JSON.parse(line);
                    parsedLinesCount++;
                    // console.log(`SCRIPT: ${lineNumber}行目: JSON解析成功。内容:`, q); // 詳細ログ

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
            
            console.log("SCRIPT: 最初の有効な問題オブジェクト:", allQuestions[0]); 
            startGame();

        } catch (error) { 
            console.error('SCRIPT: loadQuestions内で致命的なエラー(例: ネットワーク問題、fetch自体の失敗など):', error);
            displayError(`問題の読み込み中に予期せぬエラーが発生しました: ${error.message}. 詳細はブラウザのコンソールを確認してください。`);
        }
    }

    function displayError(message) {
        console.error("SCRIPT: displayError がメッセージ付きで呼び出されました:", message);
        if (questionTextElement) {
            questionTextElement.textContent = message;
            questionTextElement.style.color = '#e74c3c'; // エラーメッセージは赤字
        }

        // クイズ関連の主要UI要素を非表示にする
        const elementsToHideOnError = [
            quizMainContentElement, quizFooterElement, resultAreaElement,
            answerLengthHintElement, inputAreaElement, feedbackDisplayElement,
            generalFeedbackElement, attemptsLeftDisplayElement, actionButtonsElement,
            scoreAreaElement 
        ];
        elementsToHideOnError.forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    function startGame() {
        console.log("SCRIPT: startGame() が呼び出されました。");
        if (!quizMainContentElement || !quizFooterElement || !resultAreaElement || !questionTextElement || !totalQuestionsElement) {
             console.error("SCRIPT_CRITICAL: startGameに必要な基本UI要素がありません。"); 
             displayError("ページのUI部品が不足しているため、ゲームを開始できません。");
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
        
        console.log(`SCRIPT: シャッフル後の問題数: ${shuffled.length}, 今回プレイする問題数: ${selectedQuestions.length}`);
        totalQuestionsElement.textContent = selectedQuestions.length;
        
        // UI要素の表示状態をリセット
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
        if(stoneImageElement) stoneImageElement.style.display = 'none'; // 石は問題表示時に出す

        if (selectedQuestions.length > 0) {
            displayQuestion();
        } else {
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

    function createCharInputBoxes(answerLength) {
        if (!answerBoxesContainerElement) { 
            console.error("SCRIPT_ERROR: answerBoxesContainerElement is null in createCharInputBoxes. Cannot create input boxes."); 
            return; 
        }
        answerBoxesContainerElement.innerHTML = ''; 
        charInputBoxes = []; 

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
                    e.preventDefault(); // Prevent default backspace navigation if any
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
        if (!questionTextElement || !answerLengthHintElement || !feedbackDisplayElement || !generalFeedbackElement || !attemptsLeftDisplayElement || !submitAnswerButton || !nextButton) {
            console.error("SCRIPT_CRITICAL: displayQuestionに必要なUI要素が不足しています。");
            displayError("UI表示エラー。");
            return;
        }

        if (currentQuestionIndex < selectedQuestions.length) {
            const questionData = selectedQuestions[currentQuestionIndex];
            questionTextElement.textContent = questionData.question;
            currentAnswer = questionData.answer_entity.trim();
            console.log(`SCRIPT: 現在の正解: "${currentAnswer}" (長さ: ${currentAnswer.length})`);

            answerLengthHintElement.textContent = `答えは ${currentAnswer.length} 文字です。`;
            createCharInputBoxes(currentAnswer.length); 
            if (stoneImageElement) stoneImageElement.style.display = 'block'; // stone.pngを表示
            
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
            console.log("SCRIPT: 全ての問題が終了しました。結果を表示します。");
            showResults();
        }
    }
    
    function handleSubmitAnswer() {
        if (!submitAnswerButton || submitAnswerButton.disabled) return;
        if (!generalFeedbackElement || !feedbackDisplayElement || !attemptsLeftDisplayElement) {
             console.error("SCRIPT_CRITICAL: handleSubmitAnswerに必要なUI要素が不足しています。"); return;
        }

        let userInput = charInputBoxes.map(box => box.value).join('');
        console.log(`SCRIPT: ユーザー入力: "${userInput}", 正解: "${currentAnswer}"`);

        if (userInput.length !== currentAnswer.length) {
            generalFeedbackElement.textContent = `答えは ${currentAnswer.length} 文字全て入力してください。`;
            generalFeedbackElement.className = "incorrect";
            // 最初の空のボックス、または最初のボックスにフォーカス
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
            generalFeedbackElement.textContent = "正解！ 🎉";
            generalFeedbackElement.className = "correct";
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
                generalFeedbackElement.textContent = `不正解です。`;
                generalFeedbackElement.className = "incorrect";
                if (charInputBoxes.length > 0) charInputBoxes[0].focus(); 
                charInputBoxes.forEach(box => box.select()); // 内容を選択して再入力しやすくする
            } else {
                generalFeedbackElement.textContent = `残念！正解は「${currentAnswer}」でした。`;
                generalFeedbackElement.className = "incorrect";
                finalizeAttempt(false); 
            }
        }
        
        feedbackDisplayElement.innerHTML = feedbackSymbols.join(' ');
        attemptsLeftDisplayElement.textContent = `挑戦回数: あと ${attemptsLeft} 回`;
        updateScoreDisplay();
    }

    function finalizeAttempt(wasCorrect) {
        charInputBoxes.forEach(box => box.disabled = true);
        if (submitAnswerButton) submitAnswerButton.disabled = true;
        if (nextButton) nextButton.style.display = 'inline-block';
    }

    function updateScoreDisplay() {
        if (scoreElement) scoreElement.textContent = score;
    }
    
    function showResults() {
        if(quizMainContentElement) quizMainContentElement.style.display = 'none';
        if(quizFooterElement) quizFooterElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block';
        if(finalScoreElement) finalScoreElement.textContent = score;
        // totalQuestionsElement は startGame で設定済み
    }

    // --- イベントリスナー設定 ---
    if (submitAnswerButton) {
        submitAnswerButton.addEventListener('click', handleSubmitAnswer);
    } // else のエラー出力はスクリプト冒頭の checkCriticalElementsExist で行う

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
    loadQuestions();
});
