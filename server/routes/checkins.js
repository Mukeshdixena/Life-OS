const express = require('express');
const pool = require('../db');

const router = express.Router();

// POST /api/checkins
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { block_id, outcome, extra_minutes, notes, alternate_activity, time_roi } = req.body;

  if (!block_id || !outcome) {
    return res.status(400).json({ error: 'block_id and outcome are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch the block
    const blockResult = await client.query(
      'SELECT * FROM time_blocks WHERE id = $1 AND user_id = $2',
      [block_id, userId]
    );

    if (blockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Block not found' });
    }

    const block = blockResult.rows[0];

    // Insert checkin record
    const actualEnd = new Date().toISOString();
    await client.query(
      `INSERT INTO checkins
         (block_id, user_id, outcome, actual_end, extra_minutes, notes, alternate_activity, time_roi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [block_id, userId, outcome, actualEnd, extra_minutes || 0, notes, alternate_activity, time_roi]
    );

    if (outcome === 'extended' && extra_minutes > 0) {
      // Extend current block's end_time
      const newBlockEnd = new Date(new Date(block.end_time).getTime() + extra_minutes * 60000).toISOString();

      await client.query(
        `UPDATE time_blocks SET end_time = $1, status = 'active' WHERE id = $2`,
        [newBlockEnd, block_id]
      );

      // Shift all subsequent blocks in the same plan
      const subsequentResult = await client.query(
        `SELECT * FROM time_blocks
         WHERE plan_id = $1 AND position > $2
         ORDER BY position ASC`,
        [block.plan_id, block.position]
      );

      const MIN_SLEEP_MINUTES = 360;

      for (const subsequent of subsequentResult.rows) {
        let newStart = new Date(new Date(subsequent.start_time).getTime() + extra_minutes * 60000);
        let newEnd = new Date(new Date(subsequent.end_time).getTime() + extra_minutes * 60000);

        // Guard minimum sleep duration
        if (subsequent.category === 'sleep') {
          const durationMs = newEnd - newStart;
          const minDurationMs = MIN_SLEEP_MINUTES * 60000;
          if (durationMs < minDurationMs) {
            newEnd = new Date(newStart.getTime() + minDurationMs);
          }
        }

        await client.query(
          `UPDATE time_blocks SET start_time = $1, end_time = $2 WHERE id = $3`,
          [newStart.toISOString(), newEnd.toISOString(), subsequent.id]
        );
      }
    } else if (outcome === 'done') {
      await client.query(`UPDATE time_blocks SET status = 'done' WHERE id = $1`, [block_id]);
    } else if (outcome === 'skipped' || outcome === 'did_something_else') {
      await client.query(`UPDATE time_blocks SET status = 'skipped' WHERE id = $1`, [block_id]);
    }

    await client.query('COMMIT');

    // Return all blocks for the plan ordered by start_time
    const allBlocks = await pool.query(
      'SELECT * FROM time_blocks WHERE plan_id = $1 ORDER BY start_time ASC',
      [block.plan_id]
    );

    res.json({ blocks: allBlocks.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Failed to process checkin' });
  } finally {
    client.release();
  }
});

module.exports = router;
