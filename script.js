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

  // --- 3.3.2 wyszukiwanie ---

  const searchForm = document.getElementById('searchForm')
  const searchBtn = document.getElementById('searchBtn')
  const queryInput = document.getElementById('query')
  const searchStatus = document.getElementById('searchStatus')
  const results = document.getElementById('results')

  function clearResults() {
    results.innerHTML = ''
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

  searchForm.addEventListener('submit', function (event) {
    event.preventDefault()

    const query = queryInput.value.trim()
    if (!query) {
      searchStatus.textContent = 'Wpisz frazę do wyszukania.'
      clearResults()
      return
    }

    searchStatus.textContent = 'Wyszukiwanie…'
    clearResults()
    searchBtn.disabled = true

    let apiKey
    try {
      apiKey = requireApiKey()
    } catch (error) {
      searchStatus.textContent = error.message
      searchBtn.disabled = false
      return
    }

    const url =
      GIPHY_SEARCH_URL +
      '?api_key=' +
      encodeURIComponent(apiKey) +
      '&q=' +
      encodeURIComponent(query) +
      '&limit=' +
      SEARCH_LIMIT +
      '&rating=g'

    fetch(url)
      .then(parseGiphyResponse)
      .then(function (json) {
        const gifs = json.data || []

        if (!gifs.length) {
          clearResults()
          searchStatus.textContent = 'Brak wyników'
          return
        }

        renderSearchResults(gifs)
        searchStatus.textContent = 'Znaleziono: ' + gifs.length
      })
      .catch(function (error) {
        clearResults()
        searchStatus.textContent = networkErrorMessage(error)
      })
      .finally(function () {
        searchBtn.disabled = false
      })
  })
})()
