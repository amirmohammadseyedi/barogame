FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_DEBUG=0 \
    PORT=5000 \
    DATABASE_PATH=/app/data/arobazi.db

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py migrate.py user_session.py ./
COPY migrations ./migrations
COPY sql ./sql
COPY static ./static
COPY arobazi_multistep_builder.html ./

RUN mkdir -p /app/data

EXPOSE 5000

CMD ["python", "app.py"]
