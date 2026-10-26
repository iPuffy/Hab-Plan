const HEADER = [
  'index',
  'CH4',
  'H2',
  'NH3',
  'Temperature',
  'Pressure',
  'Humidity',
  'Muons',
  'HabitabilityIndex',
];

const LEGACY_HEADER = [
  'index',
  'CH4',
  'H2',
  'NH3',
  'Temperature',
  'Pressure',
  'Humidity',
  'HabitabilityIndex',
];

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function headerMatches(actual, expected) {
  return actual.length === expected.length && expected.every((h, i) => h === actual[i]);
}

export function exportCSV(states) {
  const {
    data = [],
    dataTemp = [],
    dataPres = [],
    dataHum = [],
    dataMuon = [],
    dataHabIndex = [],
  } = states;
  const length = Math.max(
    data.length,
    dataTemp.length,
    dataPres.length,
    dataHum.length,
    dataMuon.length,
    dataHabIndex.length,
  );

  const lines = [HEADER.join(',')];
  for (let i = 0; i < length; i++) {
    const gas = data[i] || {};
    const t  = dataTemp[i] || {};
    const p  = dataPres[i] || {};
    const h  = dataHum[i] || {};
    const m  = dataMuon[i] || {};
    const hi = dataHabIndex[i] || {};
    lines.push([
      i,
      toNum(gas.CH4),
      toNum(gas.H2),
      toNum(gas.NH3),
      toNum(t.Temperature),
      toNum(p.Pressure),
      toNum(h.Humidity),
      toNum(m.Muons),
      toNum(hi['Habitability Index']),
    ].join(','));
  }
  return lines.join('\n');
}

export function parseCSV(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error('CSV is empty');

  const header = lines[0].split(',').map((c) => c.trim());
  const isCurrent = headerMatches(header, HEADER);
  const isLegacy  = !isCurrent && headerMatches(header, LEGACY_HEADER);
  if (!isCurrent && !isLegacy) {
    throw new Error(`Unexpected header. Expected: ${HEADER.join(',')}`);
  }

  const data = [];
  const dataTemp = [];
  const dataPres = [];
  const dataHum = [];
  const dataMuon = [];
  const dataHabIndex = [];

  for (let row = 1; row < lines.length; row++) {
    const cells = lines[row].split(',');
    if (cells.length !== header.length) {
      throw new Error(`Row ${row} has ${cells.length} cells, expected ${header.length}`);
    }
    const idx = row - 1;
    const name = String(idx);
    data.push({ name, CH4: toNum(cells[1]), H2: toNum(cells[2]), NH3: toNum(cells[3]) });
    dataTemp.push({ name, Temperature: toNum(cells[4]) });
    dataPres.push({ name, Pressure: toNum(cells[5]) });
    dataHum.push({ name, Humidity: toNum(cells[6]) });
    if (isCurrent) {
      dataMuon.push({ name, Muons: toNum(cells[7]) });
      dataHabIndex.push({ name, 'Habitability Index': toNum(cells[8]) });
    } else {
      dataMuon.push({ name, Muons: 0 });
      dataHabIndex.push({ name, 'Habitability Index': toNum(cells[7]) });
    }
  }

  return { data, dataTemp, dataPres, dataHum, dataMuon, dataHabIndex };
}

export function downloadCSV(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
