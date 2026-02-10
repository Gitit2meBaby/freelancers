// scripts/formatLogoBase64.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Formats a base64 string for email compatibility by breaking it into lines
 * @param {string} base64String - The base64 string to format
 * @param {number} lineLength - Maximum characters per line (default: 70)
 * @returns {string} Formatted base64 string with line breaks
 */
function formatBase64ForEmail(base64String, lineLength = 70) {
  // Extract the data URL prefix (e.g., "data:image/png;base64,")
  const match = base64String.match(/^(data:[^,]+,)/);
  if (!match) {
    throw new Error("Invalid base64 data URL format");
  }

  const prefix = match[1];
  const base64Data = base64String.slice(prefix.length);

  // Break the base64 data into lines
  const lines = [];
  for (let i = 0; i < base64Data.length; i += lineLength) {
    lines.push(base64Data.slice(i, i + lineLength));
  }

  // Rejoin with line breaks
  return prefix + "\n" + lines.join("\n");
}

/**
 * Process the logoBase64.js file
 */
function processLogoFile() {
  const inputPath = path.join(__dirname, "../app/lib/logoBase64.js");
  const outputPath = path.join(__dirname, "../app/lib/logoBase64Formatted.js");

  console.log("📖 Reading logoBase64.js...");

  // Read the file
  let content = fs.readFileSync(inputPath, "utf8");

  // Extract the base64 string using regex
  const regex = /export const LOGO_BASE64 =\s*["'`]([^"'`]+)["'`]/s;
  const match = content.match(regex);

  if (!match) {
    throw new Error("Could not find LOGO_BASE64 export in file");
  }

  const originalBase64 = match[1];
  console.log(`✅ Found base64 string (${originalBase64.length} characters)`);

  // Format the base64 string
  console.log("🔧 Formatting base64 string...");
  const formattedBase64 = formatBase64ForEmail(originalBase64);

  // Create the new file content
  const newContent = `// Auto-generated formatted base64 for email compatibility
// Original length: ${originalBase64.length} characters
// Formatted with 70-character lines for RFC 2045 compliance

export const LOGO_BASE64_FORMATTED = \`${formattedBase64}\`;
`;

  // Write the formatted version
  fs.writeFileSync(outputPath, newContent, "utf8");

  console.log(`✅ Created formatted file: ${outputPath}`);
  console.log(`📊 Line count: ${formattedBase64.split("\n").length - 1} lines`);

  // Also update the original file in-place if desired
  const updateOriginal = process.argv.includes("--update-original");
  if (updateOriginal) {
    const updatedContent = `export const LOGO_BASE64 = \`${formattedBase64}\`;
`;
    fs.writeFileSync(inputPath, updatedContent, "utf8");
    console.log(`✅ Updated original file: ${inputPath}`);
  }
}

// Run the script
try {
  processLogoFile();
  console.log(
    "\n✨ Done! You can now use the formatted base64 in email templates.",
  );
  console.log("\nUsage in email templates:");
  console.log(
    '  import { LOGO_BASE64_FORMATTED } from "./logoBase64Formatted";',
  );
  console.log('  <img src="${LOGO_BASE64_FORMATTED}" alt="Logo" />');
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
