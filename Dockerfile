# Docker Hub mirror: 毫秒镜像 https://1ms.run/guide
# Override with --build-arg DOCKER_REGISTRY=docker.io to use Docker Hub.
ARG DOCKER_REGISTRY=docker.1ms.run
ARG DEV_RUNTIME=render-runtime
FROM ${DOCKER_REGISTRY}/library/node:24-bookworm-slim AS node-toolchain

FROM node-toolchain AS web
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY} pnpm_config_registry=${NPM_REGISTRY}
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/require-pnpm.mjs ./scripts/require-pnpm.mjs
RUN --mount=type=cache,id=phyexp-corepack,target=/root/.cache/node/corepack \
    --mount=type=cache,id=phyexp-pnpm-v11,target=/pnpm/store \
    --mount=type=cache,id=phyexp-pnpm-metadata,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --prefer-offline --store-dir=/pnpm/store
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN --mount=type=cache,id=phyexp-corepack,target=/root/.cache/node/corepack pnpm build

FROM ${DOCKER_REGISTRY}/library/golang:1.27-bookworm AS go-toolchain

FROM go-toolchain AS server
ARG GOPROXY=https://goproxy.cn,direct
WORKDIR /src/server
COPY server/go.mod server/go.sum ./
RUN --mount=type=cache,id=phyexp-go-mod,target=/go/pkg/mod go mod download
COPY server ./
RUN --mount=type=cache,id=phyexp-go-mod,target=/go/pkg/mod \
    --mount=type=cache,id=phyexp-go-build,target=/root/.cache/go-build \
    report_revision=$(find . -type f -not -path './testdata/*' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d ' ' -f1) \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.revision=${report_revision}" -o /reportd ./cmd/reportd

FROM ${DOCKER_REGISTRY}/library/debian:bookworm-slim AS debian-base
# The slim image has no CA bundle yet; apt still verifies Debian signatures.
ARG DEBIAN_MIRROR=http://mirrors.aliyun.com
RUN sed -i "s|http://deb.debian.org|${DEBIAN_MIRROR}|g" /etc/apt/sources.list.d/debian.sources
COPY deploy/apt-network.conf /etc/apt/apt.conf.d/80-report-network

# Common system packages are installed once for development and production.
FROM debian-base AS runtime-base
RUN --mount=type=cache,id=phyexp-apt-archives,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=phyexp-apt-lists,target=/var/lib/apt/lists,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tzdata texlive-binaries fontconfig fonts-noto-cjk imagemagick libheif1 \
    && groupadd --gid 10001 report && useradd --uid 10001 --gid report --create-home report \
    && mkdir -p /data && chown report:report /data \
    && ln -sf xetex /usr/bin/xelatex

FROM runtime-base AS tex-assets
RUN --mount=type=cache,id=phyexp-apt-archives,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=phyexp-apt-lists,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    texlive-xetex texlive-lang-chinese texlive-latex-extra \
    texlive-fonts-recommended texlive-pictures
# Keep TeX resources without optional Python tools from the metapackages.
FROM runtime-base AS render-runtime
COPY --from=tex-assets /usr/share/texlive /usr/share/texlive
COPY --from=tex-assets /usr/share/texmf /usr/share/texmf
COPY --from=tex-assets /var/lib/texmf /var/lib/texmf
COPY --from=tex-assets /etc/texmf /etc/texmf
COPY deploy/imagemagick-policy.xml /etc/ImageMagick-6/policy.xml
RUN ! command -v python && ! command -v python3 && kpsewhich ctexart.cls && kpsewhich FandolSong-Regular.otf

# No frontend install/build or application compilation is needed for this image.
FROM ${DEV_RUNTIME} AS development
USER root
COPY --from=go-toolchain /usr/local/go /usr/local/go
COPY --from=node-toolchain /usr/local/bin/node /usr/local/bin/node
ENV PATH=/usr/local/go/bin:$PATH CGO_ENABLED=0 GOPROXY=https://goproxy.cn,direct \
    GOMODCACHE=/home/report/go/pkg/mod GOCACHE=/home/report/.cache/go-build \
    REPORT_DEV_BINARY=/home/report/bin/reportd REPORT_ENV=development \
    REPORT_HOST=0.0.0.0 REPORT_PORT=8000 REPORT_DATA_DIR=/data \
    REPORT_TEMPLATE_DIR=/workspace/tex/templates REPORT_STATIC_DIR= REPORT_COOKIE_SECURE=0 TZ=Asia/Shanghai
RUN mkdir -p /home/report/go/pkg/mod /home/report/.cache/go-build /home/report/bin \
    && chown -R report:report /home/report
WORKDIR /workspace
USER report
RUN node --version && go version
EXPOSE 8000
HEALTHCHECK --interval=5s --timeout=3s --start-period=180s CMD ["/home/report/bin/reportd", "--healthcheck"]
ENTRYPOINT ["node", "scripts/backend-watch.mjs"]

FROM render-runtime AS runtime
WORKDIR /app
COPY --from=server /reportd /app/reportd
COPY --from=web /src/dist /app/web
COPY tex/templates /app/tex/templates
ENV REPORT_ENV=production REPORT_HOST=0.0.0.0 REPORT_PORT=8000 \
    REPORT_DATA_DIR=/data REPORT_TEMPLATE_DIR=/app/tex/templates REPORT_STATIC_DIR=/app/web \
    TZ=Asia/Shanghai
USER report
EXPOSE 8000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["/app/reportd", "--healthcheck"]
ENTRYPOINT ["/app/reportd"]
