const { createClient } = require('@supabase/supabase-client');

// Initialisation de Supabase avec tes variables d'environnement Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function (req, res) {
    // Configuration des en-têtes CORS pour éviter les blocages de sécurité
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, pseudo, password, subject, score } = req.body;

    try {
        // ==========================================
        // 1. ACTION : CONNEXION / INSCRIPTION AUTOMATIQUE
        // ==========================================
        if (action === 'login') {
            // Recherche si l'utilisateur existe déjà
            const { data: user, error } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo)
                .single();

            if (error && error.code !== 'PGRST116') { // Ignorer l'erreur "aucun résultat"
                return res.status(500).json({ error: "Erreur lors de la recherche du pseudo." });
            }

            if (user) {
                // Si l'utilisateur existe, on vérifie le mot de passe
                if (user.password === password) {
                    return res.status(200).json({ user });
                } else {
                    return res.status(400).json({ error: "Mot de passe incorrect pour ce pseudo." });
                }
            } else {
                // Si l'utilisateur n'existe pas, on le crée proprement avec toutes ses matières à 0
                const { data: newUser, error: createError } = await supabase
                    .from('classement_brevet')
                    .insert([{ 
                        pseudo, 
                        password, 
                        score_histoire: 0, 
                        score_geographie: 0, 
                        score_emc: 0, 
                        score_sciences: 0,
                        score_mathematiques: 0, // Initialisé à 0
                        score_francais: 0,      // Initialisé à 0
                        score_total: 0 
                    }])
                    .select()
                    .single();

                if (createError) {
                    return res.status(500).json({ error: "Impossible de créer ce nouveau compte." });
                }
                return res.status(200).json({ user: newUser });
            }
        }

        // ==========================================
        // 2. ACTION : METTRE À JOUR LE SCORE D'UNE MATIÈRE
        // ==========================================
        else if (action === 'updateScore') {
            // Récupérer d'abord les scores actuels de l'élève
            const { data: user, error: fetchError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo)
                .single();

            if (fetchError || !user) {
                return res.status(404).json({ error: "Utilisateur introuvable pour la mise à jour." });
            }

            // Déterminer dynamiquement quelle colonne de ta table Supabase modifier
            let columnToUpdate = '';
            if (subject === 'histoire') columnToUpdate = 'score_histoire';
            else if (subject === 'géographie') columnToUpdate = 'score_geographie';
            else if (subject === 'emc') columnToUpdate = 'score_emc';
            else if (subject === 'sciences') columnToUpdate = 'score_sciences';
            else if (subject === 'mathematiques') columnToUpdate = 'score_mathematiques'; // Ajouté !
            else if (subject === 'francais') columnToUpdate = 'score_francais';           // Ajouté !
            else {
                columnToUpdate = 'score_histoire'; // Sécurité par défaut
            }

            // On ajoute les nouveaux points au score déjà existant dans cette matière
            const currentSubjectScore = user[columnToUpdate] || 0;
            const newSubjectScore = currentSubjectScore + parseInt(score);

            // On recalcule le score total général en incluant absolument TOUTES les matières
            const newScoreTotal = 
                (columnToUpdate === 'score_histoire' ? newSubjectScore : (user.score_histoire || 0)) +
                (columnToUpdate === 'score_geographie' ? newSubjectScore : (user.score_geographie || 0)) +
                (columnToUpdate === 'score_emc' ? newSubjectScore : (user.score_emc || 0)) +
                (columnToUpdate === 'score_sciences' ? newSubjectScore : (user.score_sciences || 0)) +
                (columnToUpdate === 'score_mathematiques' ? newSubjectScore : (user.score_mathematiques || 0)) +
                (columnToUpdate === 'score_francais' ? newSubjectScore : (user.score_francais || 0));

            // Enregistrement des nouvelles valeurs calculées dans Supabase
            const updateData = {};
            updateData[columnToUpdate] = newSubjectScore;
            updateData['score_total'] = newScoreTotal;

            const { data: updatedUser, error: updateError } = await supabase
                .from('classement_brevet')
                .update(updateData)
                .eq('pseudo', pseudo)
                .select()
                .single();

            if (updateError) {
                return res.status(500).json({ error: "Échec de l'enregistrement des points." });
            }

            return res.status(200).json({ user: updatedUser });
        }

        // ==========================================
        // 3. ACTION : RÉCUPÉRER LE LEADERBOARD (TOP 10)
        // ==========================================
        else if (action === 'getLeaderboard') {
            const { data: leaderboard, error: leadError } = await supabase
                .from('classement_brevet')
                .select('*')
                .order('score_total', { ascending: false })
                .limit(10);

            if (leadError) {
                return res.status(500).json({ error: "Impossible de charger le classement." });
            }

            return res.status(200).json(leaderboard);
        }

    } catch (err) {
        return res.status(500).json({ error: `Erreur interne serveur : ${err.message}` });
    }
};
