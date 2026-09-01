# Force clean rebuild for image fixes
# Base image
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install pnpm
# Versión fijada a propósito: `npm install -g pnpm` sin versión traía la última
# publicada, así que un cambio de comportamiento de pnpm rompía el build sin que
# nadie tocara el repositorio (fue lo que pasó con ERR_PNPM_IGNORED_BUILDS).
# La línea 10 es la compatible con Node 18 y con lockfileVersion 9.0.
RUN npm install -g pnpm@10

# Copy package files
# pnpm-workspace.yaml lleva la autorización de scripts de instalación (sharp).
# Faltaba en este COPY, así que dentro de la imagen pnpm no veía ninguna
# decisión y abortaba con ERR_PNPM_IGNORED_BUILDS: esa era la causa del fallo.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose the application port
EXPOSE 3000

# Start the application in production mode
CMD ["sh", "-c", "pnpm run migration:run:prod && pnpm run start:prod"]
