import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

/**
 * Generates a crew directory PDF using PDFKit
 * @param {string} title
 * @param {object} crewData
 * @returns {Promise<Buffer>}
 */
export async function generateCrewPDFNode(title, crewData) {
  return new Promise((resolve, reject) => {
    try {
      /**
       * ------------------------------------------------------
       * FONT PATHS - VERIFY BEFORE DOCUMENT CREATION
       * ------------------------------------------------------
       */
      const fontsDir = path.join(process.cwd(), "app", "fonts");
      const FONT_FALLBACK = path.join(fontsDir, "ClashGrotesk-Medium.ttf");

      if (!fs.existsSync(FONT_FALLBACK)) {
        throw new Error(`Required font missing: ${FONT_FALLBACK}`);
      }

      const regularFont = path.join(fontsDir, "ClashGrotesk-Regular.ttf");
      const boldFont = path.join(fontsDir, "ClashGrotesk-Semibold.ttf");

      const hasMedium = fs.existsSync(regularFont);
      const hasBold = fs.existsSync(boldFont);

      /**
       * ------------------------------------------------------
       * LOAD LOGO IMAGE
       * ------------------------------------------------------
       */
      const logoPath = path.join(process.cwd(), "app", "logo.png");
      const hasLogo = fs.existsSync(logoPath);

      /**
       * ------------------------------------------------------
       * CREATE PDF DOCUMENT WITH CUSTOM FONT
       * ------------------------------------------------------
       */
      const doc = new PDFDocument({
        size: "letter",
        margins: {
          top: 72,
          bottom: 72,
          left: 54,
          right: 54,
        },
        autoFirstPage: false,
        font: FONT_FALLBACK,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      /**
       * ------------------------------------------------------
       * FONT REGISTRATION
       * ------------------------------------------------------
       */
      doc.registerFont("Body", FONT_FALLBACK);

      if (hasMedium) {
        doc.registerFont("Body-Medium", regularFont);
      }

      if (hasBold) {
        doc.registerFont("Body-Bold", boldFont);
      }

      // Set default font for all new pages
      doc.on("pageAdded", () => {
        doc.font("Body");
      });

      /**
       * ------------------------------------------------------
       * CREATE FIRST PAGE
       * ------------------------------------------------------
       */
      doc.addPage();
      doc.font("Body");

      /**
       * ------------------------------------------------------
       * COLORS
       * ------------------------------------------------------
       */
      const oliveGreen = "#676900";
      const sageGreen = "#c5c69f";
      const backgroundColor = "#c5c69f"; // For header background

      /**
       * ------------------------------------------------------
       * HEADER WITH LOGO
       * ------------------------------------------------------
       */
      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const headerHeight = 150; // ✅ INCREASED padding bottom

      // Draw header background rectangle
      doc
        .rect(
          doc.page.margins.left,
          doc.page.margins.top,
          pageWidth,
          headerHeight
        )
        .fillColor(backgroundColor)
        .fill();

      // Add logo if available (centered, near top of header)
      if (hasLogo) {
        const logoWidth = 200; // Adjust based on logo proportions
        const logoHeight = 44; // Maintain aspect ratio (300x66 original)
        const logoX = (doc.page.width - logoWidth) / 2;
        const logoY = doc.page.margins.top + 20;

        doc.image(logoPath, logoX, logoY, {
          width: logoWidth,
          height: logoHeight,
        });
      }

      // Title "Crew List" - centered below logo
      const titleY = doc.page.margins.top + (hasLogo ? 80 : 30);
      doc.fontSize(24).fillColor(oliveGreen);
      doc.font(hasBold ? "Body-Bold" : "Body");
      doc.text("Crew List", doc.page.margins.left, titleY, {
        width: pageWidth,
        align: "center",
      });

      // Date - centered below title
      const currentDate = new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const dateY = titleY + 40;
      doc.fontSize(11).fillColor(oliveGreen);
      doc.font("Body");
      doc.text(currentDate, doc.page.margins.left, dateY, {
        width: pageWidth,
        align: "center",
      });

      // Set Y position after header with more spacing
      doc.y = doc.page.margins.top + headerHeight + 40;

      /**
       * ------------------------------------------------------
       * CONTENT
       * ------------------------------------------------------
       */
      const isNested = Object.values(crewData).some(
        (value) => typeof value === "object" && !Array.isArray(value)
      );

      if (isNested) {
        renderMultipleDepartments(
          doc,
          crewData,
          sageGreen,
          oliveGreen,
          hasBold
        );
      } else {
        renderSingleDepartment(
          doc,
          title,
          crewData,
          sageGreen,
          oliveGreen,
          hasBold
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * ------------------------------------------------------
 * RENDERING HELPERS
 * ------------------------------------------------------
 */

function renderMultipleDepartments(
  doc,
  crewData,
  sageGreen,
  oliveGreen,
  hasBold
) {
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  for (const [departmentName, skills] of Object.entries(crewData)) {
    if (doc.y > doc.page.height - 300) {
      doc.addPage();
    }

    const headerY = doc.y;

    // Department header background
    doc
      .rect(doc.page.margins.left, headerY, pageWidth, 30)
      .fillColor(sageGreen)
      .fill();

    // Department name - CENTERED in dark olive green like "Crew List"
    doc.fontSize(16).fillColor(oliveGreen); // ✅ DARK OLIVE GREEN
    doc.font(hasBold ? "Body-Bold" : "Body");
    doc.text(departmentName, doc.page.margins.left + 10, headerY + 8, {
      width: pageWidth - 20,
      align: "center", // ✅ CENTERED like "Crew List"
    });

    doc.y = headerY + 35; // Move down after header
    renderSkills(doc, skills, pageWidth, hasBold);
    doc.moveDown(1);
  }
}

function renderSingleDepartment(
  doc,
  departmentName,
  crewData,
  sageGreen,
  oliveGreen,
  hasBold
) {
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const headerY = doc.y;

  // Department header background
  doc
    .rect(doc.page.margins.left, headerY, pageWidth, 30)
    .fillColor(sageGreen)
    .fill();

  // Department name - CENTERED in dark olive green like "Crew List"
  doc.fontSize(16).fillColor(oliveGreen); // ✅ DARK OLIVE GREEN
  doc.font(hasBold ? "Body-Bold" : "Body");
  doc.text(departmentName, doc.page.margins.left + 10, headerY + 8, {
    width: pageWidth - 20,
    align: "center", // ✅ CENTERED like "Crew List"
  });

  doc.y = headerY + 35; // Move down after header
  renderSkills(doc, crewData, pageWidth, hasBold);
}

function renderSkills(doc, skills, pageWidth, hasBold) {
  for (const [skillName, crewMembers] of Object.entries(skills)) {
    if (!crewMembers?.length) continue;

    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    // Skill name - bold, left-aligned
    doc.fontSize(13).fillColor("#000000");
    doc.font(hasBold ? "Body-Bold" : "Body");
    doc.text(skillName, doc.page.margins.left, doc.y);
    doc.moveDown(0.5);

    const columnWidth = pageWidth / 3;
    const startX = doc.page.margins.left;
    let currentY = doc.y;

    doc.fontSize(11);
    doc.font("Body");

    crewMembers.forEach((member, index) => {
      const name = member.name || member.fullName || "Unknown";
      const column = index % 3;
      const x = startX + column * columnWidth;

      if (column === 0 && index > 0) {
        currentY += 18; // Row spacing
      }

      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      doc.text(name, x, currentY, {
        width: columnWidth - 10,
        align: "left",
      });
    });

    const rows = Math.ceil(crewMembers.length / 3);
    doc.y = currentY + rows * 18 + 15;
    doc.moveDown(0.5);
  }
}
