import './AppLayout.css'
import MapView from './MapView'

function AppLayout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">NB</div>
          <div className="app-header__text">
            <span className="app-header__title">NAVBEATS</span>
            <span className="app-header__subtitle">Soundtracking every turn.</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="app-main__panel app-main__panel--map">
          <h2 className="app-main__panel-title">Map view</h2>
          <MapView />
        </section>

        <section className="app-main__panel app-main__panel--controls">
          <h2 className="app-main__panel-title">Route &amp; controls</h2>
          <p className="app-main__panel-placeholder">
            Route input, playback controls, and vibe tuning will live here.
          </p>
        </section>
      </main>
    </div>
  )
}

export default AppLayout
