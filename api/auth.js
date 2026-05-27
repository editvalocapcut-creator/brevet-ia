import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.body.action;
    const pseudo = req.body.pseudo || req.body.Pseudo;
    const password = req.body.password || req.body.Password;
    const subject = req.body.subject || req.body.Subject;
    const score = req.body.score !== undefined ? req.body.score : req.body.Score;

    try {
        if (action === 'login') {
            if (!pseudo || !password) {
                return res.status(400).json({ error: "Pseudo et mot de passe requis." });
            }

            const { data: users, error: fetchError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo);

            if (fetchError) {
                return res.status(500).json({ error: "Erreur de liaison avec la base de données", details: fetchError.message });
            }

            const user = users && users.length > 0 ? users[0] : null;

            if (user) {
                if (user.password === password) {
                    return res.status(200).json({ message: "Connexion réussie", user });
                } else {
                    return res.status(401).json({ error: "Mot de passe incorrect pour ce pseudo." });
                }
            } else {
                const { data: insertedData, error: insertError } = await supabase
                    .from('classement_brevet')
                    .insert([{ 
                        pseudo, 
                        password, 
                        score_histoire: 0, 
                        score_geographie: 0, 
                        score_emc: 0, 
                        score_sciences: 0, 
                        score_mathematiques: 0, // Ajouté pour l'initialisation
                        score_francais: 0,      // Ajouté pour l'initialisation
                        score_total: 0 
                    }])
                    .select();

                if (insertError) {
                    return res.status(500).json({ error: "Création de compte impossible", details: insertError.message });
                }

                const newUser = insertedData && insertedData.length > 0 ? insertedData[0] : { pseudo, score_total: 0 };
                return res.status(200).json({ message: "Inscription réussie", user: newUser });
            }
        }

        else if (action === 'updateScore') {
            if (!pseudo || pseudo === 'undefined') {
                return res.status(200).json({ message: "Score ignoré car l'utilisateur n'est pas connecté." });
            }

            const { data: users, error: getError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo);

            if (getError || !users || users.length === 0) {
                return res.status(404).json({ error: "Utilisateur introuvable." });
            }

            const user = users[0];
            let column = 'score_histoire';
            const cleanSubject = (subject || '').toLowerCase();
            
            if (cleanSubject.includes('géo')) column = 'score_geographie';
            if (cleanSubject.includes('emc')) column = 'score_emc';
            if (cleanSubject.includes('science')) column = 'score_sciences';
            if (cleanSubject.includes('math')) column = 'score_mathematiques'; // Détection des Maths
            if (cleanSubject.includes('franc') || cleanSubject.includes('français')) column = 'score_francais'; // Détection du Français

            const pointsToAdd = parseInt(score, 10) || 0;
            const newSubjectScore = (user[column] || 0) + pointsToAdd;
            const newTotalScore = (user.score_total || 0) + pointsToAdd;

            const { data: updatedData, error: updateError } = await supabase
                .from('classement_brevet')
                .update({ 
                    [column]: newSubjectScore, 
                    score_total: newTotalScore 
                })
                .eq('pseudo', pseudo)
                .select();

            if (updateError) {
                return res.status(500).json({ error: "Échec de l'enregistrement du score." });
            }

            return res.status(200).json({ message: "Score mis à jour !", user: updatedData[0] });
        }

        else if (action === 'getLeaderboard') {
            const { data: leaderboard, error: boardError } = await supabase
                .from('classement_brevet')
                .select('pseudo, score_histoire, score_geographie, score_emc, score_sciences, score_mathematiques, score_francais, score_total') // Colonnes ajoutées pour le leaderboard
                .order('score_total', { ascending: false })
                .limit(10);

            if (boardError) {
                return res.status(500).json({ error: "Impossible de charger le classement." });
            }

            return res.status(200).json(leaderboard);
        }

        return res.status(400).json({ error: "Action demandée inconnue." });

    } catch (err) {
        return res.status(500).json({ error: "Erreur critique serveur", details: err.message });
    }
}
