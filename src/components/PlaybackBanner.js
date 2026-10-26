function PlaybackBanner({ filename, sampleCount, onReturnToLive }) {
  return (
    <div className="hab-playback" role="status">
      <div className="hab-playback-text">
        <span className="hab-pill hab-pill-muted">PLAYBACK</span>
        <span>Replaying</span>
        <span className="hab-playback-name">{filename || 'imported.csv'}</span>
        <span>· {sampleCount} samples · rover controls disabled</span>
      </div>
      <button type="button" className="hab-btn-outline" onClick={onReturnToLive}>
        Return to live
      </button>
    </div>
  );
}

export default PlaybackBanner;
