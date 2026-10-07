FROM python:3.12-slim
WORKDIR /app
COPY requirements-lock.txt .
RUN pip install --no-cache-dir -r requirements-lock.txt
COPY app ./app
RUN useradd --create-home workforce && mkdir /data && chown workforce /data
USER workforce
ENV DATABASE_URL=sqlite:////data/workforce.db
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
