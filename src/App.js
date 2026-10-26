import { useCallback, useRef, useState } from 'react';
import axios from 'axios';

import TopMenu from './components/TopMenu';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';

import { exportCSV, parseCSV, downloadCSV } from './lib/csv';
import { adcToRs, deriveR0, loadR0, saveR0, clearR0, mean } from './lib/ppm';

import './theme.css';

const CALIBRATION_SAMPLES = 30;

const ip = process.env.REACT_APP_ROBOT_URL || 'http://AstroVianu.local:8080';

function getParameterIndex(val, optimal, devLessEqual, devGreater) {
  const dev = val <= optimal ? devLessEqual : devGreater;
  return Math.exp(-Math.pow((val - optimal) / dev, 2));
}

function computeHabitabilityIndex({ T, P, U, CH4, H2, NH3, M }) {
  const I_T   = getParameterIndex(T,   22,      30,  15);
  const I_P   = getParameterIndex(P,   1013.25, 200, 800);
  const I_U   = getParameterIndex(U,   45,      20,  45);
  const I_CH4 = getParameterIndex(CH4, 329,     250, 250);
  const I_H2  = getParameterIndex(H2,  366,     225, 225);
  const I_NH3 = getParameterIndex(NH3, 300,     350, 350);
  const I_M   = getParameterIndex(M,   1,       100, 5);

  //console.log("I_M " + I_M + " " + M)

  return (
    Math.pow(I_T,   0.25) *
    Math.pow(I_P,   0.20) *
    Math.pow(I_U,   0.20) *
    Math.pow(I_CH4, 0.07) *
    Math.pow(I_H2,  0.08) *
    Math.pow(I_NH3, 0.08) *
    Math.pow(I_M,   0.12)
  );
}

function parseSensorPayload(response) {
  let responseObj;
  try {
    responseObj = typeof response === 'string' ? JSON.parse(response) : response;
  } catch (e) {
    responseObj = response;
  }
  const responseString = (responseObj && responseObj.data) || '';
  const map = {};
  const regex = /([a-zA-Z0-9_-]+)\s*=\s*([0-9.]+)/g; // /(\w+)\s*=\s*([0-9.]+)/g;
  let match;
  console.log(responseString)
  while ((match = regex.exec(responseString)) !== null) {
    console.log()
    map[match[1].toLowerCase()] = match[2];
  }
  return map;
}

function App() {
  const [view, setView] = useState('home');
  const [mode, setMode] = useState('live');
  const [playbackName, setPlaybackName] = useState(null);

  const [data, setData] = useState([]);
  const [dataTemp, setDataTemp] = useState([]);
  const [dataPres, setDataPres] = useState([]);
  const [dataHum, setDataHum] = useState([]);
  const [dataMuon, setDataMuon] = useState([]);
  const [dataHabIndex, setHabIndex] = useState([]);

  const [r0, setR0] = useState(() => loadR0());
  const [calSamples, setCalSamples] = useState(0);
  const calBufferRef = useRef({ CH4: [], H2: [], NH3: [] });

  const actionTimerRef = useRef(null);

  const addResponseToData = useCallback((response) => {
    const map = parseSensorPayload(response);

    const T   = map.temperature ? parseFloat(map.temperature) - 10 : 0;
    const P   = map.pressure    ? parseFloat(map.pressure)        : 0;
    const U   = map.humidity    ? parseFloat(map.humidity)        : 0;
    const CH4 = map.mq4         ? parseFloat(map.mq4)             : 0;
    const H2  = map.mq8         ? parseFloat(map.mq8)             : 0;
    const NH3 = map.mq135       ? parseFloat(map.mq135)           : 0;
    const M1  = map.mflux       ? parseFloat(map.mflux)           : 1;

    const TIME_ELAPSED = map.elapsed_time ? parseFloat(map.elapsed_time) : 1;

    const M = M1 / 10 / TIME_ELAPSED * 60;

    //console.log(TIME_ELAPSED)
    //console.log(M)

    const HI = computeHabitabilityIndex({ T, P, U, CH4, H2, NH3, M });

    if (!r0) {
      const rsCH4 = adcToRs(CH4);
      const rsH2  = adcToRs(H2);
      const rsNH3 = adcToRs(NH3);
      const buf = calBufferRef.current;
      if (rsCH4 != null) buf.CH4.push(rsCH4);
      if (rsH2  != null) buf.H2.push(rsH2);
      if (rsNH3 != null) buf.NH3.push(rsNH3);
      const progress = Math.min(buf.CH4.length, buf.H2.length, buf.NH3.length);
      setCalSamples(progress);
      if (progress >= CALIBRATION_SAMPLES) {
        const newR0 = {
          CH4: deriveR0(mean(buf.CH4), 'CH4'),
          H2:  deriveR0(mean(buf.H2),  'H2'),
          NH3: deriveR0(mean(buf.NH3), 'NH3'),
        };
        if (newR0.CH4 > 0 && newR0.H2 > 0 && newR0.NH3 > 0) {
          saveR0(newR0);
          setR0(newR0);
        }
        calBufferRef.current = { CH4: [], H2: [], NH3: [] };
        setCalSamples(0);
      }
    }

    setData(prev => [...prev, { name: String(prev.length), CH4, H2, NH3 }]);
    setHabIndex(prev => [...prev, { name: String(prev.length), 'Habitability Index': HI }]);
    setDataTemp(prev => [...prev, { name: String(prev.length), Temperature: T }]);
    setDataPres(prev => [...prev, { name: String(prev.length), Pressure: P }]);
    setDataHum(prev => [...prev, { name: String(prev.length), Humidity: U }]);
    setDataMuon(prev => [...prev, { name: String(prev.length), Muons: M }]);
  }, [r0]);

  const startContinuousAction = useCallback((actionFn) => {
    if (actionTimerRef.current !== null) return;
    actionFn();
    actionTimerRef.current = setInterval(actionFn, 150);
  }, []);

  const stopContinuousAction = useCallback(() => {
    if (actionTimerRef.current !== null) {
      clearInterval(actionTimerRef.current);
      actionTimerRef.current = null;
    }
  }, []);

  const sendCommand = useCallback((path) => {
    return axios.get(ip + path).then((response) => {
      addResponseToData(JSON.stringify(response));
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('rover request failed', path, err && err.message);
    });
  }, [addResponseToData]);

  const handleFront = useCallback(() => { sendCommand('/move/fata'); }, [sendCommand]);
  const handleBack  = useCallback(() => { sendCommand('/move/spate'); }, [sendCommand]);
  const handleLeft  = useCallback(() => { sendCommand('/move/stanga'); }, [sendCommand]);
  const handleRight = useCallback(() => { sendCommand('/move/dreapta'); }, [sendCommand]);
  const handleOpen  = useCallback(() => { sendCommand('/gheara/open'); }, [sendCommand]);
  const handleClose = useCallback(() => { sendCommand('/gheara/close'); }, [sendCommand]);

  const sampleCount = Math.max(
    data.length,
    dataTemp.length,
    dataPres.length,
    dataHum.length,
    dataMuon.length,
    dataHabIndex.length,
  );
  const exportDisabled = sampleCount === 0;

  function handleExport() {
    const csv = exportCSV({ data, dataTemp, dataPres, dataHum, dataMuon, dataHabIndex });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(`hab-plan-${stamp}.csv`, csv);
  }

  function handleImport(text, filename, err) {
    if (err || text == null) {
      window.alert(`Could not read ${filename || 'file'}: ${err ? err.message : 'no content'}`);
      return;
    }
    try {
      const parsed = parseCSV(text);
      stopContinuousAction();
      setData(parsed.data);
      setDataTemp(parsed.dataTemp);
      setDataPres(parsed.dataPres);
      setDataHum(parsed.dataHum);
      setDataMuon(parsed.dataMuon);
      setHabIndex(parsed.dataHabIndex);
      setMode('playback');
      setPlaybackName(filename);
      setView('home');
    } catch (e) {
      window.alert(`Could not import ${filename}: ${e.message}`);
    }
  }

  function handleReturnToLive() {
    setData([]);
    setDataTemp([]);
    setDataPres([]);
    setDataHum([]);
    setDataMuon([]);
    setHabIndex([]);
    setPlaybackName(null);
    setMode('live');
  }

  function handleRecalibrate() {
    clearR0();
    setR0(null);
    calBufferRef.current = { CH4: [], H2: [], NH3: [] };
    setCalSamples(0);
  }

  const rover = {
    handleFront, handleBack, handleLeft, handleRight, handleOpen, handleClose,
    startContinuousAction, stopContinuousAction,
  };

  return (
    <>
      <TopMenu
        view={view}
        onHome={() => setView('home')}
        onAbout={() => setView('about')}
        onImport={handleImport}
        onExport={handleExport}
        exportDisabled={exportDisabled}
        onRecalibrate={handleRecalibrate}
        recalibrateDisabled={!r0}
      />
      {view === 'home' ? (
        <HomePage
          mode={mode}
          playbackName={playbackName}
          data={data}
          dataHabIndex={dataHabIndex}
          dataTemp={dataTemp}
          dataPres={dataPres}
          dataHum={dataHum}
          dataMuon={dataMuon}
          r0={r0}
          calSamples={calSamples}
          calNeeded={CALIBRATION_SAMPLES}
          rover={rover}
          onReturnToLive={handleReturnToLive}
        />
      ) : (
        <AboutPage />
      )}
    </>
  );
}

export default App;
