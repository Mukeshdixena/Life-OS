const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/blocks?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const { date } = req.query;

  try {
    let query;
    let params;

    if (date) {
      query = `
        SELECT tb.*
        FROM time_blocks tb
        JOIN daily_plans dp ON tb.plan_id = dp.id
        WHERE tb.user_id = $1 AND dp.date = $2
        ORDER BY tb.start_time ASC
      `;
      params = [userId, date];
    } else {
      query = `
        SELECT tb.*
        FROM time_blocks tb
        WHERE tb.user_id = $1
        ORDER BY tb.start_time ASC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Blocks GET error:', err);
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

// POST /api/blocks
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const {
    plan_id,
    title,
    category,
    start_time,
    end_time,
    color,
    energy_level,
    is_non_negotiable,
    position,
  } = req.body;

  if (!plan_id || !title || !start_time || !end_time) {
    return res.status(400).json({ error: 'plan_id, title, start_time, and end_time are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO time_blocks
         (plan_id, user_id, title, category, start_time, end_time, planned_start, planned_end,
          color, energy_level, is_non_negotiable, position, status)
       VALUES ($1, $2, $3, $4, $5, $6, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        plan_id,
        userId,
        title,
        category || 'personal',
        start_time,
        end_time,
        color || '#6B7280',
        energy_level || 'medium',
        is_non_negotiable ?? false,
        position ?? 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Blocks POST error:', err);
    res.status(500).json({ error: 'Failed to create block' });
  }
});

// PUT /api/blocks/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { title, category, start_time, end_time, color, energy_level, is_non_negotiable, status, position } =
    req.body;

  try {
    const result = await pool.query(
      `UPDATE time_blocks
       SET
         title              = COALESCE($1, title),
         category           = COALESCE($2, category),
         start_time         = COALESCE($3, start_time),
         end_time           = COALESCE($4, end_time),
         color              = COALESCE($5, color),
         energy_level       = COALESCE($6, energy_level),
         is_non_negotiable  = COALESCE($7, is_non_negotiable),
         status             = COALESCE($8, status),
         position           = COALESCE($9, position)
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [title, category, start_time, end_time, color, energy_level, is_non_negotiable, status, position, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Block not found or not owned by user' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Blocks PUT error:', err);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

// DELETE /api/blocks/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM time_blocks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Block not found or not owned by user' });
    }

    res.json({ deleted: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Blocks DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

module.exports = router;
