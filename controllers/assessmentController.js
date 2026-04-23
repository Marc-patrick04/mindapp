const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const submitAssessment = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { answers } = req.body;

        const sessionResult = await client.query(
            'INSERT INTO assessment_sessions (session_token) VALUES (gen_random_uuid()) RETURNING id, session_token'
        );

        const sessionId = sessionResult.rows[0].id;
        const sessionToken = sessionResult.rows[0].session_token;

        let totalScore = 0;
        let maxPossibleScore = 0;

        for (const item of answers) {
            const questionResult = await client.query('SELECT * FROM questions WHERE id = $1', [item.questionId]);
            const question = questionResult.rows[0];
            let pointsEarned = 0;
            let answerValue = item.answer;
            let maxPointsForQuestion = 0;

            if (question.question_type === 'yesno') {
                // Get points from stored options
                let pointsMap = { yes: 1, no: 0 };
                if (question.options) {
                    let opts = question.options;
                    if (typeof opts === 'string') opts = JSON.parse(opts);
                    pointsMap = opts;
                }
                pointsEarned = item.answer === 'yes' ? pointsMap.yes : pointsMap.no;
                maxPointsForQuestion = Math.max(pointsMap.yes, pointsMap.no);
            }
            else if (question.question_type === 'scale') {
                const selectedValue = parseInt(item.answer);
                maxPointsForQuestion = question.scale_max || 5;
                pointsEarned = selectedValue;
                answerValue = selectedValue.toString();
            }
            else if (question.question_type === 'checklist') {
                const selectedOptions = JSON.parse(item.answer);
                let optionList = question.options;
                if (typeof optionList === 'string') optionList = JSON.parse(optionList);

                const optionPointsMap = {};
                optionList.forEach(opt => {
                    optionPointsMap[opt.text] = opt.points || 0;
                    maxPointsForQuestion += opt.points || 0;
                });

                for (const option of selectedOptions) {
                    pointsEarned += optionPointsMap[option] || 0;
                }
                answerValue = JSON.stringify(selectedOptions);
            }
            else if (question.question_type === 'choice') {
                const selectedOption = item.answer;
                let optionList = question.options;
                if (typeof optionList === 'string') optionList = JSON.parse(optionList);

                for (const opt of optionList) {
                    if (opt.text === selectedOption) {
                        pointsEarned = opt.points || 0;
                        maxPointsForQuestion = Math.max(...optionList.map(o => o.points || 0));
                        break;
                    }
                }
                answerValue = selectedOption;
            }

            totalScore += pointsEarned;
            maxPossibleScore += maxPointsForQuestion;

            await client.query(
                'INSERT INTO answers (session_id, question_id, answer_value, points_earned) VALUES ($1, $2, $3, $4)',
                [sessionId, item.questionId, answerValue, pointsEarned]
            );
        }

        const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

        let riskLevel = 'low';
        let recommendation = 'Maintain healthy habits.';
        let colorCode = '#2ECC71';

        if (percentage >= 60) {
            riskLevel = 'high';
            recommendation = 'You are at high risk. We strongly recommend immediate professional support.';
            colorCode = '#E74C3C';
        } else if (percentage >= 30) {
            riskLevel = 'moderate';
            recommendation = 'You may be at moderate risk. Consider reducing gambling and joining support groups.';
            colorCode = '#F39C12';
        }

        await client.query(
            'UPDATE assessment_sessions SET total_score = $1, risk_level = $2, recommendation = $3 WHERE id = $4',
            [totalScore, riskLevel, recommendation, sessionId]
        );

        await client.query('COMMIT');

        res.json({
            sessionToken,
            totalScore,
            maxPossibleScore,
            percentage: Math.round(percentage),
            riskLevel,
            recommendation,
            colorCode,
            needsSupport: riskLevel === 'moderate' || riskLevel === 'high'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error submitting assessment:', error);
        res.status(500).json({ error: 'Failed to submit assessment: ' + error.message });
    } finally {
        client.release();
    }
};

const getActiveQuestions = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM questions WHERE is_active = true ORDER BY display_order');

        const questions = result.rows;

        // Randomize order
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        const parsedQuestions = questions.map(q => {
            if (q.options && typeof q.options === 'string') {
                try {
                    q.options = JSON.parse(q.options);
                } catch (e) {
                    console.error('Error parsing options:', e);
                }
            }
            return q;
        });

        res.json(parsedQuestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

const getSession = async (req, res) => {
    try {
        const { token } = req.params;

        const result = await pool.query(
            `SELECT s.*, 
                json_agg(json_build_object('questionId', a.question_id, 'answer', a.answer_value)) as answers
             FROM assessment_sessions s
             LEFT JOIN answers a ON s.id = a.session_id
             WHERE s.session_token = $1
             GROUP BY s.id`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = { submitAssessment, getSession, getActiveQuestions };