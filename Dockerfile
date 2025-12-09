FROM python:3.11-slim

# Sistem güncelleme ve temel bağımlılıklar (WeasyPrint ve docx2pdf için gerekenler basit tutuldu)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libffi-dev \
       libcairo2 \
       libpango-1.0-0 \
       libgdk-pixbuf2.0-0 \
       libssl-dev \
       libxml2 \
       libxslt1.1 \
       fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python bağımlılıkları
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama dosyaları
COPY . .

# Veri klasörü (Fly volume buraya mount edilecek)
RUN mkdir -p /data
ENV DATA_DIR=/data

# Gunicorn üzerinden Flask uygulamasını ayağa kaldır
EXPOSE 8080

CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]
