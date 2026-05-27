import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Configuration des en-têtes CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Récupération des données (on accepte les variables en MAJUSCULES ou minuscules pour éviter les conflits avec ton HTML)
    const action = req.body.action;
    const pseudo = req.body.pseudo || req.body.Pseudo;
    const password = req.body.password || req.body.Password;
    const subject = req.body.subject || req.body.Subject;
    const score = req.body.score !== undefined ? req.body.score : req.body.Score;

    try {
        // 1. ACTION : CONNEXION OU INSCRIPTION
        if (action === 'login') {
            if (!pseudo || !password) {
                return res.status(400).json({ error: "Pseudo et mot de passe requis." });
            }

            const { data: user, error: fetchError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo)
                .maybeSingle(); // Plus propre que single() pour éviter de lever une erreur si l'utilisateur n'existe pas

            if (fetchError) {
                return res.status(500).json({ error: "Erreur de communication avec la base de données." });
            }

            if (user) {
                if (user.password === password) {
                    return res.status(200).json({ message: "Connexion réussie", user });
                } else {
                    return res.status(401).json({ error: "Mot de passe incorrect." });
                }
            } else {
                // Inscription automatique si le pseudo est libre
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
                    return res.status(500).json({ error: "Impossible de créer le joueur dans la base de données." });
                }

                return res.status(200).json({ message: "Inscription réussie", user: newUser });
            }
        }

        // 2. ACTION : ENREGISTRER UN SCORE
        else if (action === 'updateScore') {
            // Sécurité : si le site envoie "undefined" à cause d'un bug de session, on ne bloque pas l'application
            if (!pseudo || pseudo === 'undefined') {
                return res.status(200).json({ message: "Score ignoré car l'utilisateur n'est pas connecté." });
            }

            const { data: user, error: getError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo)
                .maybeSingle();

            if (getError || !user) {
                return res.status(404).json({ error: "Utilisateur introuvable pour la mise à jour." });
            }

            // Détection automatique de la bonne colonne de score
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
                return res.status(500).json({ error: "Échec de l'enregistrement du score dans Supabase." });
            }

            return res.status(200).json({ message: "Score mis à jour !", user: updatedUser });
        }

        // 3. ACTION : CHARGER LE TOP 10
        else if (action === 'getLeaderboard') {
            const { data: leaderboard, error: boardError } = await supabase
                .from('classement_brevet')
                .select('pseudo, score_histoire, score_geographie, score_emc, score_sciences, score_total')
                .order('score_total', { ascending: false })
                .limit(10);

            if (boardError) {
                return res.status(500).json({ error: "Impossible de récupérer le classement général." });
            }

            return res.status(200).json(leaderboard);
        }

        return res.status(400).json({ error: "Action non reconnue." });

    } catch (err) {
        return res.status(500).json({ error: `Erreur interne : ${err.message}` });
    }
}
