const PARAMETERS = [
  { name: 'Temperature', symbol: 'T',  opt: '22 °C',        dev: 'σ₁ = 30, σ₂ = 15',   weight: '25 %' },
  { name: 'Pressure',    symbol: 'P',  opt: '1013.25 hPa',  dev: 'σ₁ = 200, σ₂ = 800', weight: '20 %' },
  { name: 'Humidity',    symbol: 'U',  opt: '45 %',         dev: 'σ₁ = 20, σ₂ = 45',   weight: '20 %' },
  { name: 'Muons',       symbol: 'M',  opt: '1 µ/cm²/min',  dev: 'σ = 5',              weight: '12 %' },
  { name: 'Methane',     symbol: 'CH₄', opt: '329 (sensor)', dev: 'σ = 250',           weight: '7 %'  },
  { name: 'Hydrogen',    symbol: 'H₂', opt: '366 (sensor)', dev: 'σ = 225',            weight: '8 %'  },
  { name: 'Ammonia',     symbol: 'NH₃', opt: '300 (sensor)', dev: 'σ = 350',           weight: '8 %'  },
];

const CAVEATS = [
  {
    sensor: 'MQ-4 · Methane (CH₄)',
    notes: [
      'Cross-sensitive to liquefied petroleum gas (LPG), butane and other combustible gases, not selective for methane.',
      'Needs ~24 h initial burn-in and a 3-minute warm-up after power-on for stable readings.',
      'Reading drifts with temperature and humidity; recalibrate when ambient conditions change.',
    ],
  },
  {
    sensor: 'MQ-8 · Hydrogen (H₂)',
    notes: [
      'Also responds to alcohol, LPG and town gas; readings outside a lab can be ambiguous.',
      'Heater draws ~200 mA at 5 V; brown-outs from a shared USB rail bias readings.',
      'The Rs/R₀ ratio in clean air is very high (≈70), so a small calibration error amplifies into a large ppm error.',
    ],
  },
  {
    sensor: 'MQ-135 · Ammonia (NH₃)',
    notes: [
      'Marketed as an "air-quality" sensor: picks up CO₂, NOₓ, alcohol, benzene and smoke.',
      'The NH₃ curve is the least reliable of the family; validate against a known reference.',
      'Humidity above ~65 % RH biases the reading low.',
    ],
  },
  {
    sensor: 'Sense HAT · Temperature & Humidity',
    notes: [
      'The HAT sits directly above the Raspberry Pi CPU; raw temperature reads roughly 5-10 °C high. The dashboard applies a fixed -4 °C offset as a partial correction.',
      'HTS221 humidity is reliable between ~20 % and ~80 % RH; outside that range trust decreases.',
      'Thermal cross-talk between the two HAT sensors means the humidity reading also shifts with CPU load.',
    ],
  },
  {
    sensor: 'Barometer · Pressure',
    notes: [
      'Reading is local pressure, not sea-level pressure; altitude reduces it by ~12 hPa per 100 m.',
      'The optimum (1013.25 hPa) used by the index is a sea-level reference, so high-altitude environments score below 1 even when comfortable.',
    ],
  },
  {
    sensor: 'Muon detector',
    notes: [
      'Background cosmic-muon flux at sea level is ~1 µ/cm²/min; values are inherently statistical and noisy at short intervals.',
      'Concrete ceilings and walls attenuate the count significantly, indoor readings are biased low.',
      'A spike from a single shower of cosmic-ray secondaries is normal; do not treat outliers as alarms.',
    ],
  },
  {
    sensor: 'Sources',
    notes: [
      'Information acquired from the technical sheets of each sensor.'
    ]
  }
];

function AboutPage() {
  return (
    <div className="hab-page">
      <div className="hab-hero">
        <span className="hab-arc" aria-hidden="true" />
        <p className="hab-hero-eyebrow">About the project</p>
        <h1 className="hab-hero-title">HAB-PLAN — Smart decisions for the future of space exploration</h1>
        <p className="hab-hero-sub">
          An autonomous rover that analyses how habitable an environment is by collecting and interpreting the data
          essential for assessing future human colonisation of planets or natural satellites.
        </p>
        <div className="hab-credits">
          <span className="hab-credit-pill">Tudor Mătăsaru</span>
          <span className="hab-credit-pill">Teodor Preda</span>
          <span className="hab-credit-pill">Coord. Prof. Ioana Stoica</span>
        </div>
      </div>

      <div className="hab-about-grid">
        <div className="hab-card hab-about-card">
          <h3 className="hab-about-card-title">The mission</h3>
          <p>
            HAB-PLAN reads seven environmental parameters and combines them into a single
            <em> Habitability Index </em> between 0 and 1. The closer to 1, the closer the
            environment is to one that could sustain human life.
          </p>
          <p>
            The rover hardware combines a Raspberry Pi (Sense HAT), Arduino UNO and Arduino Mega 2560,
            plus gas, climate, ultrasonic, magnetometer and muon sensors. It is controlled remotely
            over the local network from this web interface.
          </p>
        </div>

        <div className="hab-card hab-about-card">
          <h3 className="hab-about-card-title">How the index is built</h3>
          <p>
            Each parameter is mapped through an asymmetric Gaussian centred on its biologically
            optimal value, using different deviations for under-shoot and over-shoot. That yields a
            score between 0 and 1 per parameter.
          </p>
          <p>
            The seven scores are combined into a weighted geometric mean — the weights reflect how
            critical each parameter is to human survival. The formula:
          </p>
          <p><code>HI = ∏ Iₖ^(wₖ)</code> with <code>∑ wₖ = 1</code>.</p>
        </div>

        <div className="hab-card hab-about-card">
          <h3 className="hab-about-card-title">Parameters</h3>
          <ul>
            {PARAMETERS.map((p) => (
              <li key={p.name}>
                <strong>{p.symbol}</strong> — {p.name}: optimum {p.opt}, {p.dev}, weight {p.weight}
              </li>
            ))}
          </ul>
        </div>

        <div className="hab-card hab-about-card">
          <h3 className="hab-about-card-title">Using this dashboard</h3>
          <ul>
            <li><strong>Home</strong> — drive the rover; hold a direction button to keep moving.</li>
            <li><strong>Data → Export CSV</strong> — save the current recording to disk.</li>
            <li><strong>Data → Import CSV</strong> — replay a recording in read-only playback mode.</li>
            <li><strong>Data → Recalibrate sensors</strong> — discard the stored R₀ baseline; the next 30 samples rebuild it.</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Configure the rover endpoint with <code>REACT_APP_ROBOT_URL</code> at build time, e.g.
            <code> http://AstroVianu.local:8080</code>.
          </p>
        </div>

        <div className="hab-card hab-about-card">
          <h3 className="hab-about-card-title">Sensor caveats</h3>
          <p style={{ marginTop: 0 }}>
            The readings are only as good as the sensors that produce them. Treat the Habitability
            Index as an indicator, not a verdict.
          </p>
          {CAVEATS.map((c) => (
            <div key={c.sensor} style={{ marginTop: '0.85rem' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-on-light)' }}>{c.sensor}</p>
              <ul style={{ marginTop: '0.25rem' }}>
                {c.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
