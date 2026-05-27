module.exports = async function (req, res) {
    // Gestion des accès CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, pseudo, password, subject, score } = req.body;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: "Variables Supabase manquantes dans Vercel." });
    }

    // Fonction pour communiquer avec Supabase
    async function querySupabase(endpoint, options = {}) {
        return await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            ...options
        });
    }

    try {
        // 1. CONNEXION OU INSCRIPTION SÉCURISÉE
        if (action === 'login_register') {
            const checkRes = await querySupabase(`classement_brevet?pseudo=eq.${encodeURIComponent(pseudo)}`);
            const users = await checkRes.json();

            if (users.length > 0) {
                // Le pseudo existe déjà ! On vérifie si le mot de passe est bon
                if (users[0].password === password) {
                    return res.status(200).json({ message: "Connexion réussie", user: users[0] });
                } else {
                    // C'est ici qu'on bloque l'utilisateur si le mdp est faux
                    return res.status(400).json({ error: "Ce pseudo est déjà pris. Veuillez entrer le bon mot de passe." });
                }
            } else {
                // Le pseudo n'existe pas, on crée le compte proprement
                const createRes = await querySupabase('classement_brevet', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        pseudo, 
                        password, 
                        score_histoire: 0, 
                        score_geographie: 0, 
                        score_emc: 0, 
                        score_sciences: 0, 
                        score_total: 0 
                    })
                });
                const newUser = await createRes.json();
                return res.status(200).json({ message: "Compte créé !", user: newUser[0] });
            }
        }

        // 2. ENREGISTRER LES POINTS APRÈS UNE CORRECTION
        else if (action === 'save_score') {
            const getRes = await querySupabase(`classement_brevet?pseudo=eq.${encodeURIComponent(pseudo)}`);
            const users = await getRes.json();
            if (users.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });

            const user = users[0];
            const columnMap = { 
                "Histoire": "score_histoire", 
                "Géographie": "score_geographie", 
                "EMC": "score_emc", 
                "Sciences": "score_sciences" 
            };
            const column = columnMap[subject];

            if (!column) return res.status(400).json({ error: "Matière inconnue" });

            const newMatiereScore = (user[column] || 0) + score;
            const newTotalScore = (user.score_total || 0) + score;

            const updateRes = await querySupabase(`classement_brevet?pseudo=eq.${encodeURIComponent(pseudo)}`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    [column]: newMatiereScore, 
                    score_total: newTotalScore 
                })
            });
            const updatedUser = await updateRes.json();
            return res.status(200).json({ message: "Score mis à jour", user: updatedUser[0] });
        }

        // 3. CHARGER LE TOP 10 POUR LE CLASSEMENT
        else if (action === 'get_leaderboard') {
            const leadRes = await querySupabase('classement_brevet?order=score_total.desc&limit=10');
            const leaderboard = await leadRes.json();
            return res.status(200).json({ leaderboard });
        }

    } catch (err) {
        return res.status(500).json({ error: "Erreur serveur lors de la requête de base de données." });
    }
};
