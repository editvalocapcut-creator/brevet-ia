const programmeStrictBrevet = {
    "Histoire": [
        "La Première Guerre mondiale : les dates (1914-1918), la bataille de Verdun (1916), l'armistice (11 novembre 1918), le génocide des Arméniens et la vie des poilus dans les tranchées.",
        "Les régimes totalitaires : l'URSS de Staline (collectivisation, goulag, culte de la personnalité) et l'Allemagne nazie d'Hitler (antisémitisme, lois de Nuremberg, embrigadement de la jeunesse).",
        "La Seconde Guerre mondiale : les dates (1939-1945), la libération, l'effondrement de la France en 1940, le régime de Vichy (Pétain, collaboration, rafle du Vél d'Hiv) et la Résistance (De Gaulle, Jean Moulin, CNR).",
        "La Guerre froide : l'Europe coupée en deux, le mur de Berlin (1961-1989), le bloc de l'Est et de l'Ouest.",
        "La décolonisation : l'accès à l'indépendance (ex: l'Inde ou l'Algérie) et la création de nouveaux États.",
        "La Vème République : la constitution de 1958 créée par Charles de Gaulle, l'alternance politique (Mitterrand en 1981) et les institutions actuelles.",
        "La construction européenne : les étapes clés (le traité de Rome en 1957, le traité de Maastricht en 1992, l'adoption de l'euro)."
    ],
    "Géographie": [
        "Les aires urbaines en France : la mondialisation, la périurbanisation, l'étalement urbain, les centres-villes et les banlieues.",
        "Les espaces productifs : les espaces agricoles (spécialisation, exportation), industriels (reconversion, haute technologie) et touristiques (littoraux, parcs, montagnes).",
        "Les espaces de faible densité : les campagnes, la diagonale du vide, les atouts touristiques, le néoruralisme et l'agriculture dynamique.",
        "L'aménagement du territoire : le rôle de l'État et des régions pour réduire les inégalités, les transports (LGV) et les parcs nationaux.",
        "Les territoires ultra-marins (DROM-COM) : l'éloignement, l'insularité, la biodiversité, et l'intégration régionale.",
        "La France et l'UE dans le monde : la puissance culturelle (francophonie), militaire, économique."
    ],
    "EMC": [
        "Les principes de la République : la République française est indivisible, laïque, démocratique et sociale. Sa devise, son drapeau, son hymne.",
        "La citoyenneté : comment devenir citoyen français, les droits civils, politiques (droit de vote) et sociaux, et les devoirs.",
        "La laïcité : le respect des croyances, la neutralité de l'État et de l'école (loi de 2004 sur les signes religieux).",
        "La vie démocratique : la séparation des pouvoirs (législatif, exécutif, judiciaire), le rôle du Parlement et la fabrication d'une loi.",
        "La Défense nationale : le rôle de l'armée française, les missions de paix, la Journée Défense et Citoyenneté (JDC)."
    ],
    "Sciences": [
        "Physique-Chimie : La gravitation universelle, l'interaction gravitationnelle, la relation entre le poids et la masse (P = m x g).",
        "Physique-Chimie : L'énergie cinétique, l'énergie potentielle, la distance de freinage et la sécurité routière.",
        "Physique-Chimie : L'électricité, l'intensité, la tension, la résistance et la loi d'Ohm (U = R x I).",
        "SVT : La génétique, les chromosomes, l'ADN, les gènes, les allèles (dominants et récessifs), et la transmission des caractères.",
        "SVT : Le système immunitaire, la contamination, l'infection par les micro-organismes, les anticorps, les leucocytes, la vaccination et les antibiotiques.",
        "SVT : Le système nerveux, la communication nerveuse, les récepteurs sensoriels et les risques liés aux drogues ou au bruit.",
        "Technologie : L'informatique et la programmation (algorithmes, blocs Scratch, variables, boucles, conditions 'si... alors').",
        "Technologie : Les réseaux informatiques, les composants d'un réseau (routeur, commutateur, Wi-Fi) et l'adresse IP."
    ]
};

// Utilisation du format classique "module.exports" pour régler le bug Vercel
module.exports = async function (req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { action, subject, format, question, userAnswer } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "La clé API GROK_API_KEY est manquante." });
    }

    try {
        let systemPrompt = "";
        let userPrompt = "";

        if (action === 'generate') {
            const listeNotions = programmeStrictBrevet[subject] || [];
            const notionCible = listeNotions[Math.floor(Math.random() * listeNotions.length)];

            systemPrompt = `Tu es un professeur d'école très rigoureux préparant tes élèves au diplôme du Brevet des collèges français (élèves de 14-15 ans). Tu te bases STRICTEMENT sur le programme officiel de troisième. Tu ne t'éloignes jamais de ces thèmes. Tu es créatif et tu formules des questions uniques à chaque fois.`;

            if (format === 'courte') {
                userPrompt = `En te basant sur ce repère officiel du Brevet : "${notionCible}", génère une question COURTE et directe (type flashcard ou quiz). La question doit appeler une réponse précise (une date, une formule, un mot de vocabulaire). Donne uniquement l'énoncé de la question, sans introduction, sans salutations et sans donner la réponse.`;
            } else {
                userPrompt = `En te basant sur ce repère officiel du Brevet : "${notionCible}", génère un sujet de développement construit ou de réflexion rédigée. L'élève devra y répondre en structurant ses connaissances. Donne uniquement l'énoncé du sujet, pas d'introduction.`;
            }
        } 
        else if (action === 'correct') {
            systemPrompt = `Tu es un correcteur officiel du Brevet des collèges. Tu appliques le barème officiel avec bienveillance mais fermeté. Donne une note sur 5, liste les points forts, ce qu'il manque pour avoir le maximum de points, et propose la correction idéale complète.`;

            if (format === 'courte') {
                userPrompt = `Matière : ${subject}\nQuestion posée : ${question}\nRéponse de l'élève : ${userAnswer}\n\nFais une correction rapide et donne la réponse attendue au Brevet.`;
            } else {
                userPrompt = `Matière : ${subject}\nQuestion posée : ${question}\nRéponse de l'élève : ${userAnswer}\n\nAnalyse la structure, les arguments et la présence des mots-clés de Troisième.`;
            }
        }

        // Requête sur le modèle recommandé et mis à jour de Groq
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', // Le bon modèle mis à jour
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.85,
                presence_penalty: 0.6
            })
        });

        const groqData = await groqResponse.json();
        
        if (groqData.error) {
            console.error("Erreur Groq Cloud :", groqData.error);
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
};
