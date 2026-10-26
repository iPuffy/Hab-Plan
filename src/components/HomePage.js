import { useMemo, useState } from 'react';
import { ReactComponent as ArrowUp } from '../arrow-up.svg';
import { ReactComponent as ArrowDown } from '../arrow-down.svg';
import { ReactComponent as ArrowLeft } from '../arrow-left.svg';
import { ReactComponent as ArrowRight } from '../arrow-right.svg';
import { ReactComponent as CloseBtn } from '../close.svg';
import ChartCard from './ChartCard';
import PlaybackBanner from './PlaybackBanner';
import { adcToPpm } from '../lib/ppm';

function UnitToggle({ value, onChange, ppmDisabled }) {
  return (
    <div className="hab-unit-toggle" role="group" aria-label="Gas unit">
      <button
        type="button"
        className={`hab-unit-toggle-btn ${value === 'raw' ? 'is-active' : ''}`}
        onClick={() => onChange('raw')}
        aria-pressed={value === 'raw'}
      >
        raw
      </button>
      <button
        type="button"
        className={`hab-unit-toggle-btn ${value === 'ppm' ? 'is-active' : ''}`}
        onClick={() => onChange('ppm')}
        disabled={ppmDisabled}
        aria-pressed={value === 'ppm'}
        title={ppmDisabled ? 'Calibrate sensors first' : 'Estimated parts per million'}
      >
        ppm
      </button>
    </div>
  );
}

function RoverPadButton({ Icon, onPress, label }) {
  function startHandler(e) {
    if (e && e.preventDefault) e.preventDefault();
    onPress.start();
  }
  function endHandler() {
    onPress.end();
  }
  return (
    <button
      type="button"
      className="hab-rover-btn"
      aria-label={label}
      onMouseDown={startHandler}
      onMouseUp={endHandler}
      onMouseLeave={endHandler}
      onTouchStart={startHandler}
      onTouchEnd={endHandler}
      onTouchCancel={endHandler}
    >
      <Icon />
    </button>
  );
}

function HomePage({
  mode,
  playbackName,
  data,
  dataHabIndex,
  dataTemp,
  dataPres,
  dataHum,
  dataMuon,
  r0,
  calSamples,
  calNeeded,
  rover,
  onReturnToLive,
}) {
  const isLive = mode === 'live';
  const isCalibrated = r0 != null;
  const sampleCount = Math.max(
    data.length,
    dataTemp.length,
    dataPres.length,
    dataHum.length,
    (dataMuon && dataMuon.length) || 0,
    dataHabIndex.length,
  );

  const [unitChoice, setUnitChoice] = useState(null);
  const effectiveUnit = unitChoice || (isCalibrated ? 'ppm' : 'raw');
  const showPpm = effectiveUnit === 'ppm' && isCalibrated;

  const gasChartData = useMemo(() => {
    if (!showPpm) return data;
    return data.map((d) => ({
      name: d.name,
      CH4: adcToPpm(d.CH4, 'CH4', r0.CH4),
      H2:  adcToPpm(d.H2,  'H2',  r0.H2),
      NH3: adcToPpm(d.NH3, 'NH3', r0.NH3),
    }));
  }, [data, showPpm, r0]);

  const gasFormatter = showPpm
    ? (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(1))
    : (v) => v.toFixed(0);

  const gasHeaderExtra = (
    <>
      <UnitToggle
        value={effectiveUnit}
        onChange={setUnitChoice}
        ppmDisabled={!isCalibrated}
      />
      {!isCalibrated ? (
        <span className="hab-card-extra-sub">
          calibrating · {calSamples}/{calNeeded}
        </span>
      ) : null}
    </>
  );

  const pressHandlers = (fn) => ({
    start: () => rover.startContinuousAction(fn),
    end: () => rover.stopContinuousAction(),
  });
  const clickHandlers = (fn) => ({
    start: fn,
    end: () => {},
  });

  return (
    <div className="hab-page">
      <div className="hab-hero">
        <span className="hab-arc" aria-hidden="true" />
        <p className="hab-hero-eyebrow">Rover telemetry</p>
        <h1 className="hab-hero-title">
          {isLive ? 'Live mission control' : 'Replay mode'}
        </h1>
        <p className="hab-hero-sub">
          {isLive
            ? 'Drive the HAB-PLAN rover and watch its habitability index update in real time.'
            : 'Reviewing previously recorded telemetry. Rover controls are disabled until you return to live.'}
        </p>
      </div>

      {!isLive ? (
        <PlaybackBanner
          filename={playbackName}
          sampleCount={sampleCount}
          onReturnToLive={onReturnToLive}
        />
      ) : null}

      <div className="hab-grid">
        <ChartCard
          title="Habitability Index"
          unit="(0 – 1)"
          data={dataHabIndex}
          series={[{ key: 'Habitability Index', color: 'var(--series-1)', label: 'HI' }]}
          formatter={(v) => v.toFixed(3)}
          yDomain={[0, 1]}
          tall
          showBrush
        />
        <ChartCard
          title="Gas concentrations"
          headerExtra={gasHeaderExtra}
          data={gasChartData}
          series={[
            { key: 'CH4', color: 'var(--series-3)' },
            { key: 'H2',  color: 'var(--series-2)' },
            { key: 'NH3', color: 'var(--series-5)' },
          ]}
          formatter={gasFormatter}
          tall
          showBrush
        />
        <ChartCard
          title="Temperature"
          unit="(°C)"
          data={dataTemp}
          series={[{ key: 'Temperature', color: 'var(--series-3)' }]}
          formatter={(v) => v.toFixed(1)}
          showBrush
        />
        <ChartCard
          title="Pressure"
          unit="(hPa)"
          data={dataPres}
          series={[{ key: 'Pressure', color: 'var(--series-2)' }]}
          formatter={(v) => v.toFixed(1)}
          showBrush
        />
        <ChartCard
          title="Humidity"
          unit="(%)"
          data={dataHum}
          series={[{ key: 'Humidity', color: 'var(--series-4)' }]}
          formatter={(v) => v.toFixed(1)}
          yDomain={[0, 100]}
          showBrush
        />
        <ChartCard
          title="Muons"
          unit="(µ/cm²/min)"
          data={dataMuon || []}
          series={[{ key: 'Muons', color: 'var(--series-5)' }]}
          formatter={(v) => v.toFixed(2)}
          showBrush
        />
      </div>

      {isLive ? (
        <>
          <div className="hab-rover-pad" role="group" aria-label="Rover movement controls">
            <span className="hab-rover-slot-empty" />
            <RoverPadButton Icon={ArrowUp} label="Forward" onPress={pressHandlers(rover.handleFront)} />
            <span className="hab-rover-slot-empty" />
            <RoverPadButton Icon={ArrowLeft} label="Left" onPress={pressHandlers(rover.handleLeft)} />
            <span className="hab-rover-slot-empty" />
            <RoverPadButton Icon={ArrowRight} label="Right" onPress={pressHandlers(rover.handleRight)} />
            <span className="hab-rover-slot-empty" />
            <RoverPadButton Icon={ArrowDown} label="Backward" onPress={pressHandlers(rover.handleBack)} />
            <span className="hab-rover-slot-empty" />
          </div>
          <div className="hab-claw-pad" role="group" aria-label="Claw controls">
            <RoverPadButton Icon={CloseBtn} label="Open claw" onPress={clickHandlers(rover.handleOpen)} />
            <RoverPadButton Icon={CloseBtn} label="Close claw" onPress={clickHandlers(rover.handleClose)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

export default HomePage;
