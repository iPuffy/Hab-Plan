import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';

function ChartTooltip({ active, payload, label, unit, formatter }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(11,22,53,0.08)',
      borderRadius: 8,
      padding: '8px 10px',
      boxShadow: '0 4px 18px rgba(5,12,40,0.18)',
      color: '#0b1635',
      fontSize: 12,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ color: '#6b769b', marginBottom: 4 }}>sample {label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.5 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: entry.color,
          }} />
          <span style={{ fontWeight: 600 }}>{entry.name}</span>
          <span style={{ marginLeft: 'auto' }}>
            {formatter ? formatter(entry.value) : entry.value}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatValue(v, formatter) {
  if (v === undefined || v === null || Number.isNaN(v)) return '—';
  if (formatter) return formatter(v);
  return typeof v === 'number' ? v.toFixed(1) : v;
}

function ChartCard({
  title,
  unit,
  headerExtra,
  data,
  series,
  formatter,
  yDomain,
  yTickFormatter,
  tall = false,
  showBrush = false,
}) {
  const last = data && data.length > 0 ? data[data.length - 1] : null;
  const pillSeries = series[0];
  const currentValue = last ? last[pillSeries.key] : null;
  const unitIsString = typeof unit === 'string';

  return (
    <div className="hab-card">
      <div className="hab-card-header">
        <div>
          <h3 className="hab-card-title">{title}</h3>
          {headerExtra
            ? <div className="hab-card-extra">{headerExtra}</div>
            : unit ? <p className="hab-card-unit">{unit}</p> : null}
        </div>
        <span className="hab-pill">
          {series.length === 1
            ? formatValue(currentValue, formatter)
            : `${data.length} samples`}
          {series.length === 1 && unitIsString && unit ? ` ${unit.replace(/^\(|\)$/g, '')}` : ''}
        </span>
      </div>

      <div className={tall ? 'hab-chart-wrap-tall' : 'hab-chart-wrap'}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 18, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,22,53,0.08)" />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: 'rgba(11,22,53,0.15)' }} />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: 'rgba(11,22,53,0.15)' }}
              domain={yDomain || ['auto', 'auto']}
              tickFormatter={yTickFormatter}
              width={48}
            />
            <Tooltip content={<ChartTooltip unit={unit ? unit.replace(/^\(|\)$/g, '') : ''} formatter={formatter} />} />
            {series.length > 1 ? <Legend wrapperStyle={{ paddingTop: 6, fontSize: 12 }} /> : null}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label || s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
            {showBrush && data.length > 30 ? (
              <Brush dataKey="name" height={22} stroke="var(--accent)" travellerWidth={8} />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartCard;
