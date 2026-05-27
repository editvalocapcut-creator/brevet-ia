import { createClient } from '@supabase/supabase-js';

// Alignement exact avec les noms de tes variables Vercel visibles sur ta capture d'écran
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

    const { action, pseudo, password, subject, score } = req.body;

    try {
        // 1. INSCRIPTION / CONNEXION AUTOMATIQUE
        if (action === 'login') {
            if (!pseudo || !password) {
                return res.status(400).json({ error: "Pseudo et mot de passe requis." });
            }

            // On cherche si l'utilisateur existe déjà
            const { data: user, error: fetchError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 signifie "non trouvé", ce qui est normal pour une inscription
                return res.status(500).json({ error: "Erreur lors de la recherche de l'utilisateur." });
            }

            if (user) {
                // Si l'utilisateur existe, on vérifie le mot de passe simple
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
                    return res.status(500).json({ error: "Impossible de créer le profil. Vérifie que la table classement_brevet ou ses colonnes sont bien configurées." });
                }

                return res.status(200).json({ message: "Inscription réussie", user: newUser });
            }
        }

        // 2. MISE À JOUR DES SCORES APRÈS UNE CORRECTION
        else if (action === 'updateScore') {
            if (!pseudo || !subject || score === undefined) {
                return res.status(400).json({ error: "Données manquantes pour la mise à jour." });
            }

            // Récupérer le score actuel
            const { data: user, error: getError } = await supabase
                .from('classement_brevet')
                .select('*')
                .eq('pseudo', pseudo)
                .single();

            if (getError || !user) {
                return res.status(404).json({ error: "Utilisateur introuvable." });
            }

            // Déterminer quelle colonne modifier selon la matière reçue
            let column = 'score_histoire';
            if (subject.toLowerCase().includes('géo')) column = 'score_geographie';
            if (subject.toLowerCase().includes('emc')) column = 'score_emc';
            if (subject.toLowerCase().includes('science')) column = 'score_sciences';

            const newSubjectScore = (user[column] || 0) + score;
            const newTotalScore = (user.score_total || 0) + score;

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

        // 3. RÉCUPÉRATION DU TOP 10 POUR LE TABLEAU
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
