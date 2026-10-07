import express from 'express';
import pkg from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const app = express();
app.use(express.json());

// --- 1. PostgreSQL Connection ---
const pgPool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

// --- 2. Redis Connection ---
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

redis.on('connect', () => console.log(' Connected to Redis'));
redis.on('error', (err) => console.error('Redis Error:', err));

// --- Initial Setup: Create Table & Seed Data ---
async function initDB() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' PostgreSQL Table Verified');
  } catch (err) {
    console.error('Database Initialization Error:', err);
  }
}

// --- Routes ---

// GET /users - Cached Endpoint
app.get('/users', async (req, res) => {
  const cacheKey = 'users:all';

  try {
    // Check Redis Cache first
    const cachedUsers = await redis.get(cacheKey);

    if (cachedUsers) {
      return res.json({
        source: 'Redis Cache (Fast)',
        data: JSON.parse(cachedUsers),
      });
    }

    // Cache Miss -> Fetch from Postgres
    const result = await pgPool.query('SELECT * FROM users ORDER BY id DESC');
    const users = result.rows;

    // Cache in Redis for 30 seconds
    await redis.set(cacheKey, JSON.stringify(users), 'EX', 30);

    res.json({
      source: 'PostgreSQL Database',
      data: users,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users - Insert user & invalidate cache
app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const result = await pgPool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );

    // Invalidate Redis cache so the next GET request fetches fresh data
    await redis.del('users:all');

    res.status(201).json({
      message: 'User created & cache invalidated',
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await initDB();
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

