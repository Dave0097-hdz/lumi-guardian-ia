FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    python3.11 python3.11-venv python3-pip \
    ufw curl \
    && rm -rf /var/lib/apt/lists/*

# Logs simulados para pruebas locales
RUN mkdir -p /var/log/nginx && \
    touch /var/log/auth.log /var/log/nginx/access.log

WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

# Variables se inyectan vía docker-compose environment, NUNCA aquí
CMD ["python3", "-m", "src.main"]
