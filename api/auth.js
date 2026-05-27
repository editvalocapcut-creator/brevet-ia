import { createClient } from '@supabase/supabase-js';

// Alignement exact avec les noms de tes variables Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Gestion des headers CORS pour éviter les blocages du navigateur
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Récupération flexible des données (gère les minuscules et MAJUSCULES venant du HTML)
    const action = req.body.action;
    const pseudo = req.body.pseudo || req.body.Pseudo;
    const password = req.body.password || req.body.Password;
    const subject = req.body.subject || req.body.Subject;
    const score = req.body.score !== undefined ? req.body.score : req.body.Score;

    try {
        // 1. INSCRIPTION / CONNEXION AUTOMATIQUE
        if (action === 'login') {
            if (!pseudo || !password) {
                return res.status(400).json({ error: "Pseudo et mot de passe requis." });
            }

            // Recherche si l'utilisateur existe déjà
            const { data: user, error: fetchError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo)
                .maybeSingle(); // Évite de lever une exception si aucun utilisateur n'est trouvé

            if (fetchError) {
                return res.status(500).json({ error: "Erreur lors de la recherche de l'utilisateur." });
            }

            if (user) {
                // Vérification du mot de passe
                if (user.password === password) {
                    return res.status(200).json({ message: "Connexion réussie", user });
                } else {
                    return res.status(401).json({ error: "Mot de passe incorrect pour ce pseudo." });
                }
            } else {
                // Si l'utilisateur n'existe pas, on le crée automatiquement
                const { data: newUser, error: insertError } = await supabase
                    .from('classement_brevet')
                    .insert([{ 
                        pseudo, 
                        password, 
                        score_histoire: 0, 
                        score_geographie: 0, 
                        score_emc: 0, 
                        score_sciences: 0, 
                        score_total: 0 
                    }])
                    .select()
                    .single();

                if (insertError) {
                    return res.status(500).json({ error: "Impossible de créer le profil dans la table." });
                }

                return res.status(200).json({ message: "Inscription réussie", user: newUser });
            }
        }

        // 2. MISE À JOUR DES SCORES
        else if (action === 'updateScore') {
            if (!pseudo || pseudo === 'undefined') {
                return res.status(200).json({ message: "Score ignoré car l'utilisateur n'est pas connecté." });
            }

            // Récupérer le score actuel
            const { data: user, error: getError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo)
                .maybeSingle();

            if (getError || !user) {
                return res.status(404).json({ error: "Utilisateur introuvable." });
            }

            // Déterminer la colonne selon la matière
            let column = 'score_histoire';
            const cleanSubject = (subject || '').toLowerCase();
            if (cleanSubject.includes('géo')) column = 'score_geographie';
            if (cleanSubject.includes('emc')) column = 'score_emc';
            if (cleanSubject.includes('science')) column = 'score_sciences';

            const pointsToAdd = parseInt(score, 10) || 0;
            const newSubjectScore = (user[column] || 0) + pointsToAdd;
            const newTotalScore = (user.score_total || 0) + pointsToAdd;

            const { data: updatedUser, error: updateError } = await supabase
                .from('classement_brevet')
                .update({ 
                    [column]: newSubjectScore, 
                    score_total: newTotalScore 
                })
                .eq('pseudo', pseudo)
                .select()
                .single();

            if (updateError) {
                return res.status(500).json({ error: "Échec de l'enregistrement du score." });
            }

            return res.status(200).json({ message: "Score mis à jour !", user: updatedUser });
        }

        // 3. RÉCUPÉRATION DU TOP 10
        else if (action === 'getLeaderboard') {
            const { data: leaderboard, error: boardError } = await supabase
                .from('classement_brevet')
                .select('pseudo, score_histoire, score_geographie, score_emc, score_sciences, score_total')
                .order('score_total', { ascending: false })
                .limit(10);

            if (boardError) {
                return res.status(500).json({ error: "Impossible de charger le classement." });
            }

            return res.status(200).json(leaderboard);
        }

        return res.status(400).json({ error: "Action demandée inconnue." });

    } catch (err) {
        return res.status(500).json({ error: `Erreur serveur : ${err.message}` });
    }
}
