// @lovable.dev/vite-tanstack-config already includes the
// TanStack Start, React, Tailwind, Nitro and other required plugins.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";

export default defineConfig({
  tanstackStart: {
    server: {
      entry: "server",
    },
  },

  vite: {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,

      https: {
        key: fs.readFileSync(
          "cert/localhost-key.pem",
        ),
        cert: fs.readFileSync(
          "cert/localhost.pem",
        ),
      },
    },
  },
});