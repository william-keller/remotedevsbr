import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

const PDF_FILENAMES = {
  pt: "LinkedIn_Performance_Playbook_pt-BR.pdf",
  en: "LinkedIn_Performance_Playbook.pdf",
} as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> }
): Promise<Response> {
  const { lang } = await params;
  const filename = PDF_FILENAMES[lang as keyof typeof PDF_FILENAMES];
  if (!filename) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const result = await get(filename, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("ebook download failed", err);
    return new NextResponse("Not found", { status: 404 });
  }
}