module.exports = async function (req, res) {
    // Gestion des accès CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, subject, format, question, userAnswer } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "La clé GROK_API_KEY est manquante sur Vercel." });
    }

    try {
        // 1. GÉNÉRATION D'UNE QUESTION
        if (action === 'generate') {
            const prompt = `Tu es un professeur d'histoire-géographie et de sciences pour des élèves de Troisième qui préparent le Brevet des collèges en France.
Génère une question unique, pertinente et conforme au programme de la matière suivante : ${subject}.
Le format doit être : ${format === 'courte' ? 'Une question flash simple' : 'Un sujet de réflexion ou développement construit'}.
Donne uniquement la question, sans aucune autre phrase d'introduction ni de conclusion.`;

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                return res.status(200).json({ question: data.choices[0].message.content.trim() });
            } else {
                return res.status(500).json({ error: "Erreur de réponse de l'IA Groq." });
            }
        }

        // 2. CORRECTION D'UNE RÉPONSE
        else if (action === 'correct') {
            const prompt = `Tu es un professeur correcteur du Brevet des collèges. Tu dois corriger la réponse d'un élève.
Matière : ${subject}
Format : ${format}
Question posée : ${question}
Réponse de l'élève : ${userAnswer}

Fournis une correction constructive et bienveillante en indiquant ce qui est bon et ce qui manque.
Tu dois IMPÉRATIVEMENT terminer ta correction par une note globale claire sous la forme exacte suivante à la toute fin : "Note : X/5" (remplace X par une note de 0 à 5 selon la qualité de la réponse).`;

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.5
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                return res.status(200).json({ correction: data.choices[0].message.content.trim() });
            } else {
                return res.status(500).json({ error: "Erreur lors de la correction par l'IA Groq." });
            }
        }

    } catch (err) {
        return res.status(500).json({ error: "Erreur interne du serveur de l'IA." });
    }
};
