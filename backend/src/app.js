// Forzar zona horaria oficial del sistema a CDMX (CST / UTC-6)
process.env.TZ = process.env.TZ || 'America/Mexico_City';

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const routes = require("./routes");
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

app.use(helmet());

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));

const isAllowedDevelopmentOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const parsed = new URL(origin);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.trim().replace(/\/$/, "");

      // Solo se permiten orígenes configurados explícitamente. En desarrollo,
      // localhost se acepta por hostname exacto, nunca por coincidencia parcial.
      if (allowedOrigins.includes(normalizedOrigin) || isAllowedDevelopmentOrigin(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },

    credentials: true,
    exposedHeaders: ['X-Session-Token'],
  }),
);

app.use(morgan("dev"));
// Lists of selected QR UUIDs for bulk label PDFs can exceed the 100 KB
// Express default when a material has many historical lots.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
