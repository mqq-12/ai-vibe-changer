import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.join(root, "manifest.json"), path.join(dist, "manifest.json"));
fs.cpSync(path.join(root, "src"), path.join(dist, "src"), { recursive: true });
fs.copyFileSync(path.join(root, "README.md"), path.join(dist, "README.md"));
fs.copyFileSync(path.join(root, "手动加载与验证.md"), path.join(dist, "手动加载与验证.md"));

let fileCount = 0;
let totalBytes = 0;
function count(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) count(fullPath);
    else {
      fileCount += 1;
      totalBytes += fs.statSync(fullPath).size;
    }
  }
}
count(dist);
console.log(`扩展构建完成：dist/，${fileCount} 个文件，${totalBytes} bytes。`);

