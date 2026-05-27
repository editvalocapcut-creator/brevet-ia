document.addEventListener('DOMContentLoaded', () => {
    const subjectSelect = document.getElementById('subject-select');
    const formatSelect = document.getElementById('format-select'); // Sélection du format
    const startBtn = document.getElementById('start-btn');
    const quizBox = document.getElementById('quiz-box');
    const questionText = document.getElementById('question-text');
    const userAnswer = document.getElementById('user-answer');
    const submitBtn = document.getElementById('submit-btn');
    const correctionBox = document.getElementById('correction-box');
    const correctionText = document.getElementById('correction-text');
    const nextBtn = document.getElementById('next-btn');

    let currentQuestion = "";

    // 1. Générer une question
    startBtn.addEventListener('click', async () => {
        const subject = subjectSelect.value;
        const format = formatSelect.value; // Récupère "courte" ou "longue"

        startBtn.disabled = true;
        startBtn.innerText = "Génération...";
        
        try {
            const response = await fetch('/api/grok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', subject: subject, format: format })
            });

            const data = await response.json();
            currentQuestion = data.question;
            
            questionText.innerText = currentQuestion;
            userAnswer.value = "";
            quizBox.classList.remove('hidden');
            correctionBox.classList.add('hidden');
            
            // Scroll automatique vers la question
            quizBox.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            alert("Erreur lors de la génération de la question. Réessaie !");
            console.error(error);
        } finally {
            startBtn.disabled = false;
            startBtn.innerText = "Générer une question";
        }
    });

    // 2. Corriger la réponse
    submitBtn.addEventListener('click', async () => {
        const answer = userAnswer.value.trim();
        if (!answer) {
            alert("Écris d'abord une réponse !");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Correction en cours...";

        try {
            const response = await fetch('/api/grok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'correct', 
                    subject: subjectSelect.value, 
                    question: currentQuestion, 
                    userAnswer: answer,
                    format: formatSelect.value // On envoie aussi le format pour adapter la sévérité de la correction
                })
            });

            const data = await response.json();
            correctionText.innerHTML = data.correction.replace(/\n/g, '<br>');
            correctionBox.classList.remove('hidden');
            
            correctionBox.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            alert("Erreur lors de la correction.");
            console.error(error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Corriger ma réponse";
        }
    });

    // 3. Question suivante
    nextBtn.addEventListener('click', () => {
        startBtn.click();
    });
});
