require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plan');
const blocksRoutes = require('./routes/blocks');
const checkinsRoutes = require('./routes/checkins');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const authenticate = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || 'https://life-os-client.vercel.app,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/plan', authenticate, planRoutes);
app.use('/api/blocks', authenticate, blocksRoutes);
app.use('/api/checkins', authenticate, checkinsRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/settings', authenticate, settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Life OS server running on port ${PORT}`);
});

module.exports = app;
