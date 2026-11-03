(function () {
  const GIPHY_RANDOM_URL = 'https://api.giphy.com/v1/gifs/random'

  const loadGifBtn = document.getElementById('loadGifBtn')
  const status = document.getElementById('status')
  const gifContainer = document.getElementById('gifContainer')

  function requireApiKey() {
    if (!window.API_KEY) {
      throw new Error('Brak API_KEY w config.js.')
    }
    return window.API_KEY
  }

  function clearGif() {
    gifContainer.innerHTML = ''
  }

  function showGif(url, title) {
    clearGif()

    const img = document.createElement('img')
    img.src = url
    img.alt = title || 'Losowy GIF z GIPHY'
    gifContainer.appendChild(img)
  }

  function loadRandomGif() {
    status.textContent = 'Pobieranie GIF-a…'
    clearGif()
    loadGifBtn.disabled = true

    let apiKey
    try {
      apiKey = requireApiKey()
    } catch (error) {
      status.textContent = error.message
      loadGifBtn.disabled = false
      return
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      rating: 'g'
    })

    fetch(GIPHY_RANDOM_URL + '?' + params.toString())
      .then(function (response) {
        if (!response.ok) {
          return response.json().catch(function () {
            return {}
          }).then(function (body) {
            const detail =
              body.message ||
              body.meta?.msg ||
              ''
            throw new Error(
              'Błąd pobierania GIF-a (HTTP ' +
                response.status +
                ')' +
                (detail ? ': ' + detail : '.')
            )
          })
        }
        return response.json()
      })
      .then(function (json) {
        const gif = json.data
        const url = gif?.images?.original?.url

        if (!url) {
          throw new Error('Brak adresu GIF-a w odpowiedzi API.')
        }

        showGif(url, gif.title)
        status.textContent = gif.title
          ? 'Wyświetlono: ' + gif.title
          : 'Wyświetlono losowy GIF.'
      })
      .catch(function (error) {
        clearGif()
        if (error.name === 'TypeError') {
          status.textContent =
            'Nie udało się połączyć z API (sprawdź internet lub klucz API).'
          return
        }
        status.textContent = error.message || 'Wystąpił błąd.'
      })
      .finally(function () {
        loadGifBtn.disabled = false
      })
  }

  loadGifBtn.addEventListener('click', loadRandomGif)
})()
