import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: '../docs/openapi.json',
  output: {
    path: './src/app/core/api-client',
  },
  services: {
    asClass: true,
  },
  types: {
    enums: 'javascript',
  },
});
