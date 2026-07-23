import { isOpenTripMapEnabled } from '../lib/opentripmap'

type SourceLink = { label: string; href: string }

type DataSource = {
  name: string
  use: string
  license: string
  links: SourceLink[]
}

const SOURCES: DataSource[] = [
  {
    name: 'OpenStreetMap',
    use: 'Mapa, lugares del plan, hoteles y restaurantes cercanos (Overpass / Nominatim).',
    license: 'ODbL 1.0',
    links: [
      { label: 'Licencia ODbL', href: 'https://opendatacommons.org/licenses/odbl/1-0/' },
      { label: 'Resumen ODbL', href: 'https://opendatacommons.org/licenses/odbl/summary/' },
      { label: 'Atribución OSM', href: 'https://www.openstreetmap.org/copyright' },
    ],
  },
  {
    name: 'OpenTripMap',
    use: 'POIs turísticos y restaurantes valorados, miniaturas de sitios (solo si hay API key).',
    license: 'Datos derivados de OSM / Wikidata — ver condiciones del servicio',
    links: [
      { label: 'Docs', href: 'https://opentripmap.io/docs' },
      { label: 'Producto / API', href: 'https://opentripmap.io/product' },
    ],
  },
  {
    name: 'Wikipedia',
    use: 'Descripciones breves de monumentos y museos.',
    license: 'CC BY-SA 3.0',
    links: [{ label: 'Licencia', href: 'https://creativecommons.org/licenses/by-sa/3.0/' }],
  },
  {
    name: 'Unsplash',
    use: 'Fotos de destinos en la portada y el wizard.',
    license: 'Licencia Unsplash',
    links: [{ label: 'Licencia', href: 'https://unsplash.com/license' }],
  },
  {
    name: 'Open-Meteo',
    use: 'Previsión del tiempo por día de viaje.',
    license: 'API gratuita — atribución recomendada',
    links: [{ label: 'Sitio', href: 'https://open-meteo.com/' }],
  },
  {
    name: 'OSRM',
    use: 'Tiempos y rutas a pie entre paradas.',
    license: 'BSD 2-Clause',
    links: [
      {
        label: 'Licencia',
        href: 'https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE',
      },
    ],
  },
]

export function DataLicensesSection() {
  const otmOn = isOpenTripMapEnabled()

  return (
    <section className="section licenses-section" aria-labelledby="licenses-heading">
      <h2 id="licenses-heading">Datos y licencias</h2>
      <p className="muted">
        RutaDos muestra lugares y rutas usando datos abiertos de terceros. Debemos atribuir a quienes
        los mantienen. Resumen orientativo; la licencia legal completa está en cada enlace.
      </p>

      <div className="panel licenses-odbl">
        <h3>OpenStreetMap (ODbL)</h3>
        <p>
          El mapa y gran parte de los puntos de interés provienen de{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap contributors
          </a>
          , disponibles bajo la{' '}
          <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">
            Open Database License (ODbL) 1.0
          </a>
          .
        </p>
        <ul className="howto">
          <li>
            <strong>Atribuir:</strong> indicar que los datos/mapas son © OpenStreetMap contributors.
          </li>
          <li>
            <strong>Compartir igual:</strong> si redistribuís una base de datos derivada de OSM (p. ej.
            un volcado descargable de todos los POIs), debe seguir bajo ODbL.
          </li>
          <li>
            <strong>Uso en RutaDos:</strong> consultamos APIs en vivo y mostramos resultados en la app;
            no vendemos ni publicamos un extracto masivo de OSM. Exportar <em>tu</em> itinerario es
            contenido tuyo mezclado con referencias a sitios.
          </li>
        </ul>
        <p className="muted">
          Resumen legible:{' '}
          <a href="https://opendatacommons.org/licenses/odbl/summary/" target="_blank" rel="noreferrer">
            opendatacommons.org/licenses/odbl/summary
          </a>
        </p>
      </div>

      <div className="panel licenses-otm">
        <h3>OpenTripMap</h3>
        <p>
          Con <code>VITE_OPENTRIPMAP_KEY</code> enriquecemos el plan y los restaurantes con POIs
          valorados y, a veces, miniaturas.
        </p>
        <p>
          Estado en este dispositivo:{' '}
          <strong className={otmOn ? 'license-ok' : 'license-off'}>
            {otmOn ? 'Activo' : 'No configurado (solo OpenStreetMap)'}
          </strong>
        </p>
        {!otmOn && (
          <p className="muted">
            Añade la key en <code>.env</code> local y en Vercel → Environment Variables. Guía:{' '}
            <code>docs/OPENTRIPMAP.md</code>.
          </p>
        )}
        <p className="muted">
          Registro y condiciones:{' '}
          <a href="https://opentripmap.io/product" target="_blank" rel="noreferrer">
            opentripmap.io/product
          </a>
          . Los datos de OpenTripMap incorporan OSM; mantén la atribución OSM en el mapa.
        </p>
      </div>

      <ul className="licenses-list">
        {SOURCES.map((s) => (
          <li key={s.name} className="licenses-item">
            <strong>{s.name}</strong>
            <span className="muted">{s.use}</span>
            <span>
              {s.license}
              {s.links.map((link, i) => (
                <span key={link.href}>
                  {i === 0 ? ' · ' : ' · '}
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <p className="muted licenses-foot">
        Fotos propias o de reservas del usuario no están cubiertas por estas licencias. Booking u otros
        enlaces externos tienen sus propios términos al salir de la app.
      </p>
    </section>
  )
}
