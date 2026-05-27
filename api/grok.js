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

    // Nettoyage et traduction stricte de la matière pour guider l'IA
    const cleanSubject = (subject || '').toLowerCase().trim();
    let matiereComplete = "Histoire";

    if (cleanSubject === 'histoire') {
        matiereComplete = "Histoire (Programme de Troisième France)";
    } else if (cleanSubject.includes('géo')) {
        matiereComplete = "Géographie (Programme de Troisième France)";
    } else if (cleanSubject === 'emc' || cleanSubject.includes('civique')) {
        matiereComplete = "Enseignement Moral et Civique (EMC, citoyenneté, valeurs de la République, institutions, Droits de l'homme)";
    } else if (cleanSubject.includes('science')) {
        matiereComplete = "Sciences (SVT, Physique-Chimie, Technologie)";
    } else if (cleanSubject.includes('math')) {
        matiereComplete = "Mathématiques (Algèbre, Géométrie, Équations de Troisième)";
    } else if (cleanSubject.includes('franc')) {
        matiereComplete = "Français (Langue, Grammaire, Dictée et Littérature de Troisième)";
    }

    try {
        // 1. GÉNÉRATION DE QUESTION
        if (action === 'generate') {
            const prompt = `Tu es un professeur de l'Éducation nationale pour des élèves de Troisième préparant le Brevet des collèges en France.
Génère une question ou un exercice unique, pertinent et strictement conforme au programme officiel pour la matière suivante : ${matiereComplete}.
IMPORTANT POUR L'EMC : Ne confonds pas avec les mathématiques ou le français. Pose une question sur la citoyenneté, la Constitution, le parcours citoyen ou les symboles républicains.
Format demandé : ${format === 'courte' ? 'Une question flash simple et directe nécessitant une réponse courte.' : 'Un sujet développé (par exemple : une question de réflexion ou un paragraphe rédigé structuré).'}.
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

Rédige des remarques bienveillantes (ce qui est maîtrisé, ce qui doit être complété). S'il s'agit d'EMC, vérifie la justesse des connaissances civiques et républicaines.
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
