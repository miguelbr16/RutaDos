export type CityLink = {
  title: string
  url: string
  blurb: string
}

export type CityGuide = {
  key: string
  transportTitle: string
  transportBlurb: string
  transportTicketUrl: string
  transportMapUrl?: string
  museums: CityLink[]
  shows: CityLink[]
  monuments: CityLink[]
  extra: CityLink[]
}

const GUIDES: Record<string, CityGuide> = {
  londres: {
    key: 'londres',
    transportTitle: 'Transporte en Londres',
    transportBlurb:
      'Tube (metro), buses, Elizabeth line y trenes suburbanos van con la misma tarjeta/app: Oyster o contactless. El Journey Planner de TfL es la referencia.',
    transportTicketUrl: 'https://tfl.gov.uk/fares/',
    transportMapUrl: 'https://tfl.gov.uk/maps/',
    museums: [
      {
        title: 'British Museum (entrada)',
        url: 'https://www.britishmuseum.org/visit',
        blurb: 'Gratuito la colección permanente; reserva franja si hay cola.',
      },
      {
        title: 'National Gallery',
        url: 'https://www.nationalgallery.org.uk/visiting',
        blurb: 'Entrada libre a la colección; expos temporales de pago.',
      },
      {
        title: 'Tate Modern',
        url: 'https://www.tate.org.uk/visit/tate-modern',
        blurb: 'Colección gratuita; reserva recomendada en temporada alta.',
      },
    ],
    shows: [
      {
        title: 'Official London Theatre',
        url: 'https://www.officiallondontheatre.com/',
        blurb: 'Musicales y obras del West End.',
      },
      {
        title: 'TodayTix Londres',
        url: 'https://www.todaytix.com/london',
        blurb: 'Última hora y descuentos.',
      },
    ],
    monuments: [
      {
        title: 'Tower of London',
        url: 'https://www.hrp.org.uk/tower-of-london/',
        blurb: 'Compra online; suele agotarse.',
      },
      {
        title: 'Westminster / Parlamento',
        url: 'https://www.parliament.uk/visiting/',
        blurb: 'Visitas y galerías según disponibilidad.',
      },
    ],
    extra: [
      {
        title: 'Visit London',
        url: 'https://www.visitlondon.com/',
        blurb: 'Guía oficial de la ciudad.',
      },
      {
        title: 'Timeout London',
        url: 'https://www.timeout.com/london',
        blurb: 'Planes, comida y eventos.',
      },
    ],
  },
  madrid: {
    key: 'madrid',
    transportTitle: 'Transporte en Madrid',
    transportBlurb:
      'Metro, EMT (bus) y Cercanías. La tarjeta Multi / abonos en la app o en máquinas de metro.',
    transportTicketUrl: 'https://www.metromadrid.es/es/viaja-en-metro/tarifas-y-titulos',
    transportMapUrl: 'https://www.metromadrid.es/es/viaja-en-metro/mapa-de-red',
    museums: [
      {
        title: 'Museo del Prado',
        url: 'https://www.museodelprado.es/visita',
        blurb: 'Reserva entrada online.',
      },
      {
        title: 'Reina Sofía',
        url: 'https://www.museoreinasofia.es/visita',
        blurb: 'Horarios y entradas.',
      },
      {
        title: 'Thyssen',
        url: 'https://www.museothyssen.org/visita',
        blurb: 'Compra anticipada recomendada.',
      },
    ],
    shows: [
      {
        title: 'Teatro Real',
        url: 'https://www.teatroreal.es/',
        blurb: 'Ópera y espectáculos.',
      },
      {
        title: 'Entradas.com Madrid',
        url: 'https://www.entradas.com/city/madrid/',
        blurb: 'Conciertos y teatros.',
      },
    ],
    monuments: [
      {
        title: 'Palacio Real',
        url: 'https://www.patrimonionacional.es/visita/palacio-real-de-madrid',
        blurb: 'Entradas Patrimonio Nacional.',
      },
    ],
    extra: [
      {
        title: 'EsMadrid',
        url: 'https://www.esmadrid.com/',
        blurb: 'Turismo oficial.',
      },
    ],
  },
  paris: {
    key: 'paris',
    transportTitle: 'Transporte en París',
    transportBlurb:
      'Metro, RER y bus (Île-de-France Mobilités). Navigo Semaine cubre zona 1–5 según el pase; Orly/Disney suelen pedir ticket zona ampliada. En Maps: «Ver línea» para M3/M4/RER concretos.',
    transportTicketUrl: 'https://www.iledefrance-mobilites.fr/en/tickets-fares',
    transportMapUrl: 'https://www.ratp.fr/en/plans',
    museums: [
      {
        title: 'Louvre',
        url: 'https://www.louvre.fr/en/visit',
        blurb: 'Reserva franja si entráis al museo.',
      },
      {
        title: 'Musée d’Orsay',
        url: 'https://www.musee-orsay.fr/en/visit',
        blurb: 'Compra online recomendada.',
      },
    ],
    shows: [
      {
        title: 'Bateaux-Mouches',
        url: 'https://www.bateaux-mouches.fr/',
        blurb: 'Crucero por el Sena; mejor al atardecer/noche.',
      },
      {
        title: 'Disneyland Paris',
        url: 'https://www.disneylandparis.com/',
        blurb: 'Tickets con antelación.',
      },
    ],
    monuments: [
      {
        title: 'Torre Eiffel',
        url: 'https://www.toureiffel.paris/',
        blurb: 'Reserva imprescindible.',
      },
      {
        title: 'Sainte-Chapelle',
        url: 'https://www.sainte-chapelle.fr/',
        blurb: 'Reserva online en temporada.',
      },
    ],
    extra: [
      {
        title: 'Paris je t’aime',
        url: 'https://parisjetaime.com/',
        blurb: 'Turismo oficial.',
      },
    ],
  },
  roma: {
    key: 'roma',
    transportTitle: 'Transporte en Roma',
    transportBlurb:
      'Metro (A/B/C), buses y trams ATAC. Billete BIT o app; el mismo vale metro/bus en el tiempo marcado.',
    transportTicketUrl: 'https://www.atac.roma.it/',
    museums: [
      {
        title: 'Musei Vaticani',
        url: 'https://www.museivaticani.va/',
        blurb: 'Reserva con mucha antelación.',
      },
      {
        title: 'Colosseum / Park tickets',
        url: 'https://parcocolosseo.it/',
        blurb: 'Coliseo, Foro y Palatino.',
      },
    ],
    shows: [
      {
        title: 'Opera di Roma',
        url: 'https://www.operaroma.it/',
        blurb: 'Ópera y ballet.',
      },
    ],
    monuments: [
      {
        title: 'Parco archeologico Colosseo',
        url: 'https://parcocolosseo.it/',
        blurb: 'Entradas oficiales.',
      },
    ],
    extra: [
      {
        title: 'Turismo Roma',
        url: 'https://www.turismoroma.it/',
        blurb: 'Info oficial.',
      },
    ],
  },
  nuremberg: {
    key: 'nuremberg',
    transportTitle: 'Transporte en Núremberg',
    transportBlurb: 'VAG: U-Bahn, tram y bus. Billetes en máquinas o app VAG.',
    transportTicketUrl: 'https://www.vgn.de/',
    museums: [
      {
        title: 'Germanisches Nationalmuseum',
        url: 'https://www.gnm.de/',
        blurb: 'Museo principal.',
      },
    ],
    shows: [],
    monuments: [
      {
        title: 'Kaiserburg',
        url: 'https://www.kaiserburg-nuernberg.de/',
        blurb: 'Castillo imperial.',
      },
    ],
    extra: [
      {
        title: 'Christkindlesmarkt',
        url: 'https://www.christkindlesmarkt.de/',
        blurb: 'Mercadillo de Navidad (temporada).',
      },
    ],
  },
  boston: {
    key: 'boston',
    transportTitle: 'Transporte en Boston',
    transportBlurb: 'MBTA (subway “T”, bus, ferry). CharlieCard / app.',
    transportTicketUrl: 'https://www.mbta.com/fares',
    museums: [
      {
        title: 'Museum of Fine Arts',
        url: 'https://www.mfa.org/visit',
        blurb: 'Entradas online.',
      },
    ],
    shows: [
      {
        title: 'Broadway in Boston',
        url: 'https://www.broadwayinboston.com/',
        blurb: 'Musicales.',
      },
    ],
    monuments: [],
    extra: [
      {
        title: 'Meet Boston',
        url: 'https://www.meetboston.com/',
        blurb: 'Turismo oficial.',
      },
    ],
  },
  'san diego': {
    key: 'san diego',
    transportTitle: 'Transporte en San Diego',
    transportBlurb: 'MTS: trolley, bus. PRONTO card / app.',
    transportTicketUrl: 'https://www.sdmts.com/fares-passes',
    museums: [],
    shows: [],
    monuments: [],
    extra: [
      {
        title: 'San Diego Tourism',
        url: 'https://www.sandiego.org/',
        blurb: 'Guía oficial.',
      },
    ],
  },
  japon: {
    key: 'japon',
    transportTitle: 'Transporte en Japón',
    transportBlurb:
      'IC cards (Suica/Pasmo), JR Pass si os compensa, metros locales por ciudad. Google Maps funciona muy bien con trenes.',
    transportTicketUrl: 'https://www.japan-guide.com/e/e2359_003.html',
    museums: [],
    shows: [],
    monuments: [],
    extra: [
      {
        title: 'Japan Guide',
        url: 'https://www.japan-guide.com/',
        blurb: 'Referencia en inglés/español básico.',
      },
      {
        title: 'JNTO',
        url: 'https://www.japan.travel/es/',
        blurb: 'Turismo oficial.',
      },
    ],
  },
  suiza: {
    key: 'suiza',
    transportTitle: 'Transporte en Suiza',
    transportBlurb: 'SBB: trenes, buses y barcos coordinados. Swiss Travel Pass si os interesa.',
    transportTicketUrl: 'https://www.sbb.ch/en/tickets-offers.html',
    museums: [],
    shows: [],
    monuments: [],
    extra: [
      {
        title: 'Switzerland Tourism',
        url: 'https://www.myswitzerland.com/',
        blurb: 'Guía oficial.',
      },
    ],
  },
  dolomitas: {
    key: 'dolomitas',
    transportTitle: 'Moverse por Dolomitas',
    transportBlurb:
      'Coche/furgoneta es lo habitual. En temporada hay buses de valle (SAD / Mobilcard en algunos valles).',
    transportTicketUrl: 'https://www.suedtirolmobil.info/',
    museums: [],
    shows: [],
    monuments: [],
    extra: [
      {
        title: 'Dolomiti Supersummer / info',
        url: 'https://www.dolomiti.org/',
        blurb: 'Info turística de la zona.',
      },
    ],
  },
}

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/nuremberg|nuernberg/, 'nuremberg')
    .replace(/london/, 'londres')
    .replace(/rome/, 'roma')
    .replace(/paris|parís/, 'paris')
    .replace(/japan/, 'japon')
    .replace(/switzerland|schweiz/, 'suiza')
    .replace(/dolomites/, 'dolomitas')
    .trim()
}

export function getCityGuide(cityName: string, displayName?: string): CityGuide | null {
  const blob = normalizeKey(`${cityName} ${displayName ?? ''}`)
  for (const [key, guide] of Object.entries(GUIDES)) {
    if (blob.includes(key)) return guide
  }
  // partial
  if (blob.includes('londres') || blob.includes('london')) return GUIDES.londres
  if (blob.includes('madrid')) return GUIDES.madrid
  if (blob.includes('paris')) return GUIDES.paris
  if (blob.includes('roma') || blob.includes('rome')) return GUIDES.roma
  if (blob.includes('nurem') || blob.includes('nuremberg')) return GUIDES.nuremberg
  if (blob.includes('boston')) return GUIDES.boston
  if (blob.includes('san diego') || blob.includes('sandiego')) return GUIDES['san diego']
  if (blob.includes('japon') || blob.includes('japan') || blob.includes('tokyo') || blob.includes('tokio')) {
    return GUIDES.japon
  }
  if (blob.includes('suiza') || blob.includes('swiss')) return GUIDES.suiza
  if (blob.includes('dolomit')) return GUIDES.dolomitas
  return null
}

export function genericGuide(cityName: string): CityGuide {
  const q = encodeURIComponent(cityName)
  return {
    key: 'generic',
    transportTitle: `Transporte en ${cityName}`,
    transportBlurb:
      'Busca la empresa de transporte local (metro/bus) y la app oficial. Google Maps suele dar bien las líneas.',
    transportTicketUrl: `https://www.google.com/maps/search/public+transport+${q}`,
    museums: [
      {
        title: 'Museos (búsqueda)',
        url: `https://www.google.com/maps/search/museums+${q}`,
        blurb: 'Encuentra y reserva según cada museo.',
      },
    ],
    shows: [
      {
        title: 'Espectáculos',
        url: `https://www.google.com/search?q=theatre+tickets+${q}`,
        blurb: 'Entradas de teatros y shows.',
      },
    ],
    monuments: [
      {
        title: 'Monumentos',
        url: `https://www.google.com/maps/search/monuments+${q}`,
        blurb: 'Sitios icónicos en el mapa.',
      },
    ],
    extra: [
      {
        title: `Visit ${cityName}`,
        url: `https://www.google.com/search?q=official+tourism+${q}`,
        blurb: 'Web de turismo oficial.',
      },
    ],
  }
}
