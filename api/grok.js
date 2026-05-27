export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { action, subject, format, question, userAnswer } = req.body;
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "La clé API GROK_API_KEY est manquante." });
    }

    // Le dictionnaire complet du programme de Troisième pour forcer la variété
    const chapitresBrevet = {
        "Histoire": [
            "La Première Guerre mondiale et les bouleversements en Europe",
            "Les régimes totalitaires dans les années 1930 (Nazisme, Stalinisme)",
            "Le Front populaire en France",
            "La Seconde Guerre mondiale, une guerre d'anéantissement",
            "Le régime de Vichy, la Collaboration et la Résistance en France",
            "La Guerre froide et le monde bipolaire (Berlin, Cuba)",
            "La décolonisation et l'émergence du Tiers-Monde",
            "La construction européenne (des traités de Rome à Maastricht)",
            "La feuille de route de la Vème République (De Gaulle, Mitterrand, Chirac)",
            "Les grands enjeux mondiaux depuis 1989"
        ],
        "Géographie": [
            "Les aires urbaines en France et la métropolisation",
            "Les espaces productifs français (industriels, agricoles, touristiques)",
            "Les espaces de faible densité et leurs atouts",
            "Aménager le territoire français (transports, régions, inégalités)",
            "Les territoires ultra-marins français et leurs spécificités",
            "La France et l'Union européenne dans le monde (puissance d'influence)",
            "L'UE, un nouveau territoire d'intégration et de coopération"
        ],
        "EMC": [
            "Les valeurs, les principes et les symboles de la République française",
            "La citoyenneté française et européenne (droits et devoirs)",
            "Le vote et le parcours d'une loi en France",
            "La laïcité au collège et dans la société",
            "La Défense nationale et le rôle de l'ONU",
            "Les grands médias, l'information et l'esprit critique"
        ],
        "Sciences": [
            "Physique : Gravitation universelle, poids et masse",
            "Physique : L'énergie cinétique, potentielle et la sécurité routière",
            "Physique : Circuits électriques, tension, intensité et loi d'Ohm",
            "SVT : Le système nerveux, les neurones et les risques (sommeil, bruit)",
            "SVT : La génétique (ADN, chromosomes, gènes, allèles et caractères)",
            "SVT : Le système immunitaire, les microbes, vaccins et antibiotiques",
            "Techno : Les réseaux informatiques (IP, routeur, client/serveur)",
            "Techno : Algorithmes et programmation (capteurs, variables, boucles)"
        ]
    };

    try {
        let systemPrompt = "";
        let userPrompt = "";

        if (action === 'generate') {
            // On sélectionne la liste des chapitres selon la matière choisie par l'élève
            const listeChapitres = chapitresBrevet[subject] || [];
            // On pioche un chapitre totalement au hasard dans la liste
            const chapitreAlea = listeChapitres[Math.floor(Math.random() * listeChapitres.length)];

            systemPrompt = `Tu es un professeur d'histoire-gographie, EMC et sciences expert du Brevet des collèges. 
            Ton but absolu est de faire réviser l'ensemble du programme sans jamais te répéter.`;

            if (format === 'courte') {
                userPrompt = `Génère une question COURTE et très précise (type quiz de rapidité) obligatoirement sur ce thème précis du programme de troisième : "${chapitreAlea}". 
                La question doit exiger une réponse brève (une date, une définition, un nom ou une formule). Donne uniquement la question, sans introduction ni réponse.`;
            } else {
                userPrompt = `Génère un sujet de réflexion ou un développement construit (paragraphe rédigé) obligatoirement axé sur ce thème du programme : "${chapitreAlea}". 
                Le sujet doit pousser l'élève à argumenter. Donne uniquement l'énoncé du sujet, sans introduction.`;
            }
        } 
        else if (action === 'correct') {
            systemPrompt = `Tu es un correcteur officiel du Brevet des collèges. Tu dois corriger la réponse de l'élève de manière constructive, bienveillante mais rigoureuse. Donne une note claire (par exemple sur
