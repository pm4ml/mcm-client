FROM node:20-alpine as builder

RUN apk add --no-cache git python3 build-base

EXPOSE 3000

WORKDIR ~/src/

# This is super-ugly, but it means we don't have to re-run npm install every time any of the source
# files change- only when any dependencies change- which is a superior developer experience when
# relying on docker-compose.
COPY ./src/package.json ./package.json
COPY ./src/package-lock.json ./package-lock.json
COPY ./src/lib/log/package.json ./lib/log/package.json
COPY ./src/lib/model/package.json ./lib/model/package.json
COPY ./src/lib/requests/package.json ./lib/requests/package.json
RUN npm ci --production

FROM node:20-alpine

ARG BUILD_DATE
ARG VCS_URL
ARG VCS_REF
ARG VERSION

# See http://label-schema.org/rc1/ for label schema info
LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.name="mojaloop-payment-manager-management-api-service"
LABEL org.label-schema.build-date=$BUILD_DATE
LABEL org.label-schema.vcs-url=$VCS_URL
LABEL org.label-schema.vcs-ref=$VCS_REF
LABEL org.label-schema.url="https://mojaloop.io/"
LABEL org.label-schema.version=$VERSION

# COPY --from=builder ./src/ /src
# RUN npm prune --production
# COPY ./src /src

COPY --from=builder ~/src/ /src
COPY ./src /src

CMD ["node", "/src/index.js"]
