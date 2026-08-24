import { config } from "dotenv";

// Integration tests run outside Next.js, so load the app env file explicitly.
config({ path: ".env.local", quiet: true });
