const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/settings
router.get('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT settings FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ settings: result.rows[0].settings });
  } catch (err) {
    console.error('Settings GET error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  const userId = req.user.id;
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'settings object is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET settings = $1 WHERE id = $2 RETURNING settings',
      [JSON.stringify(settings), userId]
    );
    res.json({ settings: result.rows[0].settings });
  } catch (err) {
    console.error('Settings PUT error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /api/settings/habits
router.get('/habits', async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT * FROM habits WHERE user_id = $1 AND is_active = true ORDER BY created_at ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Habits GET error:', err);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// POST /api/settings/habits
router.post('/habits', async (req, res) => {
  const userId = req.user.id;
  const { name, category, color } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO habits (user_id, name, category, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, category || 'personal', color || '#6B7280']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Habits POST error:', err);
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// PUT /api/settings/habits/:id
router.put('/habits/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { name, category, color, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE habits
       SET
         name      = COALESCE($1, name),
         category  = COALESCE($2, category),
         color     = COALESCE($3, color),
         is_active = COALESCE($4, is_active)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, category, color, is_active, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Habits PUT error:', err);
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

// DELETE /api/settings/habits/:id  (soft delete)
router.delete('/habits/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'UPDATE habits SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json({ deleted: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Habits DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

// GET /api/settings/habit-logs?date=YYYY-MM-DD
router.get('/habit-logs', async (req, res) => {
  const userId = req.user.id;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
  }

  try {
    const result = await pool.query(
      `SELECT hl.*
       FROM habit_logs hl
       JOIN habits h ON hl.habit_id = h.id
       WHERE hl.user_id = $1 AND hl.date = $2
       ORDER BY hl.habit_id ASC`,
      [userId, date]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Habit logs GET error:', err);
    res.status(500).json({ error: 'Failed to fetch habit logs' });
  }
});

// POST /api/settings/habit-logs
router.post('/habit-logs', async (req, res) => {
  const userId = req.user.id;
  const { habit_id, date, completed } = req.body;

  if (!habit_id || !date) {
    return res.status(400).json({ error: 'habit_id and date are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO habit_logs (habit_id, user_id, date, completed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (habit_id, date)
       DO UPDATE SET completed = EXCLUDED.completed
       RETURNING *`,
      [habit_id, userId, date, completed ?? false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Habit logs POST error:', err);
    res.status(500).json({ error: 'Failed to upsert habit log' });
  }
});

// DELETE /api/settings/account (Clear All Data - Keeps User)
router.delete('/account', async (req, res) => {
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete data from all user-related tables
    await client.query('DELETE FROM checkins WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM time_blocks WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM daily_plans WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM habit_logs WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM habits WHERE user_id = $1', [userId]);
    
    // Optionally clear user-specific settings if desired, but keep the record
    await client.query("UPDATE users SET settings = '{}' WHERE id = $1", [userId]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'All user data erased successfully. Account preserved.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Data clear error:', err);
    res.status(500).json({ error: 'Failed to erase data' });
  } finally {
    client.release();
  }
});

module.exports = router;
