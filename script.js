(function () {
  const GIPHY_RANDOM_URL = 'https://api.giphy.com/v1/gifs/random'
  const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search'
  const SEARCH_LIMIT = 12

  function requireApiKey() {
    if (!window.API_KEY) {
      throw new Error('Brak API_KEY w config.js.')
    }
    return window.API_KEY
  }

  function parseGiphyResponse(response) {
    if (!response.ok) {
      return response.json().catch(function () {
        return {}
      }).then(function (body) {
        const detail = body.message || body.meta?.msg || ''
        throw new Error(
          'Błąd pobierania danych (HTTP ' +
            response.status +
            ')' +
            (detail ? ': ' + detail : '.')
        )
      })
    }
    return response.json()
  }

  function networkErrorMessage(error) {
    if (error.name === 'TypeError') {
      return 'Nie udało się połączyć z API (sprawdź internet lub klucz API).'
    }
    return error.message || 'Wystąpił błąd.'
  }

  // --- 3.3.1 losowy GIF ---

  const loadGifBtn = document.getElementById('loadGifBtn')
  const randomStatus = document.getElementById('randomStatus')
  const gifContainer = document.getElementById('gifContainer')

  function clearRandomGif() {
    gifContainer.innerHTML = ''
  }

  function showRandomGif(url, title) {
    clearRandomGif()

    const img = document.createElement('img')
    img.src = url
    img.alt = title || 'Losowy GIF z GIPHY'
    gifContainer.appendChild(img)
  }

  function loadRandomGif() {
    randomStatus.textContent = 'Pobieranie GIF-a…'
    clearRandomGif()
    loadGifBtn.disabled = true

    let apiKey
    try {
      apiKey = requireApiKey()
    } catch (error) {
      randomStatus.textContent = error.message
      loadGifBtn.disabled = false
      return
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      rating: 'g'
    })

    fetch(GIPHY_RANDOM_URL + '?' + params.toString())
      .then(parseGiphyResponse)
      .then(function (json) {
        const gif = json.data
        const url = gif?.images?.original?.url

        if (!url) {
          throw new Error('Brak adresu GIF-a w odpowiedzi API.')
        }

        showRandomGif(url, gif.title)
        randomStatus.textContent = gif.title
          ? 'Wyświetlono: ' + gif.title
          : 'Wyświetlono losowy GIF.'
      })
      .catch(function (error) {
        clearRandomGif()
        randomStatus.textContent = networkErrorMessage(error)
      })
      .finally(function () {
        loadGifBtn.disabled = false
      })
  }

  loadGifBtn.addEventListener('click', loadRandomGif)

  // --- 3.3.2 / 3.3.3 wyszukiwanie + paginacja ---

  const searchForm = document.getElementById('searchForm')
  const searchBtn = document.getElementById('searchBtn')
  const queryInput = document.getElementById('query')
  const searchStatus = document.getElementById('searchStatus')
  const results = document.getElementById('results')
  const pagination = document.getElementById('pagination')
  const prevBtn = document.getElementById('prevBtn')
  const nextBtn = document.getElementById('nextBtn')
  const pageInfo = document.getElementById('pageInfo')

  let lastQuery = ''
  let offset = 0

  function clearResults() {
    results.innerHTML = ''
  }

  function updatePagination(pageLength) {
    const page = Math.floor(offset / SEARCH_LIMIT) + 1
    const hasPrev = offset > 0
    // ostatnia strona może mieć mniej niż limit wyników
    const hasNext = pageLength >= SEARCH_LIMIT

    pagination.hidden = !lastQuery || pageLength === 0 && offset === 0
    prevBtn.disabled = !hasPrev
    nextBtn.disabled = !hasNext
    pageInfo.textContent =
      'Strona ' + page + ' · offset ' + offset
  }

  function hidePagination() {
    pagination.hidden = true
    prevBtn.disabled = true
    nextBtn.disabled = true
    pageInfo.textContent = ''
  }

  function renderSearchResults(gifs) {
    clearResults()

    gifs.forEach(function (gif) {
      const url = gif?.images?.original?.url
      if (!url) return

      const img = document.createElement('img')
      img.src = url
      img.alt = gif.title || 'GIF z GIPHY'
      results.appendChild(img)
    })
  }

  function searchGifs() {
    if (!lastQuery) {
      searchStatus.textContent = 'Wpisz frazę do wyszukania.'
      clearResults()
      hidePagination()
      return
    }

    if (offset < 0) {
      offset = 0
    }

    searchStatus.textContent = 'Wyszukiwanie…'
    clearResults()
    searchBtn.disabled = true
    prevBtn.disabled = true
    nextBtn.disabled = true

    let apiKey
    try {
      apiKey = requireApiKey()
    } catch (error) {
      searchStatus.textContent = error.message
      searchBtn.disabled = false
      hidePagination()
      return
    }

    const url =
      GIPHY_SEARCH_URL +
      '?api_key=' +
      encodeURIComponent(apiKey) +
      '&q=' +
      encodeURIComponent(lastQuery) +
      '&limit=' +
      SEARCH_LIMIT +
      '&offset=' +
      offset +
      '&rating=g'

    fetch(url)
      .then(parseGiphyResponse)
      .then(function (json) {
        const gifs = json.data || []

        if (!gifs.length) {
          clearResults()
          if (offset === 0) {
            searchStatus.textContent = 'Brak wyników'
            hidePagination()
          } else {
            // cofnięcie, gdy offset wyszedł poza dostępne wyniki
            offset = Math.max(0, offset - SEARCH_LIMIT)
            searchStatus.textContent = 'Brak dalszych wyników.'
            updatePagination(0)
          }
          return
        }

        renderSearchResults(gifs)
        searchStatus.textContent =
          'Wyświetlono: ' +
          gifs.length +
          ' (fraza: „' +
          lastQuery +
          '”)'
        updatePagination(gifs.length)
      })
      .catch(function (error) {
        clearResults()
        hidePagination()
        searchStatus.textContent = networkErrorMessage(error)
      })
      .finally(function () {
        searchBtn.disabled = false
      })
  }

  searchForm.addEventListener('submit', function (event) {
    event.preventDefault()

    const query = queryInput.value.trim()
    if (!query) {
      searchStatus.textContent = 'Wpisz frazę do wyszukania.'
      clearResults()
      hidePagination()
      return
    }

    lastQuery = query
    offset = 0
    searchGifs()
  })

  prevBtn.addEventListener('click', function () {
    offset = Math.max(0, offset - SEARCH_LIMIT)
    searchGifs()
  })

  nextBtn.addEventListener('click', function () {
    offset = offset + SEARCH_LIMIT
    searchGifs()
  })
})()
