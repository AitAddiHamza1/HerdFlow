const fs = require('fs');
const path = require('path');
const pdfMake = require('pdfmake/build/pdfmake');

// 1. Load local fonts as base64
const regularFontPath = path.join(__dirname, '..', 'public', 'fonts', 'Tajawal-Regular.ttf');
const boldFontPath = path.join(__dirname, '..', 'public', 'fonts', 'Tajawal-Bold.ttf');

const regularFontBase64 = fs.readFileSync(regularFontPath).toString('base64');
const boldFontBase64 = fs.readFileSync(boldFontPath).toString('base64');

// 2. Setup VFS and fonts
pdfMake.addVirtualFileSystem({
  'Tajawal-Regular.ttf': regularFontBase64,
  'Tajawal-Bold.ttf': boldFontBase64
});

pdfMake.setFonts({
  Tajawal: {
    normal: 'Tajawal-Regular.ttf',
    bold: 'Tajawal-Bold.ttf'
  }
});

// 3. Mock Data Builder
function createMockCowsLookup() {
  const map = new Map();
  map.set('cow-1', { number: '1234', name: 'Daisy', breed: 'Holstein' });
  map.set('cow-2', { number: '5678', name: 'جميلة بقرة طويلة الاسم جدا جدا', breed: 'Tarentaise' }); // Long Arabic Name
  map.set('cow-3', { number: '9999_VERY_LONG_NUMBER_TEST_EXTREME', name: 'Belle', breed: 'Montbéliarde' }); // Long Number
  return map;
}

function generateMockInseminations(count) {
  const list = [];
  const cowIds = ['cow-1', 'cow-2', 'cow-3'];
  const bullNames = ['Alpha Bull', 'ثور ممتاز قوي', 'Beta Bull'];
  
  for (let i = 0; i < count; i++) {
    const seconds = Math.floor(Date.now() / 1000) - (i * 10 * 24 * 3600); // spaced by 10 days
    list.push({
      id: `ins-${i}`,
      cowId: cowIds[i % cowIds.length],
      date: { seconds, nanoseconds: 0 },
      bullName: bullNames[i % bullNames.length],
      heatType: i % 2 === 0 ? 'Natural' : 'Induced',
      cost: i % 3 === 0 ? 150 : 0
    });
  }
  return list;
}

function formatDate(timestamp) {
  const date = new Date(timestamp.seconds * 1000);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// 4. Mimic pdfExport.ts docDefinition builder
function buildDocDefinition({ inseminations, cowsLookup, breederName, language, cowDetailsMode }) {
  const isAr = language === 'ar';

  const textTitle = isAr ? 'تقرير التلقيح الاصطناعي' : "RAPPORT D'INSÉMINATION ARTIFICIELLE";
  const textSubtitle = isAr
    ? 'HerdFlow - نظام إدارة قطيع هيردفلو'
    : 'HerdFlow - Système de Gestion du Troupeau';
  const textBreeder = isAr
    ? `المربي / المزرعة : ${breederName}`
    : `Éleveur / Ferme : ${breederName}`;
  const textDate = isAr
    ? `تاريخ الإنشاء : ${formatDate({ seconds: Date.now() / 1000 })}`
    : `Date de génération : ${formatDate({ seconds: Date.now() / 1000 })}`;
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

  // Calculate cycle order numbers
  const cowInseminationsMap = {};
  const chronoSorted = [...inseminations].sort((a, b) => a.date.seconds - b.date.seconds);
  const cowGroups = {};
  chronoSorted.forEach((ins) => {
    if (!cowGroups[ins.cowId]) cowGroups[ins.cowId] = [];
    cowGroups[ins.cowId].push(ins);
  });

  Object.entries(cowGroups).forEach(([cowId, records]) => {
    const orderMap = {};
    let orderIndex = 1;
    records.forEach((rec, idx) => {
      if (idx > 0) {
        const prev = records[idx - 1];
        const gapDays = (rec.date.seconds - prev.date.seconds) / (24 * 3600);
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

  const headers = [
    textCowHeader, textNameHeader, textDateHeader, textOrderHeader, textBullHeader, textHeatHeader, textCostHeader
  ];

  const tableBody = [
    headers.map((h) => ({
      text: h,
      color: '#ffffff',
      bold: true,
      fontSize: 10,
      alignment: isAr ? 'right' : 'left',
      margin: [0, 5, 0, 5]
    }))
  ];

  // Sorted newest first
  const descSorted = [...inseminations].sort((a, b) => b.date.seconds - a.date.seconds);
  descSorted.forEach((ins) => {
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
      { text: cowNumText, color: '#1e293b', bold: true, fontSize: 9, alignment: isAr ? 'right' : 'left', margin: [0, 4, 0, 4] },
      { text: cowNameText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left', margin: [0, 4, 0, 4] },
      { text: dateText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left', margin: [0, 4, 0, 4] },
      { text: orderText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left', margin: [0, 4, 0, 4] },
      { text: bullText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left', margin: [0, 4, 0, 4] },
      { text: heatText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left', margin: [0, 4, 0, 4] },
      { text: costText, color: '#334155', bold: false, fontSize: 9, alignment: isAr ? 'right' : 'left', margin: [0, 4, 0, 4] }
    ]);
  });

  const docDefinition = {
    pageMargins: [40, 40, 40, 50],
    defaultStyle: {
      font: 'Tajawal'
    },
    content: [
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
                alignment: isAr ? 'right' : 'left',
                margin: [10, 4, 10, 4]
              }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15]
      },
      {
        text: textTitle,
        fontSize: 18,
        bold: true,
        color: '#1e293b',
        alignment: isAr ? 'right' : 'left',
        margin: [0, 5, 0, 2]
      },
      {
        text: textSubtitle,
        fontSize: 9.5,
        color: '#64748b',
        alignment: isAr ? 'right' : 'left',
        margin: [0, 0, 0, 8]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#cbd5e1' }],
        margin: [0, 0, 0, 10]
      },
      {
        stack: [
          { text: textBreeder, fontSize: 9.5, color: '#475569', alignment: isAr ? 'right' : 'left', margin: [0, 1, 0, 1] },
          { text: textDate, fontSize: 9.5, color: '#475569', alignment: isAr ? 'right' : 'left', margin: [0, 1, 0, 1] },
          { text: textTotal, fontSize: 9.5, color: '#475569', alignment: isAr ? 'right' : 'left', margin: [0, 1, 0, 1] },
          textCowDetailsSub ? { text: textCowDetailsSub, fontSize: 9.5, color: '#0d9488', bold: true, alignment: isAr ? 'right' : 'left', margin: [0, 2, 0, 1] } : null
        ].filter(Boolean),
        margin: [0, 0, 0, 20]
      },
      {
        table: {
          headerRows: 1,
          widths: [65, 90, 65, 50, 90, 85, 70],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex) {
            if (rowIndex === 0) return '#0f172a';
            return rowIndex % 2 === 0 ? '#f8fafc' : null;
          },
          hLineWidth: function (i, node) {
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
    footer: function (currentPage, pageCount) {
      return {
        margin: [40, 10, 40, 0],
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#f1f5f9' }] },
          {
            margin: [0, 5, 0, 0],
            columns: [
              {
                text: isAr ? 'تم الإنشاء بواسطة هيردفلو' : 'Généré par HerdFlow',
                alignment: isAr ? 'right' : 'left',
                fontSize: 8.5,
                color: '#94a3b8'
              },
              {
                text: isAr ? `صفحة ${currentPage} من ${pageCount}` : `Page ${currentPage} sur ${pageCount}`,
                alignment: isAr ? 'left' : 'right',
                fontSize: 8.5,
                color: '#94a3b8'
              }
            ]
          }
        ]
      };
    }
  };

  if (isAr) {
    docDefinition.textDirection = 'rtl';
  }

  return docDefinition;
}

// 5. Generate and Save PDF files
async function runTests() {
  console.log('Generating test PDF reports...');
  const lookup = createMockCowsLookup();

  // Test 1: French Report (10 records)
  const insFr = generateMockInseminations(10);
  const defFr = buildDocDefinition({
    inseminations: insFr,
    cowsLookup: lookup,
    breederName: 'Jean Dupont',
    language: 'fr'
  });
  
  // Test 2: Arabic Report (10 records)
  const insAr = generateMockInseminations(10);
  const defAr = buildDocDefinition({
    inseminations: insAr,
    cowsLookup: lookup,
    breederName: 'أحمد بن علي المربّي',
    language: 'ar'
  });

  // Test 3: Large Report (120 records, multi-page)
  const insLarge = generateMockInseminations(120);
  const defLarge = buildDocDefinition({
    inseminations: insLarge,
    cowsLookup: lookup,
    breederName: 'مزرعة الأمل النموذجية لتربية الأبقار',
    language: 'ar',
    cowDetailsMode: {
      cowNumber: '9999_VERY_LONG_NUMBER_TEST_EXTREME',
      cowName: 'جميلة بقرة طويلة الاسم جدا جدا',
      breed: 'Holstein-Frisonne'
    }
  });

  const savePdf = async (docDef, filename) => {
    try {
      console.log(`Generating ${filename}...`);
      const pdfDoc = pdfMake.createPdf(docDef);
      const buffer = await pdfDoc.getBuffer();
      const filePath = path.join(__dirname, filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved: ${filename} (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`Error generating ${filename}:`, err);
    }
  };

  await savePdf(defFr, 'french_report.pdf');
  await savePdf(defAr, 'arabic_report.pdf');
  await savePdf(defLarge, 'large_report.pdf');
  
  console.log('PDF generation complete. All test files saved in scratch directory!');
}

runTests().catch(err => {
  console.error('Error running PDF tests:', err);
});
