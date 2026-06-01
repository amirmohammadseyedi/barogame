FROM node:20-alpine

WORKDIR /app

# فقط وابستگی‌ها داخل image — سورس از volume می‌آید (بدون rebuild برای تغییر کد)
COPY package.json package-lock.json ./
RUN npm ci

EXPOSE 8080

CMD ["npm", "run", "serve", "--", "--host", "0.0.0.0", "--port", "8080"]
