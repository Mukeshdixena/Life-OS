const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/dashboard/stats?range=week|month|year
router.get('/stats', async (req, res) => {
  const userId = req.user.id;
  const { range } = req.query;

  let interval;
  if (range === 'month') interval = '30 days';
  else if (range === 'year') interval = '365 days';
  else interval = '7 days';

  try {
    // Time by category — returned as { work: minutes, health: minutes, ... }
    const timeByCategoryResult = await pool.query(
      `SELECT
         tb.category,
         COALESCE(SUM(EXTRACT(EPOCH FROM (tb.end_time - tb.start_time)) / 60), 0)::int AS total_minutes
       FROM time_blocks tb
       JOIN daily_plans dp ON tb.plan_id = dp.id
       WHERE dp.user_id = $1
         AND dp.date >= CURRENT_DATE - $2::interval
       GROUP BY tb.category
       ORDER BY total_minutes DESC`,
      [userId, interval]
    );
    const timeByCategory = {};
    timeByCategoryResult.rows.forEach((r) => {
      timeByCategory[r.category] = r.total_minutes;
    });

    // Completion rates per date — rate as 0–1 decimal
    const completionRatesResult = await pool.query(
      `SELECT
         dp.date,
         COUNT(tb.id)::int AS total_blocks,
         COUNT(c.id) FILTER (WHERE c.outcome = 'done')::int AS done_count
       FROM daily_plans dp
       LEFT JOIN time_blocks tb ON tb.plan_id = dp.id
       LEFT JOIN checkins c ON c.block_id = tb.id
       WHERE dp.user_id = $1
         AND dp.date >= CURRENT_DATE - $2::interval
       GROUP BY dp.date
       ORDER BY dp.date ASC`,
      [userId, interval]
    );
    const completionRates = completionRatesResult.rows.map((r) => ({
      date: r.date,
      rate: r.total_blocks > 0 ? Math.round((r.done_count / r.total_blocks) * 100) / 100 : 0,
    }));

    // Mood & energy trend — use 'mood' and 'energy' keys
    const moodTrendResult = await pool.query(
      `SELECT date, mood_score AS mood, energy_score AS energy
       FROM daily_plans
       WHERE user_id = $1
         AND date >= CURRENT_DATE - $2::interval
       ORDER BY date ASC`,
      [userId, interval]
    );

    // Total days tracked
    const totalDaysResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM daily_plans WHERE user_id = $1',
      [userId]
    );

    res.json({
      timeByCategory,
      completionRates,
      moodTrend: moodTrendResult.rows,
      totalDaysTracked: totalDaysResult.rows[0].total,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/dashboard/history?page=1&limit=30
router.get('/history', async (req, res) => {
  const userId = req.user.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 30);
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT
         dp.*,
         COUNT(tb.id)::int AS total_blocks,
         COUNT(c.id) FILTER (WHERE c.outcome = 'done')::int AS done_blocks
       FROM daily_plans dp
       LEFT JOIN time_blocks tb ON tb.plan_id = dp.id
       LEFT JOIN checkins c ON c.block_id = tb.id
       WHERE dp.user_id = $1
       GROUP BY dp.id
       ORDER BY dp.date DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Return completion_rate as 0–1 decimal for SVG ring calculations
    const days = result.rows.map((r) => ({
      ...r,
      completion_rate: r.total_blocks > 0
        ? Math.round((r.done_blocks / r.total_blocks) * 100) / 100
        : null,
    }));

    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM daily_plans WHERE user_id = $1',
      [userId]
    );

    res.json({
      days,
      total: countResult.rows[0].total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Dashboard history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/dashboard/day/:date
router.get('/day/:date', async (req, res) => {
  const userId = req.user.id;
  const { date } = req.params;

  try {
    const planResult = await pool.query(
      'SELECT * FROM daily_plans WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    if (planResult.rows.length === 0) {
      return res.json({ plan: null, blocks: [], checkins: [] });
    }

    const plan = planResult.rows[0];

    const blocksResult = await pool.query(
      'SELECT * FROM time_blocks WHERE plan_id = $1 ORDER BY start_time ASC',
      [plan.id]
    );

    const checkinsResult = await pool.query(
      `SELECT c.*
       FROM checkins c
       JOIN time_blocks tb ON c.block_id = tb.id
       WHERE tb.plan_id = $1
       ORDER BY c.created_at ASC`,
      [plan.id]
    );

    res.json({
      plan,
      blocks: blocksResult.rows,
      checkins: checkinsResult.rows,
    });
  } catch (err) {
    console.error('Dashboard day error:', err);
    res.status(500).json({ error: 'Failed to fetch day details' });
  }
});

module.exports = router;
