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

    // Traduction explicite des matières pour guider l'IA sans ambiguïté
    let matiereComplete = subject;
    if (subject === 'emc') {
        matiereComplete = "Enseignement Moral et Civique (EMC, citoyenneté et valeurs de la République)";
    } else if (subject === 'mathematiques') {
        matiereComplete = "Mathématiques";
    } else if (subject === 'francais') {
        matiereComplete = "Français (Langue, Grammaire et Littérature)";
    } else if (subject === 'sciences') {
        matiereComplete = "Sciences (SVT, Physique-Chimie, Technologie)";
    }

    try {
        // 1. GÉNÉRATION DE QUESTION
        if (action === 'generate') {
            const prompt = `Tu es un professeur de l'Éducation nationale pour des élèves de Troisième préparant le Brevet des collèges en France.
Génère une question ou un exercice unique, pertinent et strictement conforme au programme officiel pour la matière suivante : ${matiereComplete}.
Format demandé : ${format === 'courte' ? 'Une question flash simple et directe (par exemple : calcul ou règle rapide pour les mathématiques, grammaire ou conjugaison pour le français)' : 'Un sujet développé (par exemple : problème écrit structuré pour les mathématiques, analyse de texte ou réflexion courte pour le français)'}.
Donne uniquement le texte de la question ou de l'énoncé, sans aucune introduction, salutation ni conclusion.`;

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
Matière : ${matiereComplete}
Format de l'exercice : ${format}
Question d'origine : ${question}
Réponse proposée par l'élève : ${userAnswer}

Rédige des remarques bienveillantes (ce qui est maîtrisé, ce qui doit être complété). Pour le français, prends en compte la rédaction et l'orthographe. Pour les mathématiques, valide la justesse du raisonnement logique.
À la toute fin de ton message, tu dois obligatoirement écrire la mention exacte suivante : "Note : X/5" (remplace X par une note entière de 0 à 5).`;

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
