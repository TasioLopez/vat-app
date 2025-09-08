"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTP } from "@/context/TPContext";
import Image from "next/image";
import Logo2 from "@/assets/images/logo-2.png";

const page = "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none print:border-0";
const heading = "text-lg font-semibold text-center mb-6";
const blockTitle = "font-bold bg-gray-100 px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed";
const subtle = "bg-gray-50 px-3 py-1 whitespace-pre-wrap leading-relaxed italic";
const tdLabel = "py-1 px-2 border-collapse align-top w-[40%]";
const tdValue = "py-1 px-2 border-collapse align-top";

type Row = { label: React.ReactNode; value: React.ReactNode };
type Block =
  | { key: string; variant: "subtle"; node: React.ReactNode }
  | { key: string; variant: "block"; title: string; node: React.ReactNode };

function Table({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className={tdLabel}>{r.label}</td>
            <td className={tdValue}>{r.value || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function yesNo(val?: boolean) {
  return typeof val === "boolean" ? (val ? "Ja" : "Nee") : "—";
}
function safe<T>(v: T | null | undefined, fallback = "—"): T | string {
  return v ?? fallback;
}
function formatDutchDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const LogoBar = React.forwardRef<HTMLDivElement>((_props, ref) => (
  <div ref={ref as any} className="w-full flex justify-end mb-6">
    <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
  </div>
));
LogoBar.displayName = "LogoBar";

export default function EmployeeInfoA4Client({ employeeId }: { employeeId: string }) {
  const { tpData } = useTP();

  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = [];

    // Header for first page
    out.push({
      key: "__header_first",
      variant: "block",
      title: "",
      node: (
        <>
          <LogoBar />
          <h1 className={heading}>Trajectplan re-integratie tweede spoor</h1>
        </>
      ),
    });

    // Gegevens werknemer
    out.push({
      key: "werknemer",
      variant: "block",
      title: "Gegevens werknemer",
      node: (
        <Table
          rows={[
            { label: "Naam", value: `${safe(tpData.first_name, "")} ${safe(tpData.last_name, "")}`.trim() || "—" },
            {
              label: "Geslacht",
              value: (
                <>
                  <span className="mr-4">{tpData.gender === "Male" ? "☑ Man" : "☐ Man"}</span>
                  <span>{tpData.gender === "Female" ? "☑ Vrouw" : "☐ Vrouw"}</span>
                </>
              ),
            },
            { label: "Telefoon", value: safe(tpData.phone) },
            { label: "Email", value: safe(tpData.email) },
            { label: "Geboortedatum", value: formatDutchDate(tpData.date_of_birth) || "—" },
          ]}
        />
      ),
    });

    // Gegevens re-integratietraject 2e spoor
    out.push({
      key: "traject",
      variant: "block",
      title: "Gegevens re-integratietraject 2e spoor",
      node: (
        <Table
          rows={[
            { label: "Eerste ziektedag", value: formatDutchDate(tpData.first_sick_day) || "—" },
            { label: "Datum aanmelding", value: formatDutchDate(tpData.registration_date) || "—" },
            { label: "Datum intakegesprek", value: formatDutchDate(tpData.intake_date) || "—" },
            { label: "Datum opmaak trajectplan", value: formatDutchDate(tpData.tp_creation_date) || "—" },
            { label: "Datum AD Rapportage", value: formatDutchDate(tpData.ad_report_date) || "—" },
            { label: "Arbeidsdeskundige", value: safe(tpData.occupational_doctor_name) },
            {
              label: "Arbeidsdeskundig rapport aanwezig bij aanmelding",
              value: (
                <>
                  <span className="mr-4">{tpData.has_ad_report === true ? "☑ Ja" : "☐ Ja"}</span>
                  <span>{tpData.has_ad_report === false ? "☑ Nee" : "☐ Nee"}</span>
                </>
              )
            },
            {
              label: "Bedrijfsarts",
              value: [safe(tpData.occupational_doctor_org, "")]
                .filter(Boolean)
                .join(" ") || "—",
            },
            { label: "Datum FML/IZP/LAB", value: formatDutchDate(tpData.fml_izp_lab_date) || "—" },
          ]}
        />
      ),
    });

    // Gegevens opdrachtgever
    out.push({
      key: "opdrachtgever",
      variant: "block",
      title: "Gegevens opdrachtgever",
      node: (
        <Table
          rows={[
            { label: "Werkgever", value: safe(tpData.client_name) },
            { label: "Contactpersoon", value: safe(tpData.client_referent_name) },
            { label: "Telefoon", value: safe(tpData.client_referent_phone) },
            { label: "Email", value: safe(tpData.client_referent_email) },
          ]}
        />
      ),
    });

    // Gegevens re-integratiebedrijf
    out.push({
      key: "reintegratiebedrijf",
      variant: "block",
      title: "Gegevens re-integratiebedrijf",
      node: (
        <Table
          rows={[
            { label: "Opdrachtnemer", value: "ValentineZ" },
            { label: "Loopbaanadviseur", value: safe(tpData.consultant_name) },
            { label: "Telefoon", value: safe(tpData.consultant_phone) },
            { label: "Email", value: safe(tpData.consultant_email) },
          ]}
        />
      ),
    });

    // Basisgegevens
    out.push({
      key: "basis",
      variant: "block",
      title: "Basisgegevens re-integratie werknemer",
      node: (
        <Table
          rows={[
            { label: "Huidige functie", value: safe(tpData.current_job) },
            { label: "Werkervaring", value: safe(tpData.work_experience) },
            { label: "Opleidingsniveau", value: safe(tpData.education_level) },
            { label: "Rijbewijs", value: yesNo(tpData.drivers_license) },
            { label: "Eigen vervoer", value: yesNo(tpData.has_transport) },
            { label: "Spreekvaardigheid NL-taal", value: yesNo(tpData.dutch_speaking) },
            { label: "Schrijfvaardigheid NL-taal", value: yesNo(tpData.dutch_writing) },
            { label: "Leesvaardigheid NL-taal", value: yesNo(tpData.dutch_reading) },
            { label: "Beschikt over een PC", value: yesNo(tpData.has_computer) },
            { label: "PC-vaardigheden", value: safe(tpData.computer_skills) },
            {
              label: "Aantal contracturen",
              value: tpData.contract_hours ? `${tpData.contract_hours} uur per week` : "—",
            },
            { label: "Andere werkgever(s)", value: safe(tpData.other_employers) },
          ]}
        />
      ),
    });

    // Opdrachtinformatie
    out.push({
      key: "opdrachtinfo",
      variant: "block",
      title: "Opdrachtinformatie",
      node: (
        <Table
          rows={[
            { label: "Trajectsoort", value: "2e Spoor Traject" },
            {
              label: "Doelstelling",
              value:
                "Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden.",
            },
            { label: "Doorlooptijd", value: safe(tpData.tp_lead_time) },
            { label: "Startdatum", value: formatDutchDate(tpData.tp_start_date) || "—" },
            { label: "Einddatum (planning)", value: formatDutchDate(tpData.tp_end_date) || "—" },
          ]}
        />
      ),
    });

    // AVG
    out.push({
      key: "avg",
      variant: "subtle",
      node: (
        <>
          NB: in het kader van de algemene verordening gegevensbescherming (AVG) worden in deze
          rapportage geen medische termen en diagnoses vermeld. Voor meer informatie over ons
          privacyreglement en het klachtenreglement verwijzen wij u naar onze website.
        </>
      ),
    });

    // Header for subsequent pages
    out.push({
      key: "__header_rest",
      variant: "block",
      title: "",
      node: (
        <>
          <LogoBar />
        </>
      ),
    });

    // Legenda
    out.push({
      key: "legenda",
      variant: "block",
      title: "Legenda",
      node: (
        <div className="text-[10px]">
          <Table
            rows={[
              { label: "EZD", value: "Eerste ziektedag" },
              { label: "AO", value: "Arbeidsdeskundigonderzoek" },
              { label: "AD", value: "Arbeidsdeskundig" },
              { label: "BA", value: "Bedrijfsarts" },
              { label: "IZP", value: "Inzetbaarheidsprofiel" },
              { label: "FML", value: "Functiemogelijkhedenlijst" },
              { label: "LAB", value: "Lijst arbeidsmogelijkheden en beperkingen" },
              { label: "GBM", value: "Geen benutbare mogelijkheden" },
              { label: "TP", value: "Trajectplan" },
              { label: "VGR", value: "Voortgangsrapportage" },
            ]}
          />
        </div>
      ),
    });

    return out;
  }, [
    tpData.first_name,
    tpData.last_name,
    tpData.gender,
    tpData.phone,
    tpData.email,
    tpData.date_of_birth,
    tpData.first_sick_day,
    tpData.registration_date,
    tpData.intake_date,
    tpData.tp_creation_date,
    tpData.ad_report_date,
    tpData.occupational_doctor_name,
    tpData.occupational_doctor_org,
    tpData.fml_izp_lab_date,
    tpData.client_name,
    tpData.client_referent_name,
    tpData.client_referent_phone,
    tpData.client_referent_email,
    tpData.current_job,
    tpData.work_experience,
    tpData.education_level,
    tpData.drivers_license,
    tpData.has_transport,
    tpData.dutch_speaking,
    tpData.dutch_writing,
    tpData.dutch_reading,
    tpData.has_computer,
    tpData.computer_skills,
    tpData.contract_hours,
    tpData.other_employers,
    tpData.tp_lead_time,
    tpData.tp_start_date,
    tpData.tp_end_date,
  ]);

  return <PaginatedA4 blocks={blocks} />;
}

/* ---------- measurement-based pagination ---------- */

function PaginatedA4({ blocks }: { blocks: Block[] }) {
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const PAD = 40;
  const CONTENT_H = PAGE_H - PAD * 2;
  const BLOCK_SPACING = 12;

  const headerFirstRef = useRef<HTMLDivElement | null>(null);
  const headerRestRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pages, setPages] = useState<number[][]>([]);

  const MeasureTree = () => (
    <div style={{ position: "absolute", left: -99999, top: 0, width: PAGE_W }} className="invisible">
      {/* first page header */}
      <div className={page} style={{ width: PAGE_W, height: PAGE_H, padding: PAD }}>
        <div ref={headerFirstRef}>
          <LogoBar />
          <h1 className={heading}>Trajectplan re-integratie tweede spoor</h1>
        </div>
        {blocks
          .filter((b) => !b.key.startsWith("__header"))
          .map((b, i) => (
            <div
              key={`m-${b.key}`}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
              className="mb-3"
            >
              {b.variant === "subtle" ? (
                <div className={subtle}>{(b as any).node}</div>
              ) : (
                <>
                  {("title" in b && b.title) ? <div className={blockTitle}>{(b as any).title}</div> : null}
                  <div className={paperText}>{(b as any).node}</div>
                </>
              )}
            </div>
          ))}
      </div>

      {/* rest header */}
      <div className={page} style={{ width: PAGE_W, height: PAGE_H, padding: PAD }}>
        <div ref={headerRestRef}>
          <LogoBar />
        </div>
      </div>
    </div>
  );

  useLayoutEffect(() => {
    const firstH = headerFirstRef.current?.offsetHeight ?? 0;
    const restH = headerRestRef.current?.offsetHeight ?? 0;

    // measure all blocks (excluding the special header markers)
    const measurables = blocks.filter((b) => !b.key.startsWith("__header"));
    const heights = measurables.map((_, i) => blockRefs.current[i]?.offsetHeight ?? 0);

    const limitFirst = CONTENT_H - firstH;
    const limitRest = CONTENT_H - restH;

    const out: number[][] = [];
    let cur: number[] = [];
    let used = 0;
    let limit = limitFirst;

    heights.forEach((h, idx) => {
      const add = (cur.length ? BLOCK_SPACING : 0) + h;
      if (used + add > limit) {
        if (cur.length) out.push(cur);
        cur = [idx];
        used = h;
        limit = limitRest;
      } else {
        used += add;
        cur.push(idx);
      }
    });
    if (cur.length) out.push(cur);
    setPages(out);
  }, [JSON.stringify(blocks.map((b) => [b.key, "title" in b ? b.title : "", b.variant]))]);

  return (
    <>
      <MeasureTree />
      {pages.map((idxs, p) => (
        <section key={`p-${p}`} className="print-page">
          <div className={page} style={{ width: PAGE_W, height: PAGE_H }}>
            {p === 0 ? (
              <>
                <LogoBar />
                <h1 className={heading}>Trajectplan re-integratie tweede spoor</h1>
              </>
            ) : (
              <>
                <LogoBar />
              </>
            )}

            {idxs.map((i) => {
              const b = blocks.filter((x) => !x.key.startsWith("__header"))[i];
              return (
                <div key={b.key} className="mb-3">
                  {b.variant === "subtle" ? (
                    <div className={subtle}>{(b as any).node}</div>
                  ) : (
                    <>
                      {("title" in b && b.title) ? <div className={blockTitle}>{(b as any).title}</div> : null}
                      <div className={paperText}>{(b as any).node}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
