module.exports = async function (req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, pseudo, password, subject, score } = req.body;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: "Variables de configuration manquantes sur Vercel." });
    }

    async function querySupabase(endpoint, options = {}) {
        const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${endpoint}`;
        return await fetch(url, {
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
        if (action === 'login_register') {
            const checkRes = await querySupabase(`classement_brevet?pseudo=eq.${encodeURIComponent(pseudo)}`);
            const users = await checkRes.json();

            // Si l'utilisateur existe déjà
            if (Array.isArray(users) && users.length > 0) {
                if (String(users[0].password) === String(password)) {
                    return res.status(200).json({ message: "Connexion réussie", user: users[0] });
                } else {
                    return res.status(400).json({ error: "Ce pseudo est déjà pris. Veuillez entrer le bon mot de passe." });
                }
            } else {
                // Création d'un nouveau compte si le pseudo est libre
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
                const createdUser = Array.isArray(newUser) ? newUser[0] : newUser;
                return res.status(200).json({ message: "Compte créé !", user: createdUser || { pseudo, score_total: 0 } });
            }
        }

        else if (action === 'save_score') {
            const getRes = await querySupabase(`classement_brevet?pseudo=eq.${encodeURIComponent(pseudo)}`);
            const users = await getRes.json();
            if (!Array.isArray(users) || users.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });

            const user = users[0];
            const columnMap = { 
                "Histoire": "score_histoire", 
                "Géographie": "score_geographie", 
                "EMC": "score_emc", 
                "Sciences": "score_sciences" 
            };
            const column = columnMap[subject];
            if (!column) return res.status(400).json({ error: "Matière non valide." });

            const newMatiereScore = (parseInt(user[column]) || 0) + parseInt(score);
            const newTotalScore = (parseInt(user.score_total) || 0) + parseInt(score);

            const updateRes = await querySupabase(`classement_brevet?pseudo=eq.${encodeURIComponent(pseudo)}`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    [column]: newMatiereScore, 
                    score_total: newTotalScore 
                })
            });
            const updatedUser = await updateRes.json();
            return res.status(200).json({ message: "Score mis à jour", user: Array.isArray(updatedUser) ? updatedUser[0] : updatedUser });
        }

        else if (action === 'get_leaderboard') {
            const leadRes = await querySupabase('classement_brevet?select=*&order=score_total.desc&limit=10');
            const leaderboard = await leadRes.json();
            return res.status(200).json({ leaderboard: Array.isArray(leaderboard) ? leaderboard : [] });
        }

    } catch (err) {
        return res.status(500).json({ error: "Erreur lors de la communication avec la base de données." });
    }
};
