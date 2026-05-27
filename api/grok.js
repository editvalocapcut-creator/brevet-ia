export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { action, subject, format, question, userAnswer } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "La clé API GROK_API_KEY est manquante dans Vercel." });
    }

    // Liste officielle du brevet pour guider l'IA sans jamais qu'elle ne se répète
    const chapitresBrevet = {
        "Histoire": [
            "La Première Guerre mondiale et les tranchées",
            "Les régimes totalitaires des années 1930 (Staline, Hitler)",
            "Le Front populaire en France",
            "La Seconde Guerre mondiale et la collaboration ou Résistance en France",
            "La Guerre froide, l'Allemagne et Berlin",
            "La décolonisation et l'émergence du Tiers-Monde",
            "La construction européenne des débuts à Maastricht",
            "La Vème République de De Gaulle à nos jours"
        ],
        "Géographie": [
            "Les aires urbaines et la métropolisation en France",
            "Les espaces productifs français (agricole, industriel, touristique)",
            "Les espaces de faible densité et leurs atouts",
            "Aménager le territoire français et réduire les inégalités",
            "Les territoires ultra-marins français",
            "La France et l'Union européenne dans le monde moderne"
        ],
        "EMC": [
            "Les valeurs, principes et symboles de la République",
            "La citoyenneté française et le droit de vote",
            "La laïcité au collège et dans la société républicaine",
            "La Défense nationale, la JDC et le rôle de l'ONU",
            "Médias, fake news et développement de l'esprit critique"
        ],
        "Sciences": [
            "Physique : Gravitation universelle, différence poids et masse",
            "Physique : Énergie cinétique, conversions et sécurité routière",
            "Physique : Circuits électriques, intensité, tension et loi d'Ohm",
            "SVT : Le système nerveux, messages argentiques et risques liés au bruit",
            "SVT : Génétique, chromosomes, ADN, gènes et allèles",
            "SVT : Système immunitaire, infections, lymphocytes, vaccins et antibiotiques",
            "Techno : Réseaux informatiques, adresse IP, architecture client-serveur",
            "Techno : Algorithmes, programmation scratch, variables et capteurs"
        ]
    };

    try {
        let systemPrompt = "";
        let userPrompt = "";

        if (action === 'generate') {
            const listeChapitres = chapitresBrevet[subject] || [];
            const chapitreAlea = listeChapitres[Math.floor(Math.random() * listeChapitres.length)];

            systemPrompt = `Tu es un professeur expert du Brevet des collèges. Ton but est de générer des questions d'examen uniques pour faire réviser la totalité du programme. Ne te répète jamais.`;

            if (format === 'courte') {
                userPrompt = `Génère une question de cours COURTE et super précise sur ce thème de 3ème : "${chapitreAlea}". La question doit demander un élément court (une date, une définition, une formule). Donne uniquement la question, sans introduction ni formule de politesse.`;
            } else {
                userPrompt = `Génère un sujet de réflexion ou développement construit détaillé sur ce thème de 3ème : "${chapitreAlea}". L'élève devra rédiger un paragraphe argumenté. Donne uniquement l'énoncé du sujet.`;
            }
        } 
        else if (action === 'correct') {
            systemPrompt = `Tu es un correcteur officiel du Brevet. Corrige la réponse de l'élève de manière constructive et rigoureuse. Donne une note sur 5 points, les points positifs, les manques et la correction idéale.`;

            if (format === 'courte') {
                userPrompt = `Matière : ${subject}\nQuestion posée : ${question}\nRéponse de l'élève : ${userAnswer}\n\nFais une correction rapide.`;
            } else {
                userPrompt = `Matière : ${subject}\nQuestion posée : ${question}\nRéponse de l'élève : ${userAnswer}\n\nAnalyse la structure et les arguments historiques ou scientifiques.`;
            }
        }

        // CORRIGÉ : On appelle le vrai modèle de Groq Cloud !
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', // Le modèle officiel et fonctionnel de ta plateforme
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.9, // Très haut pour assurer un renouvellement complet des questions
                presence_penalty: 0.7
            })
        });

        const groqData = await groqResponse.json();
        
        if (groqData.error) {
            console.error("Erreur Groq :", groqData.error);
            return res.status(500).json({ error: groqData.error.message });
        }

        const responseText = groqData.choices[0].message.content;

        if (action === 'generate') {
            return res.status(200).json({ question: responseText });
        } else {
            return res.status(200).json({ correction: responseText });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
}
