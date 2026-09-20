FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS dev

WORKDIR /app

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS build

WORKDIR /app

COPY . .
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_NAME="Quản lý phòng thí nghiệm"
ARG VITE_APP_SUBTITLE="Đặt lịch và vận hành thiết bị"
ARG VITE_ENABLE_RESEARCH_FEATURES=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_SUBTITLE=$VITE_APP_SUBTITLE
ENV VITE_ENABLE_RESEARCH_FEATURES=$VITE_ENABLE_RESEARCH_FEATURES
RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1
