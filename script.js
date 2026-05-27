const API_URL = "/api/grok"; // On appelle notre fonction serveur sécurisée

let currentSubject = "Mathématiques";
let currentQuestion = "";

const navButtons = document.querySelectorAll('.nav-btn');
const subjectTitle = document.getElementById('current-subject');
const generateBtn = document.getElementById('generate-btn');
const submitBtn = document.getElementById('submit-btn');
const restartBtn = document.getElementById('restart-btn');
const startZone = document.getElementById('start-zone');
const loadingDiv = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const exerciseCard = document.getElementById('exercise-card');
const questionText = document.getElementById('question-text');
const userAnswer = document.getElementById('user-answer');
const correctionCard = document.getElementById('correction-card');
const correctionText = document.getElementById('correction-text');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSubject = btn.getAttribute('data-subject');
        subjectTitle.textContent = currentSubject;
        resetInterface();
    });
});

function resetInterface() {
    startZone.classList.remove('hidden');
    exerciseCard.classList.add('hidden');
    correctionCard.classList.add('hidden');
    loadingDiv.classList.add('hidden');
    userAnswer.value = "";
}

async function callBackend(messages) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: messages })
        });

        if (!response.ok) throw new Error("Erreur serveur réseau.");
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        alert("Impossible de joindre l'IA : " + error.message);
        resetInterface();
        return null;
    }
}

generateBtn.addEventListener('click', async () => {
    startZone.classList.add('hidden');
    loadingText.textContent = "L'IA prépare ton sujet... 📝";
    loadingDiv.classList.remove('hidden');

    const prompts = [
        { role: "system", content: "Tu es un prof qui génère des exercices de niveau brevet des collèges. Donne juste l'énoncé et les questions, pas la correction." },
        { role: "user", content: `Génère un exercice complet et inédit pour la matière : ${currentSubject}.` }
    ];

    const result = await callBackend(prompts);
    loadingDiv.classList.add('hidden');

    if (result) {
        currentQuestion = result;
        questionText.innerHTML = result.replace(/\n/g, "<br>");
        exerciseCard.classList.remove('hidden');
    }
});

submitBtn.addEventListener('click', async () => {
    const answer = userAnswer.value.trim();
    if (!answer) return alert("Rédige une réponse avant d'envoyer !");

    loadingText.textContent = "Analyse de ta copie en cours... 🧐";
    loadingDiv.classList.remove('hidden');

    const prompts = [
        { role: "system", content: "Tu es un correcteur du Brevet. Analyse la réponse de l'élève par rapport à l'exercice. Donne les points forts, corrige les erreurs et donne une note sur 20." },
        { role: "user", content: `Sujet:\n${currentQuestion}\n\nRéponse élève:\n${answer}` }
    ];

    const result = await callBackend(prompts);
    loadingDiv.classList.add('hidden');

    if (result) {
        let cleanText = result.replace(/\n/g, "<br>").replace(/### (.*?)(<br>|$)/g, "<h4>$1</h4>");
        correctionText.innerHTML = cleanText;
        correctionCard.classList.remove('hidden');
        correctionCard.scrollIntoView({ behavior: 'smooth' });
    }
});

restartBtn.addEventListener('click', resetInterface);