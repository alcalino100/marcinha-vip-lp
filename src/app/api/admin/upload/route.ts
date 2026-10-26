import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { checkAdminAuth } from "@/lib/auth";
import { isSupabaseConfigured, uploadToSupabaseStorage } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "O arquivo precisa ser uma imagem válida" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Se o Supabase estiver configurado, envia para o bucket de Storage do Supabase
    if (isSupabaseConfigured()) {
      const supabaseUrl = await uploadToSupabaseStorage(buffer, file.name, file.type || "image/jpeg");
      if (supabaseUrl) {
        return NextResponse.json({
          success: true,
          url: supabaseUrl,
          filename: file.name,
          storage: "supabase",
        });
      }
    }

    // 2. Se estiver na Vercel sem Supabase Storage, converte para Data URI Base64
    if (process.env.VERCEL) {
      const mimeType = file.type || "image/jpeg";
      const base64Data = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      return NextResponse.json({
        success: true,
        url: dataUrl,
        filename: file.name,
        storage: "base64",
      });
    }

    // 3. Em ambiente local
    const ext = path.extname(file.name) || ".jpg";
    const filename = `model-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      storage: "local",
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json({ error: "Falha ao processar upload" }, { status: 500 });
  }
}
