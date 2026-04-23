const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = result.rows[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { adminId: admin.id, email: admin.email, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, admin: { id: admin.id, email: admin.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
};

const getAllQuestions = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM questions ORDER BY display_order');

        const questions = result.rows.map(q => {
            if (q.options) {
                if (typeof q.options === 'string') {
                    try {
                        q.options = JSON.parse(q.options);
                    } catch (e) {
                        console.error('Error parsing options for question', q.id, e);
                        q.options = null;
                    }
                }
            }
            return q;
        });

        res.json(questions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

const createQuestion = async (req, res) => {
    try {
        const {
            question_text,
            question_type,
            options,
            scale_min,
            scale_max,
            display_order,
            is_active
        } = req.body;

        console.log('Creating question:', { question_text, question_type, options, scale_min, scale_max, is_active });

        let optionsJson = null;

        if (question_type === 'yesno' && options) {
            optionsJson = JSON.stringify(options);
        } else if ((question_type === 'checklist' || question_type === 'choice') && options && Array.isArray(options) && options.length > 0) {
            const cleanOptions = options.map(opt => ({
                text: opt.text || '',
                points: parseInt(opt.points) || 0
            }));
            optionsJson = JSON.stringify(cleanOptions);
        }

        const result = await pool.query(
            `INSERT INTO questions (question_text, question_type, options, scale_min, scale_max, display_order, is_active)
             VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7) RETURNING *`,
            [question_text, question_type, optionsJson, scale_min, scale_max, display_order, is_active !== undefined ? is_active : true]
        );

        if (result.rows[0].options && typeof result.rows[0].options === 'string') {
            try {
                result.rows[0].options = JSON.parse(result.rows[0].options);
            } catch (e) { }
        }

        console.log('Question created:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({ error: 'Failed to create question: ' + error.message });
    }
};

const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            question_text,
            question_type,
            options,
            scale_min,
            scale_max,
            is_active,
            display_order
        } = req.body;

        console.log('=== UPDATING QUESTION ===');
        console.log('ID:', id);
        console.log('Question type:', question_type);
        console.log('Options received:', options);

        let optionsJson = null;

        if (question_type === 'yesno' && options) {
            optionsJson = JSON.stringify(options);
        } else if ((question_type === 'checklist' || question_type === 'choice') && options && Array.isArray(options) && options.length > 0) {
            const cleanOptions = options.map(opt => ({
                text: opt.text || '',
                points: parseInt(opt.points) || 0
            }));
            optionsJson = JSON.stringify(cleanOptions);
        }

        const query = `
            UPDATE questions 
            SET question_text = $1, 
                question_type = $2, 
                options = $3::jsonb, 
                scale_min = $4, 
                scale_max = $5, 
                is_active = $6, 
                display_order = $7
            WHERE id = $8 
            RETURNING *
        `;

        const params = [
            question_text,
            question_type,
            optionsJson,
            scale_min || null,
            scale_max || null,
            is_active,
            display_order,
            id
        ];

        console.log('Executing query with params:', params);

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (result.rows[0].options && typeof result.rows[0].options === 'string') {
            try {
                result.rows[0].options = JSON.parse(result.rows[0].options);
            } catch (e) {
                console.error('Error parsing returned options:', e);
            }
        }

        console.log('Question updated successfully:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ error: 'Failed to update question: ' + error.message });
    }
};

const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM answers WHERE question_id = $1', [id]);
        const result = await pool.query('DELETE FROM questions WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }

        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
};

const getRules = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, q.question_text 
             FROM rating_rules r
             LEFT JOIN questions q ON r.question_id = q.id
             ORDER BY r.id`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

const createRule = async (req, res) => {
    try {
        const { rule_name, question_id, answer_value, points } = req.body;

        const result = await pool.query(
            `INSERT INTO rating_rules (rule_name, question_id, answer_value, points)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [rule_name, question_id, answer_value, points]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create rule' });
    }
};

const deleteRule = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM rating_rules WHERE id = $1', [id]);
        res.json({ message: 'Rule deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete rule' });
    }
};

const getThresholds = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM risk_thresholds ORDER BY min_score');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

const createThreshold = async (req, res) => {
    try {
        const { min_score, max_score, risk_level, color_code, default_recommendation } = req.body;

        const result = await pool.query(
            `INSERT INTO risk_thresholds (min_score, max_score, risk_level, color_code, default_recommendation)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [min_score, max_score, risk_level, color_code, default_recommendation]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create threshold' });
    }
};

const updateThreshold = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_score, max_score, risk_level, color_code, default_recommendation } = req.body;

        const result = await pool.query(
            `UPDATE risk_thresholds 
             SET min_score = $1, max_score = $2, risk_level = $3, color_code = $4, default_recommendation = $5
             WHERE id = $6 RETURNING *`,
            [min_score, max_score, risk_level, color_code, default_recommendation, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Threshold not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update threshold' });
    }
};

const getSupportRequests = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sr.*, u.email, s.risk_level, s.total_score, s.recommendation
             FROM support_requests sr
             JOIN users u ON sr.user_id = u.id
             JOIN assessment_sessions s ON sr.session_id = s.id
             ORDER BY 
               CASE sr.status 
                 WHEN 'pending' THEN 1 
                 WHEN 'contacted' THEN 2 
                 ELSE 3 
               END,
               sr.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

const updateSupportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;

        const result = await pool.query(
            `UPDATE support_requests 
             SET status = $1, admin_notes = $2
             WHERE id = $3 RETURNING *`,
            [status, admin_notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Support request not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

const getStats = async (req, res) => {
    try {
        const totalAssessments = await pool.query('SELECT COUNT(*) FROM assessment_sessions');
        const totalSupportRequests = await pool.query('SELECT COUNT(*) FROM support_requests');
        const pendingRequests = await pool.query("SELECT COUNT(*) FROM support_requests WHERE status = 'pending'");
        const riskDistribution = await pool.query(
            'SELECT risk_level, COUNT(*) FROM assessment_sessions WHERE risk_level IS NOT NULL GROUP BY risk_level'
        );

        res.json({
            totalAssessments: parseInt(totalAssessments.rows[0].count),
            totalSupportRequests: parseInt(totalSupportRequests.rows[0].count),
            pendingRequests: parseInt(pendingRequests.rows[0].count),
            riskDistribution: riskDistribution.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = {
    login,
    getAllQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    getRules,
    createRule,
    deleteRule,
    getThresholds,
    createThreshold,
    updateThreshold,
    getSupportRequests,
    updateSupportStatus,
    getStats
};