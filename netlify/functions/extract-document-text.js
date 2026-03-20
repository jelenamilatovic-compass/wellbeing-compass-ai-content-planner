import mammoth from "mammoth";
import pdf from "pdf-parse";

async function readRequestBody(req) {
  const arrayBuffer = await req.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) {
    throw new Error("Missing multipart boundary.");
  }

  const boundary = `--${boundaryMatch[1]}`;
  const body = buffer.toString("binary");
  const parts = body.split(boundary).filter(
    (part) => part.trim() && part.trim() !== "--"
  );

  for (const part of parts) {
    const [rawHeaders, rawContent] = part.split("\r\n\r\n");
    if (!rawHeaders || !rawContent) continue;

    const disposition = rawHeaders.match(/name="([^"]+)"/);
    const filename = rawHeaders.match(/filename="([^"]+)"/);

    if (disposition?.[1] === "file" && filename?.[1]) {
      const contentTypeMatch = rawHeaders.match(/Content-Type:\s([^\r\n]+)/i);
      const content = rawContent.replace(/\r\n--$/, "").replace(/\r\n$/, "");
      return {
        filename: filename[1],
        contentType: contentTypeMatch?.[1] || "",
        buffer: Buffer.from(content, "binary"),
      };
    }
  }

  throw new Error("File not found in multipart form data.");
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await readRequestBody(req);
    const contentType = req.headers.get("content-type") || "";
    const file = parseMultipart(rawBody, contentType);

    const ext = file.filename.toLowerCase().split(".").pop();

    let text = "";

    if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value || "";
    } else if (ext === "pdf") {
      const result = await pdf(file.buffer);
      text = result.text || "";
    } else {
      return new Response(JSON.stringify({ error: "Unsupported file type." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error?.message || "Document extraction failed.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
