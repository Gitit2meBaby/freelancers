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
      // 🚨 IMPORTANT: disable autoFirstPage
      const doc = new PDFDocument({
        size: "letter",
        margins: {
          top: 72,
          bottom: 72,
          left: 54,
          right: 54,
        },
        autoFirstPage: false,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      /**
       * ------------------------------------------------------
       * FONT REGISTRATION (BEFORE ANY PAGE EXISTS)
       * ------------------------------------------------------
       */

      const fontsDir = path.join(process.cwd(), "app", "fonts");

      const FONT_FALLBACK = path.join(fontsDir, "ClashGrotesk-Medium.ttf");
      if (!fs.existsSync(FONT_FALLBACK)) {
        throw new Error("Required font missing: ClashGrotesk-Medium.ttf");
      }

      doc.registerFont("Body", FONT_FALLBACK);

      let hasMedium = false;
      let hasBold = false;

      const regularFont = path.join(fontsDir, "ClashGrotesk-Regular.ttf");
      const boldFont = path.join(fontsDir, "ClashGrotesk-Semibold.ttf");

      if (fs.existsSync(regularFont)) {
        doc.registerFont("Body-Medium", regularFont);
        hasMedium = true;
      }

      if (fs.existsSync(boldFont)) {
        doc.registerFont("Body-Bold", boldFont);
        hasBold = true;
      }

      doc.on("pageAdded", () => {
        doc.font("Body");
      });

      /**
       * ------------------------------------------------------
       * CREATE FIRST PAGE (SAFE)
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

      /**
       * ------------------------------------------------------
       * HEADER
       * ------------------------------------------------------
       */

      doc.fontSize(24).fillColor(oliveGreen);
      doc.font(hasBold ? "Body-Bold" : "Body");
      doc.text("Freelancers Promotions", { align: "center" });
      doc.moveDown(0.3);

      doc.fontSize(18);
      doc.text("Crew List", { align: "center" });
      doc.moveDown(0.5);

      const currentDate = new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      doc.fontSize(11).fillColor("#000000");
      doc.font("Body");
      doc.text(currentDate, { align: "center" });
      doc.moveDown(1);

      /**
       * ------------------------------------------------------
       * CONTENT
       * ------------------------------------------------------
       */

      const isNested = Object.values(crewData).some(
        (value) => typeof value === "object" && !Array.isArray(value)
      );

      if (isNested) {
        renderMultipleDepartments(doc, crewData, sageGreen);
      } else {
        renderSingleDepartment(doc, title, crewData, sageGreen);
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

function renderMultipleDepartments(doc, crewData, sageGreen) {
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  for (const [departmentName, skills] of Object.entries(crewData)) {
    if (doc.y > doc.page.height - 300) {
      doc.addPage();
    }

    const headerY = doc.y;
    doc
      .rect(doc.page.margins.left, headerY, pageWidth, 25)
      .fillColor(sageGreen)
      .fill();

    doc.fontSize(14).fillColor("#FFFFFF");
    doc.font(hasBold ? "Body-Bold" : "Body");
    doc.text(departmentName, doc.page.margins.left + 6, headerY + 6, {
      width: pageWidth - 12,
    });

    doc.moveDown(1.5);
    renderSkills(doc, skills, pageWidth);
    doc.moveDown(1);
  }
}

function renderSingleDepartment(doc, departmentName, crewData, sageGreen) {
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const headerY = doc.y;
  doc
    .rect(doc.page.margins.left, headerY, pageWidth, 25)
    .fillColor(sageGreen)
    .fill();

  doc.fontSize(14).fillColor("#FFFFFF");
  doc.font(hasBold ? "Body-Bold" : "Body");
  doc.text(departmentName, doc.page.margins.left + 6, headerY + 6, {
    width: pageWidth - 12,
  });

  doc.moveDown(1.5);
  renderSkills(doc, crewData, pageWidth);
}

function renderSkills(doc, skills, pageWidth) {
  for (const [skillName, crewMembers] of Object.entries(skills)) {
    if (!crewMembers?.length) continue;

    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    doc.fontSize(12).fillColor("#000000");
    doc.font(hasBold ? "Body-Bold" : "Body");
    doc.text(skillName);
    doc.moveDown(0.3);

    const columnWidth = pageWidth / 3;
    const startX = doc.page.margins.left;
    let currentY = doc.y;

    doc.fontSize(10);
    doc.font("Body");

    crewMembers.forEach((member, index) => {
      const name = member.name || member.fullName || "Unknown";
      const column = index % 3;
      const x = startX + column * columnWidth;

      if (column === 0 && index > 0) {
        currentY += 15;
      }

      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      doc.text(name, x, currentY, {
        width: columnWidth - 10,
      });
    });

    const rows = Math.ceil(crewMembers.length / 3);
    doc.y = currentY + rows * 15 + 10;
    doc.moveDown(0.5);
  }
}
