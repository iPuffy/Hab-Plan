import { useEffect, useRef, useState } from 'react';

function TopMenu({
  view,
  onHome,
  onAbout,
  onImport,
  onExport,
  exportDisabled,
  onRecalibrate,
  recalibrateDisabled,
}) {
  const [dataOpen, setDataOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!dataOpen) return undefined;
    function handleDocClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDataOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setDataOpen(false);
    }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [dataOpen]);

  function handleImportClick() {
    setDataOpen(false);
    fileInputRef.current && fileInputRef.current.click();
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImport(String(reader.result), file.name);
    };
    reader.onerror = () => {
      onImport(null, file.name, reader.error);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleExportClick() {
    if (exportDisabled) return;
    setDataOpen(false);
    onExport();
  }

  function handleRecalibrateClick() {
    if (recalibrateDisabled) return;
    setDataOpen(false);
    if (onRecalibrate) onRecalibrate();
  }

  return (
    <header className="hab-topbar">
      <div className="hab-topbar-inner">
        <button
          type="button"
          className="hab-nav-item hab-brand"
          onClick={onHome}
          style={{ padding: '0.4rem 0.5rem', fontSize: '1.05rem', letterSpacing: '0.04em' }}
        >
          <span className="hab-brand-prefix">HAB-</span>
          <span className="hab-brand-accent">PLAN</span>
        </button>
        <nav className="hab-nav" aria-label="Main">
          <button
            type="button"
            className={`hab-nav-item ${view === 'home' ? 'is-active' : ''}`}
            onClick={onHome}
          >
            Home
          </button>
          <div className={`hab-dropdown ${dataOpen ? 'is-open' : ''}`} ref={dropdownRef}>
            <button
              type="button"
              className="hab-nav-item"
              aria-haspopup="true"
              aria-expanded={dataOpen}
              onClick={() => setDataOpen((v) => !v)}
            >
              Data ▾
            </button>
            <div className="hab-dropdown-menu" role="menu">
              <button type="button" className="hab-dropdown-item" onClick={handleImportClick}>
                Import CSV…
              </button>
              <button
                type="button"
                className="hab-dropdown-item"
                onClick={handleExportClick}
                disabled={exportDisabled}
                title={exportDisabled ? 'No data to export yet' : 'Download recorded data as CSV'}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="hab-dropdown-item"
                onClick={handleRecalibrateClick}
                disabled={recalibrateDisabled}
                title={recalibrateDisabled
                  ? 'Sensors are not calibrated yet'
                  : 'Discard the current R0 baseline and recalibrate over the next 30 samples'}
              >
                Recalibrate sensors
              </button>
            </div>
          </div>
          <button
            type="button"
            className={`hab-nav-item ${view === 'about' ? 'is-active' : ''}`}
            onClick={onAbout}
          >
            About
          </button>
        </nav>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </header>
  );
}

export default TopMenu;
