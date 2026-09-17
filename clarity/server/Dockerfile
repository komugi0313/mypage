# Numinous Letters — container for Google Cloud (or any Docker host)
# Uses the official Playwright image, which ships Chromium + all system libs the
# headless browser needs (fonts, libnss, etc.) — so the founder's real engine
# runs the same as on a desktop. Build context MUST be the clarity/ folder so the
# engine JS and meishiban_pillars.html are included:
#   cd clarity && docker build -f server/Dockerfile -t numinous-letters .
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app
# bring the whole clarity/ tree (server reads ../*.js and ../meishiban_pillars.html)
COPY . /app/clarity
WORKDIR /app/clarity/server

RUN npm ci --omit=dev || npm install --omit=dev

ENV NODE_ENV=production
ENV CHART_ENGINE=full
# Cloud Run injects PORT (usually 8080); config.js reads it. EXPOSE for clarity.
EXPOSE 8080

CMD ["node", "src/server.js"]
