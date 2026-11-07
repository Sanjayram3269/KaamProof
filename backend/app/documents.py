from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

FONT_DIR = Path(__file__).parent / "fonts"
for font, filename in {
    "Noto": "NotoSans-Regular.ttf",
    "NotoBold": "NotoSans-Bold.ttf",
    "NotoDeva": "NotoSansDevanagari-Regular.ttf",
    "NotoTamil": "NotoSansTamil-Regular.ttf",
    "NotoKannada": "NotoSansKannada-Regular.ttf",
}.items():
    pdfmetrics.registerFont(TTFont(font, str(FONT_DIR / filename), shapable=True))
pdfmetrics.registerFontFamily(
    "Noto", normal="Noto", bold="NotoBold", italic="Noto", boldItalic="NotoBold"
)


def multilingual(text):
    result = escape(str(text)).replace("\n", "<br/>")
    for pattern, font in [
        (r"[\u0900-\u097f]+", "NotoDeva"),
        (r"[\u0b80-\u0bff]+", "NotoTamil"),
        (r"[\u0c80-\u0cff]+", "NotoKannada"),
    ]:
        result = re.sub(pattern, lambda m: f'<font name="{font}">{m.group()}</font>', result)
    return result


def timestamp(value):
    return datetime.fromtimestamp(value, UTC).strftime("%d %b %Y, %H:%M UTC") if value else "-"


def make_pdf(job, kind):
    output = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle("SmallPrint", fontSize=8, leading=12, textColor=colors.HexColor("#52645e"))
    )
    styles["BodyText"].leading = 16
    for style in styles.byName.values():
        style.fontName = "NotoBold" if style.name in ("Title", "Heading1", "Heading2") else "Noto"
        style.shaping = 1
    story = []

    def p(text, style="BodyText"):
        story.append(Paragraph(multilingual(text), styles[style]))
        story.append(Spacer(1, 3 * mm))

    p("KAAMPROOF", "Title")
    p("Your Work. Your Proof.", "SmallPrint")
    story.append(HRFlowable(width="100%", color=colors.HexColor("#16826b")))
    p(kind.replace("-", " ").title(), "Heading1")
    p(job["title"], "Heading2")
    generated = datetime.now(UTC)
    p(f"Document KP-{job['id']}-{kind} | Generated {generated:%d %b %Y, %H:%M UTC}", "SmallPrint")
    p(f"Job created {timestamp(job['created_at'])} | Status: {job['status'].replace('_', ' ')}")
    p(f"Customer: {job['customer_name']} | Location: {job['location']}")
    p(job["description"])
    if kind in ("record", "agreement"):
        for a in job["agreements"]:
            p(f"Agreement version {a['version']} - {a['decision']}", "Heading2")
            p(f"Agreement ID: {a['id']} | Created {timestamp(a['created_at'])}", "SmallPrint")
            p("Scope: " + a["scope"])
            p("Exclusions: " + (a["exclusions"] or "None recorded"))
            rows = [["Pricing", a["currency"]]]
            rows += [
                [label, a[key]]
                for key, label in (
                    ("labour", "Labour"),
                    ("materials", "Materials"),
                    ("other", "Other"),
                    ("tax", "Tax"),
                    ("total", "Total"),
                )
            ]
            table = Table(rows, colWidths=[115 * mm, 45 * mm])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e5f3ed")),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                        ("TOPPADDING", (0, 0), (-1, -1), 9),
                        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                        ("LINEBELOW", (0, -1), (-1, -1), 1, colors.HexColor("#16826b")),
                    ]
                )
            )
            story.append(table)
            p("Terms: " + (a["terms"] or "None recorded"))
            p(f"Valid until {timestamp(a['valid_until'])}")
            p(f"Customer decision: {a['decision']} at {timestamp(a['decided_at'])}")
            p(a["decision_notes"])
    if kind in ("record", "work-summary", "completion"):
        p("Completion record", "Heading2")
        p(f"Submission {job['completion_number']} | Submitted {timestamp(job['completion_at'])}")
        p(job["completion_notes"] or "No completion submitted")
        p(f"Customer acknowledgement: {timestamp(job['acknowledged_at'])}")
    if kind in ("record", "evidence-index"):
        p("Uploaded evidence index", "Heading2")
        for e in job["evidence"]:
            p(f"{e['id']} | {timestamp(e['created_at'])}", "SmallPrint")
            p(e["caption"] or "No caption")
            p("SHA256: " + e["digest"], "SmallPrint")
        if not job["evidence"]:
            p("No evidence uploaded")
    if kind in ("record", "payments"):
        money = job["payments"]
        p("Self-reported payment summary", "Heading2")
        p(
            f"{money['currency']} | Agreed {money['agreed']} | Recorded {money['recorded']} | "
            f"Outstanding {money['outstanding']}"
        )
        for payment in money["entries"]:
            p(
                f"{payment['amount']} {payment['currency']} | {payment['method']} | "
                f"{timestamp(payment['paid_at'])} | Reference: {payment['reference'] or '-'}"
            )
    if kind in ("record", "work-summary"):
        p("Attributed activity history", "Heading2")
        for item in job["timeline"]:
            p(
                f"{timestamp(item['created_at'])} | {item['actor']} | {item['kind'].replace('_', ' ')}"
            )
            if item["notes"]:
                p(item["notes"])
    p(
        "Worker-entered statements, uploaded evidence and customer-entered acknowledgements are "
        "identified in this record. System timestamps document when actions were recorded. "
        "Customer access is established by possession of a shared link, not independent identity "
        "verification. Payments are self-reported. KaamProof does not verify work quality, payment "
        "settlement or legal validity. This document is not legally certified.",
        "SmallPrint",
    )

    def footer(canvas, doc):
        canvas.setFont("Noto", 8)
        canvas.setFillColor(colors.HexColor("#52645e"))
        canvas.drawString(24 * mm, 15 * mm, "KaamProof | Worker-owned work records")
        canvas.drawRightString(186 * mm, 15 * mm, f"Page {doc.page}")

    SimpleDocTemplate(
        output,
        pagesize=(210 * mm, 297 * mm),
        rightMargin=24 * mm,
        leftMargin=24 * mm,
        topMargin=18 * mm,
        bottomMargin=25 * mm,
        title=f"KaamProof {kind}",
    ).build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
