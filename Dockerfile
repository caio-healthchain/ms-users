FROM node:18-alpine

WORKDIR /app

# Instalar dependências necessárias para o Prisma no Alpine Linux
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat \
    curl

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar Prisma Client com engine específico para Alpine
RUN npx prisma generate

# Build do projeto TypeScript
RUN npm run build

# Remover devDependencies após build
RUN npm ci --only=production && npm cache clean --force

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Mudar ownership dos arquivos para o usuário nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor porta
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

# Comando de inicialização
CMD ["npm", "start"]
