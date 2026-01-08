// lib/excelGeneratorNode.js

import ExcelJS from "exceljs";

/**
 * Generates a crew directory Excel file using ExcelJS
 * @param {string} title - Title for the document (e.g., "All Departments" or "Art Department")
 * @param {object} crewData - Crew data organized by position
 *   Single dept: { "Skill Name": [{ name: "..." }] }
 *   All depts:   { "Dept Name": { "Skill Name": [{ name: "..." }] } }
 * @returns {Promise<Buffer>} Excel file buffer
 */
export async function generateCrewExcelNode(title, crewData) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Crew List");

  // Set column widths
  worksheet.columns = [{ width: 25 }, { width: 25 }, { width: 25 }];

  // Define colors (no # prefix for Excel)
  const oliveGreen = "676900";
  const sageGreen = "C5C69F";

  let currentRow = 1;

  // Add title
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = "Freelancers Promotions";
  titleCell.font = {
    name: "Arial",
    size: 20,
    bold: true,
    color: { argb: oliveGreen },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  currentRow++;

  // Add subtitle
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const subtitleCell = worksheet.getCell(`A${currentRow}`);
  subtitleCell.value = "Crew List";
  subtitleCell.font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: oliveGreen },
  };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  currentRow += 2;

  // Add date
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const dateCell = worksheet.getCell(`A${currentRow}`);
  dateCell.value = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  dateCell.font = { name: "Arial", size: 11 };
  dateCell.alignment = { horizontal: "center", vertical: "middle" };
  currentRow += 3;

  // Detect if this is nested (all departments) or single department
  const isNested = Object.values(crewData).some(
    (value) => typeof value === "object" && !Array.isArray(value)
  );

  if (isNested) {
    // Multiple departments
    for (const [departmentName, skills] of Object.entries(crewData)) {
      currentRow = addDepartmentSection(
        worksheet,
        departmentName,
        skills,
        currentRow,
        sageGreen
      );
      currentRow += 2; // Extra spacing between departments
    }
  } else {
    // Single department
    currentRow = addDepartmentSection(
      worksheet,
      title,
      crewData,
      currentRow,
      sageGreen
    );
  }

  // Freeze panes (freeze header rows)
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 7 }];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Adds a department section to the worksheet
 * @param {Object} worksheet - ExcelJS worksheet
 * @param {string} departmentName - Name of the department
 * @param {Object} skills - Skills and crew members
 * @param {number} startRow - Starting row number
 * @param {string} sageGreen - Color for department header
 * @returns {number} - Next available row number
 */
function addDepartmentSection(
  worksheet,
  departmentName,
  skills,
  startRow,
  sageGreen
) {
  let currentRow = startRow;

  // Add department header
  worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const deptCell = worksheet.getCell(`A${currentRow}`);
  deptCell.value = departmentName;
  deptCell.font = {
    name: "Arial",
    size: 14,
    bold: true,
    color: { argb: "FFFFFF" },
  };
  deptCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: sageGreen },
  };
  deptCell.alignment = { horizontal: "center", vertical: "middle" };

  // Add border to department header
  ["A", "B", "C"].forEach((col) => {
    const cell = worksheet.getCell(`${col}${currentRow}`);
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  currentRow += 2;

  // Process each skill/position
  for (const [skillName, crewMembers] of Object.entries(skills)) {
    if (!crewMembers || crewMembers.length === 0) continue;

    // Add skill/position header
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const skillCell = worksheet.getCell(`A${currentRow}`);
    skillCell.value = skillName;
    skillCell.font = {
      name: "Arial",
      size: 12,
      bold: true,
    };
    skillCell.alignment = { horizontal: "left", vertical: "middle" };
    currentRow++;

    // Add crew members in 3-column layout
    let colIndex = 0;
    crewMembers.forEach((member) => {
      const name = member.name || member.fullName || "Unknown";
      const colLetter = String.fromCharCode(65 + colIndex); // A, B, C

      const cell = worksheet.getCell(`${colLetter}${currentRow}`);
      cell.value = name;
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { horizontal: "left", vertical: "middle" };

      colIndex++;

      // Move to next row after 3 columns
      if (colIndex >= 3) {
        colIndex = 0;
        currentRow++;
      }
    });

    // If last row wasn't complete, move to next row
    if (colIndex > 0) {
      currentRow++;
    }

    // Add spacing between skills
    currentRow++;
  }

  return currentRow;
}
