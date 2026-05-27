export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { action, subject, format, question, userAnswer } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "La clé API GROK_API_KEY est manquante." });
    }

    // Le dictionnaire strict du programme officiel de Troisième (Repères du Brevet)
    const programmeStrictBrevet = {
        "Histoire": [
            "La Première Guerre mondiale : les dates (1914-1918), la bataille de Verdun (1916), l'armistice (11 novembre 1918), le génocide des Arméniens et la vie des poilus dans les tranchées.",
            "Les régimes totalitaires : l'URSS de Staline (collectivisation, goulag, culte de la personnalité) et l'Allemagne nazie d'Hitler (antisémitisme, lois de Nuremberg, embrigadement de la jeunesse).",
            "La Seconde Guerre mondiale : les dates (1939-1945), la libération, l'effondrement de la France en 1940, le régime de Vichy (Pétain, collaboration, rafle du Vél d'Hiv) et la Résistance (De Gaulle, Jean Moulin, CNR).",
            "La Guerre froide : l'Europe coupée en deux, le mur de Berlin (1961-1989), le bloc de l'Est et de l'Ouest, et la fin de la Guerre froide.",
            "La décolonisation : l'accès à l'indépendance (ex: l'Inde ou l'Algérie) et la création de nouveaux États.",
            "La Vème République : la constitution de 1958 créée par Charles de Gaulle, l'alternance politique (Mitterrand en 1981) et les institutions actuelles (Président, Assemblée nationale).",
            "La construction européenne : les étapes clés (le traité de Rome en 1957, le traité de Maastricht en 1992, l'adoption de l'euro)."
        ],
        "Géographie": [
            "Les aires urbaines en France : la mondialisation, la périurbanisation, l'étalement urbain, les centres-villes et les banlieues.",
            "Les espaces productifs : les espaces agricoles (spécialisation, exportation), industriels (reconversion, haute technologie) et touristiques (littoraux, parcs, montagnes).",
            "Les espaces de faible densité : les campagnes, la diagonale du vide, les atouts touristiques, le néoruralisme et l'agriculture dynamique.",
            "L'aménagement du territoire : le rôle de l'État et des régions pour réduire les inégalités, les transports (LGV) et les parcs nationaux.",
            "Les territoires ultra-marins (DROM-COM) : l'éloignement, l'insularité, la biodiversité, et l'intégration dans leur environnement régional.",
            "La France et l'UE dans le monde : la puissance culturelle (francophonie), militaire, économique et la présence de la France sur les mers."
        ],
        "EMC": [
            "Les principes de la République : la République française est indivisible, laïque, démocratique et sociale. Sa devise, son drapeau, son hymne.",
            "La citoyenneté : comment devenir citoyen français, les droits civils, politiques (droit de vote) et sociaux, et les devoirs (impôts, obéissance aux lois).",
            "La laïcité : le respect des croyances, la neutralité de l'État et de l'école (loi de 2004 sur les signes religieux).",
            "La vie démocratique : la séparation des pouvoirs (législatif, exécutif, judiciaire), le rôle du Parlement et la fabrication d'une loi.",
            "La Défense nationale : le rôle de l'armée française, les missions de paix, la Journée Défense et Citoyenneté (JDC)."
        ],
        "Sciences": [
            "Physique-Chimie : La gravitation universelle, l'interaction gravitationnelle, la relation entre le poids et la masse ($$P = m \times g$$).",
            "Physique-Chimie : L'énergie cinétique ($$E_c = \\frac{1}{2}m v^2$$), l'énergie potentielle, la distance de freinage et la sécurité routière.",
            "Physique-Chimie : L'électricité, l'intensité, la tension, la résistance et la loi d'Ohm ($$U = R \times I$$).",
            "SVT : La génétique, les chromosomes, l'ADN, les gènes, les allèles (dominants et récessifs), et la transmission des caractères.",
            "SVT : Le système immunitaire, la contamination, l'infection par les micro-organismes (virus, bactéries), les anticorps, les leucocytes, la vaccination et les antibiotiques.",
            "SVT : Le système nerveux, la communication nerveuse (cerveau, moelle épinière, nerfs), les récepteurs sensoriels et les risques liés aux drogues ou au bruit.",
            "Technologie : L'informatique et la programmation (algorithmes, blocs Scratch, variables, boucles, conditions 'si... alors').",
            "Technologie : Les réseaux informatiques, les composants d'un réseau (routeur, commutateur, borne Wi-Fi) et la notion d'adresse IP."
        ]
    };

    try {
        let systemPrompt = "";
        let userPrompt = "";

        if (action === 'generate') {
            const listeNotions = programmeStrictBrevet[subject] || [];
            // Sélection aléatoire d'un point strict du programme
            const notionCible = listeNotions[Math.floor(Math.random() * listeNotions.length)];

            systemPrompt = `Tu es un professeur d'école pointilleux préparant ses élèves au diplôme du Brevet des collèges français. 
            Tu ne dois JAMAIS sortir du programme officiel de troisième. Tes questions doivent être claires et adaptées à un élève de 14-15 ans.`;

            if (format === 'courte') {
                userPrompt = `En te basant strictement sur ce repère officiel du Brevet : "${notionCible}", génère une question COURTE et directe (type flashcard).
                La question doit appeler une réponse précise (une date, une formule, un mot de vocabulaire). Donne uniquement la question, pas d'introduction, pas de réponse.`;
            } else {
                userPrompt = `En te basant strictement sur ce repère officiel du Brevet : "${notionCible}", génère un sujet de développement construit ou de réflexion rédigée.
                Le sujet doit inviter l'élève à structurer ses connaissances comme à l'examen. Donne uniquement l'énoncé du sujet.`;
            }
        } 
        else if (action === 'correct') {
            systemPrompt = `Tu es un correcteur officiel du Brevet des collèges. Tu appliques le barème officiel de manière bienveillante mais rigoureuse. Tu dois donner une note sur 5, lister les points acquis, ce qui manque pour avoir tous
