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

    // Utilisation du modèle le plus récent et stable de Groq
    const MODEL_NAME = "llama-3.3-70b-versatile";

    try {
        // 1. GÉNÉRATION DE QUESTION
        if (action === 'generate') {
            const prompt = `Tu es un professeur d'histoire-géographie et de sciences pour des élèves de Troisième préparant le Brevet en France.
Génère une question unique, pertinente et conforme au programme officiel pour la matière suivante : ${subject}.
Format demandé : ${format === 'courte' ? 'Une question flash simple et directe' : 'Un sujet de réflexion ou développement construit nécessitant des arguments'}.
Donne uniquement le texte de la question, sans aucune introduction, salutation ni conclusion.`;

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey.trim()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            
            if (data.error) {
                return res.status(400).json({ error: `Erreur API Groq: ${data.error.message}` });
            }

            if (data.choices && data.choices[0]) {
                return res.status(200).json({ question: data.choices[0].message.content.trim() });
            } else {
                return res.status(500).json({ error: "Le serveur Groq a renvoyé un format de réponse inconnu." });
            }
        }

        // 2. CORRECTION DE LA RÉPONSE ELEVE
        else if (action === 'correct') {
            const prompt = `Tu es un professeur correcteur officiel du Brevet des collèges. Évalue la réponse de l'élève de manière constructive.
Matière : ${subject}
Format de l'exercice : ${format}
Question d'origine : ${question}
Réponse proposée par l'élève : ${userAnswer}

Rédige des remarques bienveillantes (ce qui est maîtrisé, ce qui doit être complété).
À la toute fin de ton message, tu dois obligatoirement écrire la mention exacte suivante : "Note : X/5" (remplace X par une note entière de 0 à 5).`;

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey.trim()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.4
                })
            });

            const data = await response.json();

            if (data.error) {
                return res.status(400).json({ error: `Erreur API Groq: ${data.error.message}` });
            }

            if (data.choices && data.choices[0]) {
                return res.status(200).json({ correction: data.choices[0].message.content.trim() });
            } else {
                return res.status(500).json({ error: "Impossible de lire la correction renvoyée par l'IA." });
            }
        }

    } catch (err) {
        return res.status(500).json({ error: `Erreur interne du serveur : ${err.message}` });
    }
};
