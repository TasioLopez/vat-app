import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import pdf from "pdf-parse";
import type { ChatCompletionMessageParam } from "openai/resources";
import { NB_DEFAULT_GEEN_AD } from "@/lib/tp/static"; // make sure this export exists

// ---- INIT ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---- helpers ----
function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith("documents/")) return url.slice("documents/".length);
  if (url && !url.includes("://") && !url.includes("object/")) return url;
  return null;
}

async function readPdfFromStorage(path: string): Promise<string> {
  const { data: file } = await supabase.storage.from("documents").download(path);
  if (!file) return "";
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await pdf(buf);
    return (parsed.text || "").trim();
  } catch {
    return "";
  }
}

async function getDocTextByTypes(employeeId: string, candidates: string[]) {
  const { data: docs } = await supabase
    .from("documents")
    .select("type,url,uploaded_at")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });

  if (!docs?.length) return "";

  for (const c of candidates) {
    const hit = docs.find(d => (d.type || "").toLowerCase().includes(c));
    if (!hit?.url) continue;
    const path = extractStoragePath(hit.url);
    if (!path) continue;
    const text = await readPdfFromStorage(path);
    if (text && text.length > 50) return text;
  }
  return "";
}

function nlDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

// ---- ROUTE ----
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    // Light meta (optional)
    const { data: employee } = await supabase
      .from("employees")
      .select("first_name,last_name,client_id")
      .eq("id", employeeId)
      .single();

    const { data: details } = await supabase
      .from("employee_details")
      .select("intake_date")
      .eq("employee_id", employeeId)
      .single();

    const { data: meta } = await supabase
      .from("tp_meta")
      .select("intake_date, ad_report_date, client_name")
      .eq("employee_id", employeeId)
      .single();

    // Sources: AD > Intake (tolerant to multiple naming variants)
    const AD_TEXT = await getDocTextByTypes(employeeId, [
      "ad_rapport", "ad-rapport", "adrapport",
      "ad_rapportage", "ad-rapportage",
      "arbeidsdeskund" // catches "arbeidsdeskundig(e) rapportage"
    ]);
    const INTAKE_TEXT = await getDocTextByTypes(employeeId, [
      "intakeformulier", "intake-formulier", "intake"
    ]);

    const hasAD = AD_TEXT.length > 200; // simple heuristic
    const intakeDate = nlDate(details?.intake_date || meta?.intake_date);

    if (!AD_TEXT && !INTAKE_TEXT) {
      return NextResponse.json({ error: "Geen leesbare documenten gevonden" }, { status: 200 });
    }

    // ---- Prompt (function calling → strict JSON back) ----
    const systemPrompt = `
Je bent een NL re-integratie-rapportage assistent.
Schrijf "Inleiding" in de stijl van de ValentineZ-voorbeelden:
- 4–7 korte alinea's, zakelijk/AVG-proof (geen diagnoses).
- Neem een "Functieomschrijving:" alinea op (label vet).
- Gebruik primair AD-tekst; als geen AD, gebruik Intake-tekst.
Returneer uitsluitend via function-call met:
{ inleiding_main: string, inleiding_sub: string }
  • Als AD aanwezig → inleiding_sub = blok dat exact begint met "In het Arbeidsdeskundige rapport ...", incl. naam/initialen (indien herkenbaar), datum (indien herkenbaar) en de samenvatting van advies.
  • Als geen AD → inleiding_sub leeg laten (client voegt vaste NB in).
`.trim();

    const userPrompt = `
CONTEXT:
- has_ad: ${hasAD}
- intake_date_nl: "${intakeDate}"
- employee: ${JSON.stringify(employee || {})}
- meta: ${JSON.stringify(meta || {})}

AD SOURCE (kan leeg):
${AD_TEXT.slice(0, 20000)}

INTAKE SOURCE (kan leeg):
${INTAKE_TEXT.slice(0, 20000)}
`.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const tool = {
      type: "function" as const,
      function: {
        name: "build_inleiding",
        description: "Bouw Inleiding + sub-blok (strings).",
        parameters: {
          type: "object",
          properties: {
            inleiding_main: { type: "string" },
            inleiding_sub: { type: "string" },
          },
          required: ["inleiding_main", "inleiding_sub"],
        },
      },
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",           // supports tool calling reliably
      temperature: 0.1,
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "build_inleiding" } },
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) {
      return NextResponse.json({ error: "Geen inleiding gevonden" }, { status: 200 });
    }

    let parsed: { inleiding_main?: string; inleiding_sub?: string } | null = null;
    try { parsed = JSON.parse(args); } catch { parsed = null; }

    const main = (parsed?.inleiding_main || "").trim();
    let sub = (parsed?.inleiding_sub || "").trim();

    if (!main) {
      return NextResponse.json({ error: "Geen inleiding gevonden" }, { status: 200 });
    }

    // If no AD, enforce NB line
    if (!hasAD || !sub) sub = NB_DEFAULT_GEEN_AD;

    // Persist (optional)
    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, inleiding: main, inleiding_sub: sub, has_ad_report: hasAD } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { inleiding: main, inleiding_sub: sub, has_ad_report: hasAD },
      autofilled_fields: ["inleiding", "inleiding_sub", "has_ad_report"],
    });
  } catch (err: any) {
    console.error("❌ Autofill inleiding error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
