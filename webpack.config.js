import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    mode: "production",
    target: "node",

    entry: "./src/index.js",

    experiments: {
        outputModule: true
    },

    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "app.js",
        module: true
    }
};