export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { action, subject, format, question, userAnswer } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "La clé API GROK_API_KEY est manquante dans les variables d'environnement." });
    }

    try {
        let systemPrompt = "";
        let userPrompt = "";

        // ACTION 1 : GÉNÉRATION DE QUESTION
        if (action === 'generate') {
            systemPrompt = `Tu es un professeur d'histoire-gographie, EMC et sciences expert du diplôme du Brevet des collèges français. 
            Ton but est de générer une question unique, parfaitement conforme au programme de troisième.`;

            if (format === 'courte') {
                userPrompt = `Génère une question COURTE et directe (type quiz ou flashcard) sur la matière suivante : ${subject}. 
                La question doit demander une réponse précise (une date, un mot-clé, une définition simple ou une formule). Ne donne pas la réponse.`;
            } else {
                userPrompt = `Génère un sujet de réflexion ou une question APPROFONDIE (type développement construit ou étude de document) sur la matière suivante : ${subject}. 
                La question doit demander à l'élève de structurer son argumentation et de rédiger un paragraphe. Ne donne pas la réponse.`;
            }
        } 
        
        // ACTION 2 : CORRECTION DE LA RÉPONSE
        else if (action === 'correct') {
            systemPrompt = `Tu es un correcteur officiel du Brevet des collèges. Tu dois corriger la réponse de l'élève de manière constructive, bienveillante mais rigoureuse.
            Donne une note claire (par exemple sur 5 points) adaptée aux exigences du format demandé, liste les points forts, ce qui manque (les mots-clés, les dates ou arguments indispensables) et propose une correction idéale complète.`;

            if (format === 'courte') {
                userPrompt = `Matière : ${subject}
                Format attendu : Réponse courte et précise.
                Question posée : ${question}
                Réponse de l'élève : ${userAnswer}
                
                Évalue si la réponse courte est correcte. Sois direct et rapide dans ta correction (pas besoin d'exiger un grand paragraphe).`;
            } else {
                userPrompt = `Matière : ${subject}
                Format attendu : Développement construit / Réponse rédigée et argumentée.
                Question posée : ${question}
                Réponse de l'élève : ${userAnswer}
                
                Évalue la structure du paragraphe, la présence d'arguments historiques/scientifiques, de connecteurs logiques et la précision du vocabulaire.`;
            }
        }

        // Appel à l'API de Groq (X.AI)
        const groqResponse = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'grok-2-latest', // Utilisation du modèle stable recommandé en 2026
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7
            })
        });

        const groqData = await groqResponse.json();
        const responseText = groqData.choices[0].message.content;

        if (action === 'generate') {
            return res.status(200).json({ question: responseText });
        } else {
            return res.status(200).json({ correction: responseText });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erreur lors de la communication avec l'IA." });
    }
}
