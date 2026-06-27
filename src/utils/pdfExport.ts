import pdfMake from 'pdfmake/build/pdfmake';
import { formatDate } from './date';
import type { Insemination } from '../types/insemination';

interface ExportPDFParams {
  inseminations: Insemination[];
  cowsLookup: Map<string, { number: string; name?: string; breed?: string }>;
  breederName: string;
  language: 'ar' | 'fr';
  cowDetailsMode?: {
    cowNumber: string;
    cowName?: string;
    breed?: string;
  };
}

let cachedRegularFont: string | null = null;
let cachedBoldFont: string | null = null;

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch font from ${url}`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportInseminationsToPDF({
  inseminations,
  cowsLookup,
  breederName,
  language,
  cowDetailsMode
}: ExportPDFParams) {
  const isAr = language === 'ar';

  // 1. Fetch fonts if not cached
  try {
    if (!cachedRegularFont) {
      cachedRegularFont = await fetchFontAsBase64('/fonts/Tajawal-Regular.ttf');
    }
    if (!cachedBoldFont) {
      cachedBoldFont = await fetchFontAsBase64('/fonts/Tajawal-Bold.ttf');
    }
  } catch (error) {
    console.error('Failed to load Tajawal fonts for PDF export:', error);
    alert(isAr ? 'فشل تحميل الخطوط لإنشاء ملف PDF.' : 'Échec du chargement des polices pour le PDF.');
    return;
  }

  // 2. Register fonts in pdfMake
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfMake as any).addVirtualFileSystem({
    'Tajawal-Regular.ttf': cachedRegularFont,
    'Tajawal-Bold.ttf': cachedBoldFont
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfMake as any).setFonts({
    Tajawal: {
      normal: 'Tajawal-Regular.ttf',
      bold: 'Tajawal-Bold.ttf'
    }
  });

  // 3. Define Multilingual Translations
  const textTitle = isAr ? 'تقرير التلقيح الاصطناعي' : "RAPPORT D'INSÉMINATION ARTIFICIELLE";
  const textSubtitle = isAr
    ? 'HerdFlow - نظام إدارة قطيع هيردفلو'
    : 'HerdFlow - Système de Gestion du Troupeau';
  const textBreeder = isAr
    ? `المربي / المزرعة : ${breederName}`
    : `Éleveur / Ferme : ${breederName}`;
  const textDate = isAr
    ? `تاريخ الإنشاء : ${formatDate(new Date())}`
    : `Date de génération : ${formatDate(new Date())}`;
  const textTotal = isAr
    ? `إجمالي العمليات : ${inseminations.length}`
    : `Nombre de records : ${inseminations.length}`;

  const textCowHeader = isAr ? 'رقم البقرة' : 'N° Vache';
  const textNameHeader = isAr ? 'الاسم' : 'Nom';
  const textDateHeader = isAr ? 'تاريخ التلقيح' : 'Date';
  const textOrderHeader = isAr ? 'الترتيب' : 'Ordre (ORD)';
  const textBullHeader = isAr ? 'الفحل' : 'Taureau';
  const textHeatHeader = isAr ? 'نوع الشبق' : 'Chaleur';
  const textCostHeader = isAr ? 'التكلفة' : 'Coût';

  let textCowDetailsSub = '';
  if (cowDetailsMode) {
    const cowNameInfo = cowDetailsMode.cowName ? ` (${cowDetailsMode.cowName})` : '';
    const breedInfo = cowDetailsMode.breed ? ` - ${cowDetailsMode.breed}` : '';
    textCowDetailsSub = isAr
      ? `البقرة : ${cowDetailsMode.cowNumber}${cowNameInfo}${breedInfo}`
      : `Vache : ${cowDetailsMode.cowNumber}${cowNameInfo}${breedInfo}`;
  }

  // 4. Calculate Cycle Orders per Cow (Newest to Oldest)
  const cowInseminationsMap: Record<string, Record<string, number>> = {};
  
  // Sort chronologically ascending to calculate order numbers correctly
  const chronoSorted = [...inseminations].sort((a, b) => {
    const tA = a.date?.seconds || 0;
    const tB = b.date?.seconds || 0;
    return tA - tB;
  });

  const cowGroups: Record<string, Insemination[]> = {};
  chronoSorted.forEach((ins) => {
    if (!cowGroups[ins.cowId]) cowGroups[ins.cowId] = [];
    cowGroups[ins.cowId].push(ins);
  });

  Object.entries(cowGroups).forEach(([cowId, records]) => {
    const orderMap: Record<string, number> = {};
    let orderIndex = 1;

    records.forEach((rec, idx) => {
      if (idx > 0) {
        const prev = records[idx - 1];
        const gapSeconds = rec.date.seconds - prev.date.seconds;
        const gapDays = gapSeconds / (24 * 3600);
        if (gapDays > 243) {
          orderIndex = 1;
        } else {
          orderIndex++;
        }
      }
      orderMap[rec.id] = orderIndex;
    });
    cowInseminationsMap[cowId] = orderMap;
  });

  // 5. Structure Table Rows
  const headers = [
    textCowHeader,
    textNameHeader,
    textDateHeader,
    textOrderHeader,
    textBullHeader,
    textHeatHeader,
    textCostHeader
  ];

  const tableBody = [
    // Header Row
    headers.map((h) => ({
      text: h,
      color: '#ffffff',
      bold: true,
      fontSize: 10,
      alignment: isAr ? 'right' : 'left' as const,
      margin: [0, 5, 0, 5]
    }))
  ];

  // Insemination records sorted newest first
  inseminations.forEach((ins) => {
    const cowObj = cowsLookup.get(ins.cowId);
    const cowNumText = cowObj?.number || ins.cowId.substring(0, 8);
    const cowNameText = cowObj?.name || (isAr ? 'بدون اسم' : 'Sans nom');
    const dateText = formatDate(ins.date);
    const orderText = String(cowInseminationsMap[ins.cowId]?.[ins.id] || 1);
    const bullText = ins.bullName;
    const heatText = ins.heatType === 'Natural' 
      ? (isAr ? 'طبيعي' : 'Naturelle')
      : (isAr ? 'اصطناعي' : 'Induite');
    const costText = ins.cost > 0 ? `$${ins.cost.toFixed(2)}` : '-';

    tableBody.push([
      { text: cowNumText, color: '#1e293b', bold: true, fontSize: 9, alignment: isAr ? 'right' : 'left' as const, margin: [0, 4, 0, 4] },
      { text: cowNameText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left' as const, margin: [0, 4, 0, 4] },
      { text: dateText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left' as const, margin: [0, 4, 0, 4] },
      { text: orderText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left' as const, margin: [0, 4, 0, 4] },
      { text: bullText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left' as const, margin: [0, 4, 0, 4] },
      { text: heatText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left' as const, margin: [0, 4, 0, 4] },
      { text: costText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left' as const, margin: [0, 4, 0, 4] }
    ]);
  });

  // 6. Construct pdfmake Document Definition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docDefinition: any = {
    pageMargins: [40, 40, 40, 50],
    defaultStyle: {
      font: 'Tajawal'
    },
    content: [
      // Top Green Header Band
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: isAr ? 'هيردفلو  HerdFlow' : 'HerdFlow',
                fillColor: '#0d9488',
                color: '#ffffff',
                bold: true,
                fontSize: 13,
                alignment: isAr ? 'right' : 'left' as const,
                margin: [10, 4, 10, 4]
              }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15]
      },
      // Document Title
      {
        text: textTitle,
        fontSize: 18,
        bold: true,
        color: '#1e293b',
        alignment: isAr ? 'right' : 'left' as const,
        margin: [0, 5, 0, 2]
      },
      // Subtitle
      {
        text: textSubtitle,
        fontSize: 9.5,
        color: '#64748b',
        alignment: isAr ? 'right' : 'left' as const,
        margin: [0, 0, 0, 8]
      },
      // Horizontal Line
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#cbd5e1' }],
        margin: [0, 0, 0, 10]
      },
      // Metadata section
      {
        stack: [
          { text: textBreeder, fontSize: 9.5, color: '#475569', alignment: isAr ? 'right' : 'left' as const, margin: [0, 1, 0, 1] },
          { text: textDate, fontSize: 9.5, color: '#475569', alignment: isAr ? 'right' : 'left' as const, margin: [0, 1, 0, 1] },
          { text: textTotal, fontSize: 9.5, color: '#475569', alignment: isAr ? 'right' : 'left' as const, margin: [0, 1, 0, 1] },
          textCowDetailsSub ? { text: textCowDetailsSub, fontSize: 9.5, color: '#0d9488', bold: true, alignment: isAr ? 'right' : 'left' as const, margin: [0, 2, 0, 1] } : null
        ].filter(Boolean),
        margin: [0, 0, 0, 20]
      },
      // Inseminations Table
      {
        table: {
          headerRows: 1,
          widths: [65, 90, 65, 50, 90, 85, 70],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex: number) {
            if (rowIndex === 0) return '#0f172a'; // Header row background
            return rowIndex % 2 === 0 ? '#f8fafc' : null; // Alternate row colors
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hLineWidth: function (i: number, node: any) {
            return i === 0 || i === node.table.body.length ? 0.5 : 0.2;
          },
          vLineWidth: function () {
            return 0;
          },
          hLineColor: function () {
            return '#cbd5e1';
          }
        }
      }
    ],
    footer: function (currentPage: number, pageCount: number) {
      return {
        margin: [40, 10, 40, 0],
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#f1f5f9' }] },
          {
            margin: [0, 5, 0, 0],
            columns: [
              {
                text: isAr ? 'تم الإنشاء بواسطة هيردفلو' : 'Généré par HerdFlow',
                alignment: isAr ? 'right' : 'left' as const,
                fontSize: 8.5,
                color: '#94a3b8'
              },
              {
                text: isAr ? `صفحة ${currentPage} من ${pageCount}` : `Page ${currentPage} sur ${pageCount}`,
                alignment: isAr ? 'left' : 'right' as const,
                fontSize: 8.5,
                color: '#94a3b8'
              }
            ]
          }
        ]
      };
    }
  };

  // Enable dynamic RTL layout in pdfmake
  if (isAr) {
    docDefinition.textDirection = 'rtl';
  }

  // 7. Download PDF file
  const filename = cowDetailsMode 
    ? `HerdFlow_Inseminations_Cow_${cowDetailsMode.cowNumber}.pdf`
    : `HerdFlow_Inseminations_Report.pdf`;

  pdfMake.createPdf(docDefinition).download(filename);
}
