const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const routes = require("./routes");
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(helmet());

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.trim().replace(/\/$/, "");

      // 1. Orígenes configurados explícitamente en CLIENT_URL o localhost
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.includes("localhost") ||
        normalizedOrigin.includes("127.0.0.1")
      ) {
        return callback(null, true);
      }

      // 2. Permitir cualquier despliegue en Vercel (*.vercel.app)
      if (
        normalizedOrigin.endsWith(".vercel.app") ||
        normalizedOrigin.includes("vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },

    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json());
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
