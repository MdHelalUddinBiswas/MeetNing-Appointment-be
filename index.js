const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

// Import Prisma client
const prisma = require('./prisma/client');

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Test Prisma connection
async function testConnection() {
  try {
    const dateTime = await prisma.$queryRaw`SELECT NOW()`;
    console.log('Database connected at:', dateTime[0].now);
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Run Prisma migrations (tables already defined in schema.prisma)
async function initDatabase() {
  // With Prisma, we don't need to manually create tables
  // The schema is defined in prisma/schema.prisma
  // Tables are created automatically when running migrations
  console.log('Using Prisma for database schema management');
  return true;
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
  // Get token from header - support multiple formats
  let token = req.header("x-auth-token");

  // Also check for Authorization header with Bearer token
  const authHeader = req.header("Authorization");
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
    console.log("Using bearer token:", token.substring(0, 10) + "...");
  }

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

// Test route for checking deployment status
app.get("/api/health", async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: "ok",
    database: dbStatus ? "connected" : "error",
    message: "MeetNing Appointment AI API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  res.json({ message: "Welcome to the MeetNing Appointment AI API" });
});

// Home route
app.get("/", (req, res) => {
  res.send("MeetNing Appointment AI API is running");
});

// // Register a new user
// app.post("/api/auth/signup", async (req, res) => {
//   console.log(req.body);
//   try {
//     const { name, email, password, timezone } = req.body;

//     const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [
//       email,
//     ]);
//     if (userCheck.rows.length > 0) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Create new user
//     const result = await pool.query(
//       "INSERT INTO users (name, email, password, timezone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, timezone",
//       [name, email, hashedPassword, timezone || "UTC"]
//     );

//     const user = result.rows[0];

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user.id, email: user.email },
//       process.env.JWT_SECRET || "your_jwt_secret",
//       { expiresIn: "24h" }
//     );

//     res.status(201).json({
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         timezone: user.timezone,
//       },
//     });
//   } catch (error) {
//     console.error("Signup error:", error);
//     res.status(500).json({ message: "Server error during registration" });
//   }
// });

// // Login user
// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check if user exists
//     const result = await pool.query("SELECT * FROM users WHERE email = $1", [
//       email,
//     ]);
//     if (result.rows.length === 0) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const user = result.rows[0];

//     // Compare password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user.id, email: user.email },
//       process.env.JWT_SECRET || "your_jwt_secret",
//       { expiresIn: "24h" }
//     );

//     res.json({
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         timezone: user.timezone,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Server error during login" });
//   }
// });

// // Get user profile
// app.get("/api/auth/me", authenticateToken, async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT id, name, email, timezone FROM users WHERE id = $1",
//       [req.user.id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (error) {
//     console.error("Profile error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get all appointments for a user
// app.get("/api/appointments", authenticateToken, async (req, res) => {
//   try {
//     const status = req.query.status; // Filter by status if provided

//     let query = "SELECT * FROM appointments WHERE user_id = $1";
//     const queryParams = [req.user.id];

//     if (status) {
//       query += " AND status = $2";
//       queryParams.push(status);
//     }

//     query += " ORDER BY start_time ASC";

//     const result = await pool.query(query, queryParams);

//     res.json(result.rows);
//   } catch (error) {
//     console.error("Get appointments error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get appointment by ID
// app.get("/api/appointments/:id", authenticateToken, async (req, res) => {
//   try {
//     const appointmentId = req.params.id;

//     const result = await pool.query(
//       "SELECT * FROM appointments WHERE id = $1 AND user_id = $2",
//       [appointmentId, req.user.id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Appointment not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (error) {
//     console.error("Get appointment error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Create a new appointment
// app.post("/api/appointments", authenticateToken, async (req, res) => {
//   try {
//     // Get user ID from the authenticated token instead of request body
//     const user_id = req.user.id;
//     const email = req.user.email || "user@example.com";
//     const name = req.user.name || "User";

//     const {
//       title,
//       description,
//       start_time,
//       end_time,
//       location,
//       participants,
//       status,
//     } = req.body;

//     // Validate request
//     if (!title || !start_time || !end_time) {
//       return res
//         .status(400)
//         .json({ message: "Please provide title, start_time, and end_time" });
//     }

//     // Process participants data
//     let participantsJson = null;

//     if (participants) {
//       // Always ensure participants is an array of objects with email property
//       let participantsArray;

//       // Check if it's already an array
//       if (Array.isArray(participants)) {
//         // Convert any string elements to objects with email property
//         participantsArray = participants.map((item) => {
//           if (typeof item === "string") {
//             return { email: item };
//           } else if (typeof item === "object" && item.email) {
//             // If it's already an object with email, only keep the email field
//             return { email: item.email };
//           } else {
//             // Fallback for unexpected formats
//             return { email: String(item) };
//           }
//         });
//       }
//       // If it's a string (comma-separated emails)
//       else if (typeof participants === "string") {
//         // Convert comma-separated string to array of objects with email property
//         participantsArray = participants
//           .split(",")
//           .map((email) => email.trim())
//           .filter((email) => email.length > 0)
//           .map((email) => ({ email }));
//       } else {
//         // Handle case where it might be a single object or something else
//         participantsArray = [
//           {
//             email: participants.toString(),
//           },
//         ];
//       }

//       participantsJson = JSON.stringify(participantsArray);
//     }

//     console.log("Processed participants:", participantsJson);

//     // Check if user exists in the database
//     const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
//       user_id,
//     ]);

//     // If user doesn't exist, create a default user record
//     if (userCheck.rows.length === 0) {
//       console.log(
//         `User ${user_id} doesn't exist in database. Creating default user record.`
//       );

//       // Generate a secure hashed password for the default user
//       const defaultPassword = await bcrypt.hash("defaultPassword123", 10);

//       // Insert a basic user record to satisfy the foreign key constraint with all required fields
//       await pool.query(
//         "INSERT INTO users (id, email, name, password, created_at) VALUES ($1, $2, $3, $4, NOW())",
//         [user_id, email, name, defaultPassword]
//       );
//     }

//     const result = await pool.query(
//       `INSERT INTO appointments 
//         (user_id, title, description, start_time, end_time, location, participants, status) 
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
//        RETURNING *`,
//       [
//         user_id, // Using authenticated user_id instead of request body id
//         title,
//         description,
//         start_time,
//         end_time,
//         location,
//         participantsJson,
//         status || "upcoming",
//       ]
//     );

//     res.status(201).json(result.rows[0]);
//   } catch (error) {
//     console.error("Create appointment error:", error);
//     // Provide more helpful error message based on error type
//     if (error.code === "23503") {
//       // Foreign key violation
//       return res.status(400).json({
//         message:
//           "User doesn't exist in the database. Please try again or contact support.",
//       });
//     }
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Update an existing appointment
// app.put("/api/appointments/:id", authenticateToken, async (req, res) => {
//   try {
//     const appointmentId = req.params.id;
//     const {
//       title,
//       description,
//       start_time,
//       end_time,
//       location,
//       participants,
//       status,
//     } = req.body;

//     // Check if appointment exists and belongs to user
//     const checkResult = await pool.query(
//       "SELECT * FROM appointments WHERE id = $1 AND user_id = $2",
//       [appointmentId, req.user.id]
//     );

//     if (checkResult.rows.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "Appointment not found or unauthorized" });
//     }

//     // Process participants data to ensure it's an array of objects
//     let participantsJson = null;

//     if (participants) {
//       // Always ensure participants is an array of objects with email property
//       let participantsArray;

//       // Check if it's already an array
//       if (Array.isArray(participants)) {
//         // Convert any string elements to objects with email property
//         participantsArray = participants.map((item) => {
//           if (typeof item === "string") {
//             return { email: item };
//           } else if (typeof item === "object" && item.email) {
//             // If it's already an object with email, only keep the email field
//             return { email: item.email };
//           } else {
//             // Fallback for unexpected formats
//             return { email: String(item) };
//           }
//         });
//       }
//       // If it's a string (comma-separated emails)
//       else if (typeof participants === "string") {
//         // Convert comma-separated string to array of objects with email property
//         participantsArray = participants
//           .split(",")
//           .map((email) => email.trim())
//           .filter((email) => email.length > 0)
//           .map((email) => ({ email }));
//       } else {
//         // Handle case where it might be a single object or something else
//         participantsArray = [
//           {
//             email: participants.toString(),
//           },
//         ];
//       }

//       participantsJson = JSON.stringify(participantsArray);
//       console.log("Processed participants for update:", participantsJson);
//     }

//     // Build update query dynamically based on provided fields
//     let updateFields = [];
//     let queryParams = [appointmentId, req.user.id];
//     let paramCounter = 3; // Starting from 3 since $1 and $2 are already used

//     if (title) {
//       updateFields.push(`title = $${paramCounter++}`);
//       queryParams.push(title);
//     }

//     if (description !== undefined) {
//       updateFields.push(`description = $${paramCounter++}`);
//       queryParams.push(description);
//     }

//     if (start_time) {
//       updateFields.push(`start_time = $${paramCounter++}`);
//       queryParams.push(start_time);
//     }

//     if (end_time) {
//       updateFields.push(`end_time = $${paramCounter++}`);
//       queryParams.push(end_time);
//     }

//     if (location !== undefined) {
//       updateFields.push(`location = $${paramCounter++}`);
//       queryParams.push(location);
//     }

//     if (participants !== undefined) {
//       updateFields.push(`participants = $${paramCounter++}`);
//       queryParams.push(participantsJson);
//     }

//     if (status) {
//       updateFields.push(`status = $${paramCounter++}`);
//       queryParams.push(status);
//     }

//     // If no fields to update, return the original appointment
//     if (updateFields.length === 0) {
//       return res.json(checkResult.rows[0]);
//     }

//     // Perform update
//     const query = `
//       UPDATE appointments 
//       SET ${updateFields.join(", ")} 
//       WHERE id = $1 AND user_id = $2 
//       RETURNING *
//     `;

//     const result = await pool.query(query, queryParams);

//     res.json(result.rows[0]);
//   } catch (error) {
//     console.error("Update appointment error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Delete an appointment
// app.delete("/api/appointments/:id", authenticateToken, async (req, res) => {
//   try {
//     const appointmentId = req.params.id;

//     // Check if appointment exists and belongs to user
//     const checkResult = await pool.query(
//       "SELECT * FROM appointments WHERE id = $1 AND user_id = $2",
//       [appointmentId, req.user.id]
//     );

//     if (checkResult.rows.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "Appointment not found or unauthorized" });
//     }

//     // Delete appointment
//     await pool.query(
//       "DELETE FROM appointments WHERE id = $1 AND user_id = $2",
//       [appointmentId, req.user.id]
//     );

//     res.json({ message: "Appointment deleted successfully" });
//   } catch (error) {
//     console.error("Delete appointment error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Update user profile
// app.put("/api/auth/profile", authenticateToken, async (req, res) => {
//   try {
//     const { name, timezone } = req.body;

//     // Build update query based on provided fields
//     let updateFields = [];
//     let queryParams = [req.user.id];
//     let paramCounter = 2; // Starting from 2 since $1 is already used

//     if (name) {
//       updateFields.push(`name = $${paramCounter++}`);
//       queryParams.push(name);
//     }

//     if (timezone) {
//       updateFields.push(`timezone = $${paramCounter++}`);
//       queryParams.push(timezone);
//     }

//     // If no fields to update, return error
//     if (updateFields.length === 0) {
//       return res.status(400).json({ message: "No fields to update" });
//     }

//     // Perform update
//     const query = `
//       UPDATE users 
//       SET ${updateFields.join(", ")} 
//       WHERE id = $1 
//       RETURNING id, name, email, timezone
//     `;

//     const result = await pool.query(query, queryParams);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (error) {
//     console.error("Update profile error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Connect calendar (placeholder for Nylas integration)
// app.post("/api/calendars/connect", authenticateToken, async (req, res) => {
//   try {
//     const { name, provider, accessToken, refreshToken, tokenExpiry } = req.body;

//     // Validate request
//     if (!name || !provider || !accessToken) {
//       return res
//         .status(400)
//         .json({ message: "Please provide name, provider, and accessToken" });
//     }

//     // Insert new calendar connection
//     const result = await pool.query(
//       `INSERT INTO calendars 
//         (user_id, name, provider, access_token, refresh_token, token_expiry) 
//        VALUES ($1, $2, $3, $4, $5, $6) 
//        RETURNING id, name, provider`,
//       [req.user.id, name, provider, accessToken, refreshToken, tokenExpiry]
//     );

//     res.status(201).json(result.rows[0]);
//   } catch (error) {
//     console.error("Connect calendar error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get user's calendars
// app.get("/api/calendars", authenticateToken, async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT id, name, provider, description FROM calendars WHERE user_id = $1",
//       [req.user.id]
//     );

//     res.json(result.rows);
//   } catch (error) {
//     console.error("Get calendars error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Create a Google Meet link
// // Import routes
// const integrationRoutes = require("./routes/integration.routes");
// const meetingRoutes = require("./routes/meeting.routes");

// // Apply integration and meeting routes
// app.use("/api/integration", integrationRoutes);
// app.use("/api/meetings", meetingRoutes);

// Register routes

// Register a new user
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, timezone } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        timezone: timezone || "UTC",
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
      },
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );
    
    res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// Login user
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Get user profile
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all appointments for a user
app.get("/api/appointments", authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user.id,
        ...(status ? { status } : {}),
      },
      orderBy: { startTime: 'asc' },
    });
    
    res.json(appointments);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Start server and initialize database
app.listen(port, async () => {
  console.log(`MeetNing Appointment AI API listening on port ${port}`);
  await initDatabase();
});
