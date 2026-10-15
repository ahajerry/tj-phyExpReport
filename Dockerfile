# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS web
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/require-pnpm.mjs ./scripts/require-pnpm.mjs
RUN pnpm install --frozen-lockfile
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN pnpm build

FROM golang:1.27-bookworm AS server
WORKDIR /src/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server ./
RUN report_revision=$(find . -type f -not -path './testdata/*' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d ' ' -f1) \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.revision=${report_revision}" -o /reportd ./cmd/reportd

FROM debian:bookworm-slim AS tex-assets
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tzdata texlive-xetex texlive-lang-chinese texlive-latex-extra \
    texlive-fonts-recommended texlive-pictures fonts-noto-cjk \
    imagemagick libheif1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 report && useradd --uid 10001 --gid report --create-home report \
    && mkdir -p /data && chown report:report /data
# Keep TeX data and generated formats, without the optional Python tools pulled
# in by Debian's texlive-latex-extra/texlive-pictures metapackages.
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tzdata texlive-binaries fontconfig fonts-noto-cjk imagemagick libheif1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 report && useradd --uid 10001 --gid report --create-home report \
    && mkdir -p /data && chown report:report /data \
    && ln -sf xetex /usr/bin/xelatex
COPY --from=tex-assets /usr/share/texlive /usr/share/texlive
COPY --from=tex-assets /usr/share/texmf /usr/share/texmf
COPY --from=tex-assets /var/lib/texmf /var/lib/texmf
COPY --from=tex-assets /etc/texmf /etc/texmf
RUN ! command -v python && ! command -v python3 && kpsewhich ctexart.cls && kpsewhich FandolSong-Regular.otf
WORKDIR /app
COPY --from=server /reportd /app/reportd
COPY --from=web /src/dist /app/web
COPY tex/templates /app/tex/templates
COPY deploy/imagemagick-policy.xml /etc/ImageMagick-6/policy.xml
ENV REPORT_ENV=production REPORT_HOST=0.0.0.0 REPORT_PORT=8000 \
    REPORT_DATA_DIR=/data REPORT_TEMPLATE_DIR=/app/tex/templates REPORT_STATIC_DIR=/app/web \
    TZ=Asia/Shanghai
USER report
EXPOSE 8000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["/app/reportd", "--healthcheck"]
ENTRYPOINT ["/app/reportd"]
