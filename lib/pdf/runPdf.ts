import PDFDocument from "pdfkit";

// Self-contained shape the PDF needs (decoupled from internal types so the
// document module has no UI/runtime coupling).
export interface RunPdfData {
  generatedAt: string;
  order: {
    orderName: string;
    processedAt: string | null;
    fulfillmentStatus: string | null;
    product: { title: string; sku: string | null };
  } | null;
  contact: { name: string; email: string; phone?: string } | null;
  spec: { model: string; pdfUrl?: string } | null;
  answers: { prompt: string; value: string | string[] }[];
  diagnoses: {
    title: string;
    summary: string;
    steps: string[];
    partsTools?: string[];
    escalation?: string;
  }[];
  notes?: string;
}

const SKY = "#28A5DE";
const INK = "#2B2B2B";
const MUTED = "#6B7280";
const LINE = "#D7DBE0";

/** Render a branded one-document PDF of a completed run. */
export async function buildRunPdf(
  data: RunPdfData,
  logo: Buffer | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    const rule = () =>
      doc
        .moveTo(left, doc.y)
        .lineTo(right, doc.y)
        .lineWidth(1)
        .strokeColor(LINE)
        .stroke();

    const heading = (t: string) => {
      doc.moveDown(0.9);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(SKY)
        .text(t.toUpperCase(), { characterSpacing: 1 });
      doc.moveDown(0.3);
    };

    const kv = (label: string, value: string) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(INK)
        .text(`${label}:  `, { continued: true });
      doc.font("Helvetica").fillColor(INK).text(value);
    };

    // Header
    if (logo) {
      try {
        doc.image(logo, left, 46, { height: 24 });
      } catch {
        /* ignore a bad image — text header still renders */
      }
    }
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(INK)
      .text("Troubleshooting Summary", left, 84);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(new Date(data.generatedAt).toLocaleString());
    doc.moveDown(0.5);
    rule();

    // Product
    heading("Product");
    if (data.order) {
      const sku = data.order.product.sku
        ? ` (SKU ${data.order.product.sku})`
        : "";
      kv("Product", `${data.order.product.title}${sku}`);
      const bits = [data.order.orderName];
      if (data.order.processedAt)
        bits.push(
          `purchased ${new Date(data.order.processedAt).toLocaleDateString()}`,
        );
      if (data.order.fulfillmentStatus) bits.push(data.order.fulfillmentStatus);
      kv("Order", bits.join("  ·  "));
    } else if (data.spec) {
      kv("Product", `${data.spec.model} (entered manually)`);
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(MUTED).text("Not identified.");
    }
    if (data.spec?.pdfUrl) {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(INK)
        .text("Spec sheet:  ", { continued: true });
      doc
        .font("Helvetica")
        .fillColor(SKY)
        .text(data.spec.pdfUrl, { link: data.spec.pdfUrl, underline: true });
    }

    // Contact
    if (data.contact) {
      heading("Contact");
      kv("Name", data.contact.name || "—");
      kv("Email", data.contact.email || "—");
      if (data.contact.phone?.trim()) kv("Phone", data.contact.phone);
    }

    // Answers
    if (data.answers.length) {
      heading("Answers");
      for (const a of data.answers) {
        const v = Array.isArray(a.value) ? a.value.join(", ") : a.value;
        doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(a.prompt);
        doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(v || "—");
        doc.moveDown(0.35);
      }
    }

    // Possible causes
    if (data.diagnoses.length) {
      heading("Possible causes");
      data.diagnoses.forEach((d, i) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor(INK)
          .text(`${i + 1}.  ${d.title}`);
        doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(d.summary);
        if (d.steps?.length) {
          doc.moveDown(0.2);
          doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor(INK)
            .text("Suggested fix");
          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor(INK)
            .list([...d.steps], { bulletRadius: 1.6, textIndent: 12 });
        }
        if (d.partsTools?.length) {
          doc.moveDown(0.2);
          doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor(INK)
            .text("Parts & tools:  ", { continued: true });
          doc.font("Helvetica").fillColor(MUTED).text(d.partsTools.join(", "));
        }
        if (d.escalation) {
          doc.moveDown(0.2);
          doc
            .font("Helvetica-Oblique")
            .fontSize(9)
            .fillColor(MUTED)
            .text(`When to escalate: ${d.escalation}`);
        }
        doc.moveDown(0.6);
      });
    }

    // Agent notes
    if (data.notes?.trim()) {
      heading("Agent notes");
      doc.font("Helvetica").fontSize(10).fillColor(INK).text(data.notes.trim());
    }

    doc.end();
  });
}
