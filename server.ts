import express from "express";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import Redis from "ioredis";
import Database from "better-sqlite3";
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Extend express-session to include userId
declare module "express-session" {
  interface SessionData {
    userId: any;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to strip quotes from env variables (Docker often includes them)
const cleanEnv = (key: string) => {
  const val = process.env[key];
  if (!val) return undefined;
  const cleaned = val.replace(/^["']|["']$/g, "");
  console.log(`Cleaned ${key}: ${key === 'SESSION_SECRET' ? '***' : cleaned}`);
  return cleaned;
};

// --- PERMANENT SOLUTION: CUSTOM REDIS SESSION STORE ---
// This replaces connect-redis to avoid the [object Object] syntax error
class CustomRedisStore extends session.Store {
  client: Redis;
  prefix: string;

  constructor(client: Redis, prefix: string = "sess:") {
    super();
    this.client = client;
    this.prefix = prefix;
  }

  get(sid: string, cb: (err?: any, session?: session.SessionData | null) => void) {
    this.client.get(this.prefix + sid, (err, data) => {
      if (err) return cb(err);
      if (!data) return cb(null, null);
      try {
        cb(null, JSON.parse(data));
      } catch (e) {
        cb(e);
      }
    });
  }

  set(sid: string, sess: session.SessionData, cb?: (err?: any) => void) {
    const key = this.prefix + sid;
    const val = JSON.stringify(sess);
    // Calculate TTL in seconds
    const maxAge = sess.cookie?.maxAge;
    const ttl = maxAge ? Math.floor(maxAge / 1000) : 86400; // Default 1 day
    
    console.log(`🛠️ CustomStore: Saving session ${sid} (TTL: ${ttl}s)`);
    this.client.set(key, val, "EX", ttl, (err) => {
      if (cb) cb(err);
    });
  }

  destroy(sid: string, cb?: (err?: any) => void) {
    this.client.del(this.prefix + sid, (err) => {
      if (cb) cb(err);
    });
  }

  touch(sid: string, sess: session.SessionData, cb?: (err?: any) => void) {
    const maxAge = sess.cookie?.maxAge;
    if (maxAge) {
      const ttl = Math.floor(maxAge / 1000);
      this.client.expire(this.prefix + sid, ttl, (err) => {
        if (cb) cb(err);
      });
    } else if (cb) {
      cb();
    }
  }
}
// ------------------------------------------------------

// Database Configuration
const databaseUrl = cleanEnv('DATABASE_URL');
const isPostgres = databaseUrl?.startsWith('postgres');
let db: any;
let pool: any;

if (isPostgres) {
  pool = new Pool({ connectionString: databaseUrl });
  console.log("Using PostgreSQL database");
} else {
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  db = new Database(path.join(dataDir, "edtech.db"));
  console.log("Using SQLite database");
}

// Initialize Database Schema
async function initDb() {
  if (isPostgres) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        thumbnail TEXT NOT NULL,
        instructor TEXT NOT NULL,
        category TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id),
        title TEXT NOT NULL,
        video_url TEXT NOT NULL,
        duration TEXT NOT NULL,
        order_index INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS enrollments (
        user_id INTEGER NOT NULL REFERENCES users(id),
        course_id INTEGER NOT NULL REFERENCES courses(id),
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, course_id)
      );
    `);

    const courseCount = await pool.query("SELECT COUNT(*) FROM courses");
    if (parseInt(courseCount.rows[0].count) === 0) {
      const courses = [
        ["Full-Stack Web Development", "Master modern web development from scratch.", 10500, "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80", "Dr. Sarah Smith", "Development"],
        ["Advanced UI/UX Design", "Create stunning user interfaces and experiences.", 8500, "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80", "Alex Rivera", "Design"],
        ["Data Science with Python", "Analyze data and build machine learning models.", 15000, "https://images.unsplash.com/photo-1527474305487-b87b222841cc?auto=format&fit=crop&w=800&q=80", "Prof. Michael Chen", "Data Science"],
        ["Mobile App Development", "Build cross-platform mobile apps with React Native.", 12000, "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80", "James Wilson", "Development"],
        ["Digital Marketing Mastery", "Learn SEO, SEM, and Social Media Marketing.", 6500, "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80", "Emily Brown", "Marketing"],
        ["Cyber Security Essentials", "Protect systems and networks from digital attacks.", 18000, "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80", "Robert Fox", "Security"]
      ];

      for (const c of courses) {
        const res = await pool.query(
          "INSERT INTO courses (title, description, price, thumbnail, instructor, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          c
        );
        const courseId = res.rows[0].id;
        await pool.query(
          "INSERT INTO lessons (course_id, title, video_url, duration, order_index) VALUES ($1, $2, $3, $4, $5)",
          [courseId, "Introduction", "https://www.w3schools.com/html/mov_bbb.mp4", "10:00", 1]
        );
      }
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL, price REAL NOT NULL, thumbnail TEXT NOT NULL, instructor TEXT NOT NULL, category TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL, title TEXT NOT NULL, video_url TEXT NOT NULL, duration TEXT NOT NULL, order_index INTEGER NOT NULL, FOREIGN KEY (course_id) REFERENCES courses(id));
      CREATE TABLE IF NOT EXISTS enrollments (user_id INTEGER NOT NULL, course_id INTEGER NOT NULL, enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, course_id), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (course_id) REFERENCES courses(id));
    `);
  }
}

async function startServer() {
  await initDb();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Redis Setup
  let redisClient: Redis | null = null;
  let sessionStore: any = null;
  
  const redisUrl = cleanEnv('REDIS_URL');
  console.log("Attempting to connect to Redis at:", redisUrl || "NOT SET");
  
  if (redisUrl) {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
      
      redisClient.on("connect", () => {
        console.log("✅ Connected to Redis");
        redisClient?.ping()
          .then(res => console.log("Redis Ping Response:", res))
          .catch(e => console.error("Redis Ping Failed:", e));
      });
      
      redisClient.on("error", (err) => {
        console.error("❌ Redis Error:", err);
      });

      sessionStore = new CustomRedisStore(redisClient);
      console.log("🚀 CustomRedisStore initialized (Permanent Solution)");
    } catch (err) {
      console.error("❌ Failed to initialize Redis:", err);
    }
  }

  const sessionConfig: any = {
    secret: cleanEnv('SESSION_SECRET') || "lumina-learning-secret-key-12345",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
    }
  };

  if (sessionStore) {
    sessionConfig.store = sessionStore;
    console.log("✅ CustomRedisStore attached to session configuration");
  }

  app.use(session(sessionConfig));

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    try {
      // Check if user already exists
      const existingUser = isPostgres 
        ? (await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail])).rows[0]
        : db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);

      if (existingUser) {
        console.log("ℹ️ User already exists, logging in instead:", cleanEmail);
        req.session.userId = existingUser.id;
        return req.session.save((err) => {
          if (err) {
            console.error("❌ Session save error (auto-login):", err);
            return res.status(500).json({ error: "Session save failed", details: err.message });
          }
          res.json({ id: existingUser.id, email: existingUser.email, name: existingUser.name });
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      let user;
      if (isPostgres) {
        const result = await pool.query("INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name", [cleanEmail, hashedPassword, name]);
        user = result.rows[0];
      } else {
        const result = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)").run(cleanEmail, hashedPassword, name);
        user = { id: result.lastInsertRowid, email: cleanEmail, name };
      }
      
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error (register):", err);
          return res.status(500).json({ 
            error: "Session save failed", 
            details: err.message || "Unknown error",
            redisStatus: redisClient?.status || "no-client"
          });
        }
        console.log("✅ Session saved to Redis for new user:", user.id);
        res.json(user);
      });
    } catch (e) { 
      console.error("❌ Registration error:", e);
      res.status(400).json({ error: "Registration failed" }); 
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    try {
      const user = isPostgres 
        ? (await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail])).rows[0]
        : db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);

      if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id;
        console.log("Attempting to save session for user:", user.id);
        req.session.save((err) => {
          if (err) {
            console.error("❌ Session save error (login):", err);
            return res.status(500).json({ 
              error: "Session save failed", 
              details: err.message || "Unknown error",
              redisStatus: redisClient?.status || "no-client"
            });
          }
          console.log("✅ Session saved to Redis for user:", user.id);
          res.json({ id: user.id, email: user.email, name: user.name });
        });
      } else { 
        res.status(401).json({ error: "Invalid credentials" }); 
      }
    } catch (e) {
      console.error("❌ Login error:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session.userId;
    console.log("🔍 Checking session for user ID:", userId);
    if (!userId) return res.status(401).json({ error: "Not logged in" });
    
    try {
      const user = isPostgres
        ? (await pool.query("SELECT id, email, name FROM users WHERE id = $1", [userId])).rows[0]
        : db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(userId);
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  // Course Routes
  app.get("/api/courses", async (req, res) => {
    const courses = isPostgres ? (await pool.query("SELECT * FROM courses")).rows : db.prepare("SELECT * FROM courses").all();
    res.json(courses);
  });

  app.get("/api/courses/:id", async (req, res) => {
    const lessons = isPostgres 
      ? (await pool.query("SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index ASC", [req.params.id])).rows
      : db.prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC").all(req.params.id);
    res.json({ lessons });
  });

  app.post("/api/enroll", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Login required" });
    try {
      if (isPostgres) await pool.query("INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)", [req.session.userId, req.body.courseId]);
      else db.prepare("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)").run(req.session.userId, req.body.courseId);
      res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "Already enrolled" }); }
  });

  app.get("/api/my-courses", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Login required" });
    const courses = isPostgres
      ? (await pool.query("SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.user_id = $1", [req.session.userId])).rows
      : db.prepare("SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.user_id = ?").all(req.session.userId);
    res.json(courses);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist/index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://0.0.0.0:${PORT}`));
}

startServer();
