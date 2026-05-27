export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { action, subject, format, question, userAnswer } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "La clé API GROK_API_KEY est manquante dans les variables d'environnement Vercel." });
    }

    try {
        let systemPrompt = "";
        let userPrompt = "";

        if (action === 'generate') {
            systemPrompt = `Tu es un professeur d'histoire-géographie, EMC et sciences expert du diplôme du Brevet des collèges français. Ton but est de générer une question unique, parfaitement conforme au programme de troisième.`;

            if (format === 'courte') {
                userPrompt = `Génère une question COURTE et directe (type quiz ou flashcard) sur la matière suivante : ${subject}. La question doit demander une réponse précise (une date, un mot-clé, une définition simple ou une formule). Donne uniquement la question, sans aucune autre phrase d'introduction ni la réponse.`;
            } else {
                userPrompt = `Génère un sujet de réflexion ou une question APPROFONDIE (type développement construit ou étude de document) sur la matière suivante : ${subject}. La question doit demander à l'élève de structurer son argumentation et de rédiger un paragraphe. Donne uniquement le sujet, sans aucune autre phrase d'introduction.`;
            }
        } 
        else if (action === 'correct') {
            systemPrompt = `Tu es un correcteur officiel du Brevet des collèges. Tu dois corriger la réponse de l'élève de manière constructive, bienveillante mais rigoureuse. Donne une note claire (par exemple sur 5 points), liste les points forts, ce qui manque et propose une correction idéale complète.`;

            if (format === 'courte') {
                userPrompt = `Matière : ${subject}\nFormat attendu : Réponse courte.\nQuestion posée : ${question}\nRéponse de l'élève : ${userAnswer}\n\nÉvalue si la réponse courte est correcte de manière directe et rapide.`;
            } else {
                userPrompt = `Matière : ${subject}\nFormat attendu : Développement construit.\nQuestion posée : ${question}\nRéponse de l'élève : ${userAnswer}\n\nÉvalue la structure, les arguments et la précision du vocabulaire.`;
            }
        }

        // Appel sécurisé à Groq Cloud
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', // Modèle standard ultra-stable sur Groq Cloud
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7
            })
        });

        const groqData = await groqResponse.json();
        
        // Si Groq renvoie une erreur (clé invalide, modèle introuvable...), on l'affiche dans les logs
        if (groqData.error) {
            console.error("Erreur reçue de Groq Cloud :", groqData.error);
            return res.status(500).json({ error: groqData.error.message });
        }

        if (!groqData.choices || !groqData.choices[0] || !groqData.choices[0].message) {
            console.error("Structure de réponse inattendue :", groqData);
            return res.status(500).json({ error: "Structure de réponse de l'API invalide." });
        }

        const responseText = groqData.choices[0].message.content;

        if (action === 'generate') {
            return res.status(200).json({ question: responseText });
        } else {
            return res.status(200).json({ correction: responseText });
        }

    } catch (error) {
        console.error("Erreur crash handler :", error);
        return res.status(500).json({ error: "Erreur serveur interne." });
    }
}
