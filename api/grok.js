const https = require('https');

module.exports = async function (req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, subject, format, question, userAnswer } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "La clé GROK_API_KEY est introuvable dans les variables Vercel." });
    }

    // Modèle Llama 3.1 ultra rapide et actif sur Groq
    const MODEL_NAME = "llama-3.1-8b-instant";

    // Fonction d'aide pour faire un POST HTTPS propre compatible toutes versions Node.js
    const postToGroq = (bodyData) => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.groq.com',
                path: '/openai/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                }
            };

            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error("Réponse de l'API Groq illisible (JSON invalide)"));
                    }
                });
            });

            request.on('error', (err) => reject(err));
            request.write(JSON.stringify(bodyData));
            request.end();
        });
    };

    try {
        // 1. GÉNÉRATION DE QUESTION
        if (action === 'generate') {
            const prompt = `Tu es un professeur d'école expert du Brevet des collèges en France (Mathématiques, Français, Histoire-Géographie/EMC et Sciences).
Génère un exercice ou une question unique, pertinente et strictement conforme au programme officiel de Troisième pour la matière suivante : ${subject}.

Voici les règles de format selon la matière :
- Si la matière est "maths" : 
  * Format courte : Génère une question flash (calcul mental, petite équation, règle de géométrie simple).
  * Format longue : Génère un vrai problème de Brevet détaillé (Thalès, Pythagore, probabilités, fonctions ou statistiques).
- Si la matière est "francais" : 
  * Format courte : Une question rapide de grammaire, conjugaison, orthographe ou réécriture.
  * Format longue : Un court extrait littéraire suivi d'une question d'analyse ou de compréhension de texte.
- Si la matière est "histoire" ou "sciences" : Reste sur les formats standards du Brevet.

Donne uniquement le texte de l'exercice ou de la question, sans aucune introduction, salutation ni conclusion.`;

            const data = await postToGroq({
                model: MODEL_NAME,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            });
            
            if (data.error) {
                return res.status(400).json({ error: `Erreur Groq: ${data.error.message} (Code: ${data.error.code})` });
            }

            if (data.choices && data.choices[0]) {
                return res.status(200).json({ question: data.choices[0].message.content.trim() });
            } else {
                return res.status(500).json({ error: "Le serveur a renvoyé un format de réponse inconnu." });
            }
        }

        // 2. CORRECTION DE LA RÉPONSE
        else if (action === 'correct') {
            const prompt = `Tu es un professeur correcteur officiel du Brevet des collèges. Évalue la réponse de l'élève de manière constructive.
Matière : ${subject}
Format de l'exercice : ${format}
Question d'origine : ${question}
Réponse proposée par l'élève : ${userAnswer}

Rédige des remarques bienveillantes (ce qui est maîtrisé, ce qui doit être complété ou corrigé).
Si la matière est "maths", sois très attentif à la logique du raisonnement en plus du résultat final.
Si la matière est "francais", prends bien en compte l'orthographe et la structure de la phrase.

À la toute fin de ton message, tu devez obligatoirement écrire la mention exacte suivante : "Note : X/5" (remplace X par une note entière de 0 à 5).`;

            const data = await postToGroq({
                model: MODEL_NAME,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.4
            });

            if (data.error) {
                return res.status(400).json({ error: `Erreur Groq: ${data.error.message}` });
            }

            if (data.choices && data.choices[0]) {
                return res.status(200).json({ correction: data.choices[0].message.content.trim() });
            } else {
                return res.status(500).json({ error: "Impossible de lire la correction renvoyée par l'IA." });
            }
        }

    } catch (err) {
        return res.status(500).json({ error: `Erreur de traitement : ${err.message}` });
    }
};
