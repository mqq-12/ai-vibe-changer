import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));
const errors = [];

if (manifest.manifest_version !== 3) errors.push("manifest_version 必须为 3");
if (manifest.permissions?.includes("<all_urls>")) errors.push("permissions 不允许包含 <all_urls>");
if (manifest.host_permissions?.some((value) => value.includes("<all_urls>"))) errors.push("host_permissions 不允许包含 <all_urls>");
if (!manifest.host_permissions?.includes("https://www.doubao.com/*")) errors.push("缺少 Doubao 官方聊天页面权限");

const referencedFiles = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  manifest.options_page,
  ...manifest.content_scripts.flatMap((entry) => [...(entry.js || []), ...(entry.css || [])])
].filter(Boolean);

for (const relativePath of referencedFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) errors.push(`manifest 引用的文件不存在：${relativePath}`);
}

const jsFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith(".js")) jsFiles.push(fullPath);
  }
}
walk(path.join(root, "src"));

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`${path.relative(root, file)} 语法检查失败：\n${result.stderr}`);
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`验证通过：Manifest V3，${referencedFiles.length} 个引用文件，${jsFiles.length} 个 JavaScript 文件。`);
