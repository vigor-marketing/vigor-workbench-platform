FROM node:22-alpine AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/bff/package.json apps/bff/package.json
RUN pnpm install --frozen-lockfile

COPY apps/bff apps/bff
RUN pnpm --filter @vigor/workbench-bff build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=build /workspace/package.json ./
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/bff/package.json apps/bff/package.json
COPY --from=build /workspace/apps/bff/node_modules apps/bff/node_modules
COPY --from=build /workspace/apps/bff/dist apps/bff/dist

USER node
EXPOSE 4000
CMD ["node", "apps/bff/dist/main.js"]
