const express = require('express');
const pool = require('../db');
const { generateDayPlan } = require('../services/ai');

const router = express.Router();

// POST /api/plan/generate
router.post('/generate', async (req, res) => {
  const { prompt, mood_score, energy_score, mental_state, date } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const planDate = date || new Date().toISOString().split('T')[0];
  const userContext = { date: planDate, mood_score, energy_score, mental_state };

  try {
    const blocks = await generateDayPlan(prompt, userContext);
    res.json({ blocks });
  } catch (err) {
    const errorMsg = err.message || 'Failed to generate day plan';
    console.error('Plan generate error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Generation Error', 
      message: errorMsg,
      detail: err.response?.data?.error?.message || err.message 
    });
  }
});

// POST /api/plan/confirm
router.post('/confirm', async (req, res) => {
  const { date, prompt_used, mood_score, energy_score, mental_state, blocks } = req.body;
  const userId = req.user.id;

  if (!date || !Array.isArray(blocks)) {
    return res.status(400).json({ error: 'date and blocks array are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert the daily plan
    const planResult = await client.query(
      `INSERT INTO daily_plans (user_id, date, prompt_used, mood_score, energy_score, mental_state, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, date)
       DO UPDATE SET
         prompt_used   = EXCLUDED.prompt_used,
         mood_score    = EXCLUDED.mood_score,
         energy_score  = EXCLUDED.energy_score,
         mental_state  = EXCLUDED.mental_state,
         confirmed_at  = EXCLUDED.confirmed_at
       RETURNING *`,
      [userId, date, prompt_used, mood_score, energy_score, mental_state]
    );

    const plan = planResult.rows[0];

    // Extract incoming block IDs to determine which ones to keep/update
    const incomingBlockIds = blocks.filter(b => b.id).map(b => b.id);

    // Remove old blocks for this plan that are NOT in the incoming blocks
    if (incomingBlockIds.length > 0) {
      await client.query(
        'DELETE FROM time_blocks WHERE plan_id = $1 AND id != ALL($2::int[])',
        [plan.id, incomingBlockIds]
      );
    } else {
      await client.query('DELETE FROM time_blocks WHERE plan_id = $1', [plan.id]);
    }

    // Upsert blocks
    const insertedBlocks = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.id) {
        // Update existing block
        const blockResult = await client.query(
          `UPDATE time_blocks
           SET title = $1, category = $2, start_time = $3, end_time = $4,
               color = $5, energy_level = $6, is_non_negotiable = $7, position = $8
           WHERE id = $9 AND plan_id = $10
           RETURNING *`,
          [
            b.title, b.category, b.start_time, b.end_time, b.color,
            b.energy_level, b.is_non_negotiable ?? false, i, b.id, plan.id
          ]
        );
        insertedBlocks.push(blockResult.rows[0]);
      } else {
        // Insert new block
        const blockResult = await client.query(
          `INSERT INTO time_blocks
             (plan_id, user_id, title, category, start_time, end_time, planned_start, planned_end,
              color, energy_level, is_non_negotiable, position, status)
           VALUES ($1, $2, $3, $4, $5, $6, $5, $6, $7, $8, $9, $10, 'pending')
           RETURNING *`,
          [
            plan.id, userId, b.title, b.category, b.start_time, b.end_time,
            b.color, b.energy_level, b.is_non_negotiable ?? false, i
          ]
        );
        insertedBlocks.push(blockResult.rows[0]);
      }
    }

    await client.query('COMMIT');
    res.json({ plan, blocks: insertedBlocks });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Plan confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm plan' });
  } finally {
    client.release();
  }
});

// GET /api/plan/today
router.get('/today', async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    const planResult = await pool.query(
      'SELECT * FROM daily_plans WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (planResult.rows.length === 0) {
      return res.json({ plan: null, blocks: [] });
    }

    const plan = planResult.rows[0];

    const blocksResult = await pool.query(
      'SELECT * FROM time_blocks WHERE plan_id = $1 ORDER BY start_time ASC',
      [plan.id]
    );

    res.json({ plan, blocks: blocksResult.rows });
  } catch (err) {
    console.error('Plan today error:', err);
    res.status(500).json({ error: 'Failed to fetch today plan' });
  }
});

// PUT /api/plan/blocks/:id
router.put('/blocks/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { start_time, end_time, title, category, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE time_blocks
       SET
         start_time = COALESCE($1, start_time),
         end_time   = COALESCE($2, end_time),
         title      = COALESCE($3, title),
         category   = COALESCE($4, category),
         status     = COALESCE($5, status)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [start_time, end_time, title, category, status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Block not found or not owned by user' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Plan block update error:', err);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

module.exports = router;
