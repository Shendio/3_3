(function () {
  const CONTEMPORARY_YEARS = 2
  const DESC_MAX_LEN = 120

  function requireApiKey() {
    if (!window.API_KEY) {
      throw new Error('Brak API_KEY w config.js.')
    }
    return window.API_KEY
  }

  function fetchNoaa(path) {
    return fetch(path, {
      headers: { token: requireApiKey() }
    }).then(function (response) {
      if (response.status === 401) {
        throw new Error('401 Unauthorized — sprawdź token API w config.js.')
      }
      if (!response.ok) {
        return response.json().catch(function () {
          return {}
        }).then(function (body) {
          const detail = body.message || body.error || ''
          throw new Error(
            'Błąd pobierania danych (HTTP ' +
              response.status +
              ')' +
              (detail ? ': ' + detail : '.')
          )
        })
      }
      return response.json()
    })
  }

  function appendCells(tr, values) {
    values.forEach(function (value) {
      const td = document.createElement('td')
      if (value instanceof Node) {
        td.appendChild(value)
      } else {
        td.textContent = value == null || value === '' ? '—' : value
      }
      tr.appendChild(td)
    })
  }

  function makeBadge(kind) {
    const span = document.createElement('span')
    span.className = 'badge badge-' + kind
    span.textContent = kind
    return span
  }

  function shorten(text, maxLen) {
    if (!text) return '—'
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen - 1) + '…'
  }

  function classifyDataset(dataset) {
    if (!dataset.maxdate) return 'nieznany'

    const maxDate = new Date(dataset.maxdate)
    if (Number.isNaN(maxDate.getTime())) return 'nieznany'

    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - CONTEMPORARY_YEARS)

    return maxDate >= cutoff ? 'współczesny' : 'historyczny'
  }

  // --- stacje ---

  const loadStationsBtn = document.getElementById('loadStationsBtn')
  const stationsStatus = document.getElementById('stationsStatus')
  const stationsTable = document.getElementById('stationsTable')
  const stationsBody = document.getElementById('stationsBody')

  function renderStations(stations) {
    stationsBody.innerHTML = ''

    stations.forEach(function (station) {
      const tr = document.createElement('tr')
      appendCells(tr, [
        station.id || '—',
        station.name || '—',
        station.latitude != null ? station.latitude : '—',
        station.longitude != null ? station.longitude : '—'
      ])
      stationsBody.appendChild(tr)
    })

    stationsTable.hidden = false
  }

  function loadStations() {
    stationsStatus.textContent = 'Pobieranie stacji…'
    stationsTable.hidden = true
    stationsBody.innerHTML = ''
    loadStationsBtn.disabled = true

    fetchNoaa('/api/stations?limit=100')
      .then(function (json) {
        const stations = json.results || []
        if (!stations.length) {
          throw new Error('Brak stacji w odpowiedzi API.')
        }

        renderStations(stations)

        const total = json.metadata?.resultset?.count
        stationsStatus.textContent =
          'Wyświetlono: ' +
          stations.length +
          (total != null ? ' z ' + total + ' dostępnych' : '')
      })
      .catch(function (error) {
        stationsTable.hidden = true
        stationsBody.innerHTML = ''
        stationsStatus.textContent = error.message || 'Wystąpił błąd.'
      })
      .finally(function () {
        loadStationsBtn.disabled = false
      })
  }

  loadStationsBtn.addEventListener('click', loadStations)

  // --- datasety ---

  const loadDatasetsBtn = document.getElementById('loadDatasetsBtn')
  const datasetsStatus = document.getElementById('datasetsStatus')
  const datasetsTable = document.getElementById('datasetsTable')
  const datasetsBody = document.getElementById('datasetsBody')

  function renderDatasets(datasets) {
    datasetsBody.innerHTML = ''

    datasets.forEach(function (dataset) {
      const kind = classifyDataset(dataset)
      const tr = document.createElement('tr')
      tr.className = 'dataset-' + kind

      appendCells(tr, [
        dataset.id || '—',
        dataset.name || '—',
        shorten(dataset.description, DESC_MAX_LEN),
        dataset.mindate || '—',
        dataset.maxdate || '—',
        makeBadge(kind)
      ])

      datasetsBody.appendChild(tr)
    })

    datasetsTable.hidden = false
  }

  function loadDatasets() {
    datasetsStatus.textContent = 'Pobieranie datasetów…'
    datasetsTable.hidden = true
    datasetsBody.innerHTML = ''
    loadDatasetsBtn.disabled = true

    fetchNoaa('/api/datasets?limit=100')
      .then(function (json) {
        const datasets = json.results || []
        if (!datasets.length) {
          throw new Error('Brak datasetów w odpowiedzi API.')
        }

        renderDatasets(datasets)

        const total = json.metadata?.resultset?.count
        const contemporary = datasets.filter(function (d) {
          return classifyDataset(d) === 'współczesny'
        }).length

        datasetsStatus.textContent =
          'Wyświetlono: ' +
          datasets.length +
          (total != null ? ' z ' + total : '') +
          ' · współczesne: ' +
          contemporary +
          ' · historyczne: ' +
          (datasets.length - contemporary)
      })
      .catch(function (error) {
        datasetsTable.hidden = true
        datasetsBody.innerHTML = ''
        datasetsStatus.textContent = error.message || 'Wystąpił błąd.'
      })
      .finally(function () {
        loadDatasetsBtn.disabled = false
      })
  }

  loadDatasetsBtn.addEventListener('click', loadDatasets)

  // --- dane z parametrami ---

  const dataForm = document.getElementById('dataForm')
  const loadDataBtn = document.getElementById('loadDataBtn')
  const dataStatus = document.getElementById('dataStatus')
  const dataTable = document.getElementById('dataTable')
  const dataBody = document.getElementById('dataBody')

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

  function renderDataRows(rows) {
    dataBody.innerHTML = ''

    rows.forEach(function (row) {
      const tr = document.createElement('tr')
      appendCells(tr, [
        row.date || '—',
        row.datatype || '—',
        row.value != null ? row.value : '—'
      ])
      dataBody.appendChild(tr)
    })

    dataTable.hidden = false
  }

  dataForm.addEventListener('submit', function (event) {
    event.preventDefault()

    const datasetid = document.getElementById('datasetid').value.trim()
    const locationid = document.getElementById('locationid').value.trim()
    const startdate = document.getElementById('startdate').value.trim()
    const enddate = document.getElementById('enddate').value.trim()

    if (!datasetid || !locationid || !startdate || !enddate) {
      dataStatus.textContent = 'Wypełnij wszystkie pola.'
      return
    }

    if (!DATE_RE.test(startdate) || !DATE_RE.test(enddate)) {
      dataStatus.textContent = 'Daty muszą być w formacie YYYY-MM-DD.'
      return
    }

    dataStatus.textContent = 'Pobieranie danych…'
    dataTable.hidden = true
    dataBody.innerHTML = ''
    loadDataBtn.disabled = true

    const params = new URLSearchParams({
      datasetid: datasetid,
      locationid: locationid,
      startdate: startdate,
      enddate: enddate,
      limit: '1000'
    })

    fetchNoaa('/api/data?' + params.toString())
      .then(function (json) {
        const rows = json.results || []

        if (!rows.length) {
          dataTable.hidden = true
          dataBody.innerHTML = ''
          dataStatus.textContent = 'Brak danych'
          return
        }

        renderDataRows(rows)

        const total = json.metadata?.resultset?.count
        dataStatus.textContent =
          'Wyświetlono: ' +
          rows.length +
          (total != null ? ' z ' + total : '')
      })
      .catch(function (error) {
        dataTable.hidden = true
        dataBody.innerHTML = ''
        dataStatus.textContent = error.message || 'Wystąpił błąd.'
      })
      .finally(function () {
        loadDataBtn.disabled = false
      })
  })
})()
