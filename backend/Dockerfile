# The NagarFlow API. The road network is mounted at run time, never copied in.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt .
# Large wheels such as OR-Tools can be slow to download, so allow for it.
RUN pip install --no-cache-dir --default-timeout=120 --retries 5 -r requirements.txt

COPY app ./app
COPY scripts ./scripts

RUN useradd --create-home --uid 10001 app \n    && mkdir /data && chown app /data
USER app

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)"

# --proxy-headers trusts the proxy's scheme for redirects. The client address
# used for rate limiting comes from TRUSTED_PROXY_HOPS, not from this flag.
# fetch_roads.py downloads the roads file first on hosts with no mount, such as
# Render, and does nothing when the compose file has mounted it. PORT lets a
# host choose the port; the health check assumes the default of 8000.
CMD ["sh", "-c", "python scripts/fetch_roads.py && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
