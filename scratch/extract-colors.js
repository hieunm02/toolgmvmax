const fs = require("fs");
const path = require("path");

function main() {
  const filePath = path.join(__dirname, "../src/app/page.tsx");
  const content = fs.readFileSync(filePath, "utf8");

  // Regex to match classes
  const bgRegex = /bg-\[#[a-fA-F0-9]{3,8}\]/g;
  const bgAlphaRegex = /bg-\[#[a-fA-F0-9]{3,8}\]\/\d{1,3}/g;
  const borderRegex = /border-\[#[a-fA-F0-9]{3,8}\]/g;
  const borderAlphaRegex = /border-\[#[a-fA-F0-9]{3,8}\]\/\d{1,3}/g;
  const textGrayRegex = /text-gray-\d{3}/g;

  const uniqueBgs = new Set(content.match(bgRegex) || []);
  const uniqueBgAlphas = new Set(content.match(bgAlphaRegex) || []);
  const uniqueBorders = new Set(content.match(borderRegex) || []);
  const uniqueBorderAlphas = new Set(content.match(borderAlphaRegex) || []);
  const uniqueTextGrays = new Set(content.match(textGrayRegex) || []);

  console.log("=== UNIQUE BACKGROUND COLORS ===");
  uniqueBgs.forEach(c => console.log(c));
  uniqueBgAlphas.forEach(c => console.log(c));

  console.log("\n=== UNIQUE BORDERS ===");
  uniqueBorders.forEach(c => console.log(c));
  uniqueBorderAlphas.forEach(c => console.log(c));

  console.log("\n=== UNIQUE TEXT GRAYS ===");
  uniqueTextGrays.forEach(c => console.log(c));
}

main();
