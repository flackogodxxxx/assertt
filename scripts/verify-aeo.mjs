import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

const read = (path) => readFileSync(join(root, path), "utf8");

const expectFile = (path) => {
  if (!existsSync(join(root, path))) {
    failures.push(`${path} nao existe.`);
    return "";
  }

  return read(path);
};

const rootRobots = expectFile("robots.txt");
const publicRobots = expectFile("public/robots.txt");
const rootLlms = expectFile("llms.txt");
const publicLlms = expectFile("public/llms.txt");
const html = expectFile("index.html");

for (const [agent, directive] of [
  ["OAI-SearchBot", "Allow: /"],
  ["ChatGPT-User", "Allow: /"],
  ["PerplexityBot", "Allow: /"],
  ["CCBot", "Disallow: /"],
  ["GPTBot", "Disallow: /"]
]) {
  if (!rootRobots.includes(`User-agent: ${agent}`) || !rootRobots.includes(directive)) {
    failures.push(`robots.txt nao contem ${agent} com ${directive}.`);
  }
}

if (rootRobots !== publicRobots) {
  failures.push("public/robots.txt precisa refletir robots.txt.");
}

for (const service of ["Tráfego Pago", "SEO", "CRO"]) {
  if (!rootLlms.includes(service)) {
    failures.push(`llms.txt nao menciona ${service}.`);
  }
}

if (rootLlms !== publicLlms) {
  failures.push("public/llms.txt precisa refletir llms.txt.");
}

for (const schemaType of ['"@type": "Organization"', '"@type": "ProfessionalService"']) {
  if (!html.includes(schemaType)) {
    failures.push(`index.html nao contem schema ${schemaType}.`);
  }
}

const sourceFiles = [];
const collectSourceFiles = (directory) => {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const relative = absolute.slice(root.length + 1).replaceAll("\\", "/");
    const stats = statSync(absolute);

    if (stats.isDirectory()) {
      if (entry !== "node_modules" && entry !== "dist") {
        collectSourceFiles(absolute);
      }
      continue;
    }

    if (/\.(ts|tsx|css|html|svg|txt)$/.test(entry)) {
      sourceFiles.push(relative);
    }
  }
};

collectSourceFiles(join(root, "src"));
collectSourceFiles(join(root, "public"));
sourceFiles.push("index.html", "robots.txt", "llms.txt");

for (const file of sourceFiles) {
  const content = read(file);

  if (/\bexport\s+default\b/.test(content)) {
    failures.push(`${file} usa default export.`);
  }

  if (/#[0-9a-fA-F]{3,8}\b/.test(content)) {
    failures.push(`${file} contem cor hexadecimal hardcoded.`);
  }

  if (/\/index\.tsx?$/.test(file)) {
    failures.push(`${file} e um barrel/index interno proibido.`);
  }

  if (/import\(["']react["']\)/.test(content)) {
    failures.push(`${file} importa React dinamicamente.`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("AEO, schemas e restricoes arquiteturais verificados.");
