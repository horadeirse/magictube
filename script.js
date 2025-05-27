const apiKey = 'AIzaSyD2ORUEbrRFVRz1HwJ1MCiTC1Rz_flNE4k'; // reemplaza por tu clave

// Contraseña hasheada (sha256 de: tu-contraseña-aqui)
const passwordHash = 'f2fa0a769ee8469b6e1d04401506b6d24ae40744859ebd2ec2778a0aa99900af';

let lastSearch = { query: '', type: 'video' }; // guardamos última búsqueda para "volver"

const MAX_HISTORY = 10;

// SHA-256 para contraseña
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verificar contraseña
async function checkPassword() {
  const input = document.getElementById('password');
  const error = document.getElementById('error');
  const entered = input.value.trim();

  if (!entered) {
    error.textContent = 'Por favor ingresa la contraseña';
    return;
  }

  const hash = await sha256(entered);
  if (hash === passwordHash) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    error.textContent = '';
    input.value = '';
    await searchYouTube('lofi hip hop', 'video');
  } else {
    error.textContent = 'Contraseña incorrecta';
  }
}

// Función para crear botón "Volver"
function createBackButton() {
  const main = document.querySelector('main');
  if (document.getElementById('back-button')) return;

  const btn = document.createElement('button');
  btn.id = 'back-button';
  btn.textContent = '⬅ Volver a resultados';
  btn.style = `
    margin: 1rem auto;
    display: block;
    background: #00e1ff;
    border: none;
    color: #000;
    font-weight: bold;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    cursor: pointer;
    box-shadow: 0 0 10px #00e1ff;
    transition: background 0.3s ease;
  `;
  btn.onmouseover = () => (btn.style.background = '#00b8cc');
  btn.onmouseout = () => (btn.style.background = '#00e1ff');
  btn.onclick = () => {
    document.getElementById('results').innerHTML = '';
    document.getElementById('player').innerHTML = '';
    btn.remove();
    searchYouTube(lastSearch.query, lastSearch.type);
  };

  main.prepend(btn);
}

// Chequear si video es embebible
async function isEmbeddableVideo(videoId) {
  try {
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${apiKey}`
    );
    const detailData = await detailRes.json();
    return detailData.items?.[0]?.status?.embeddable ?? false;
  } catch {
    return false;
  }
}

// Guardar video en historial
function saveVideoToHistory(video) {
  let history = JSON.parse(localStorage.getItem('videoHistory') || '[]');

  // Evitar duplicados
  history = history.filter(v => v.videoId !== video.videoId);

  // Añadir al inicio
  history.unshift(video);

  // Limitar tamaño
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);

  localStorage.setItem('videoHistory', JSON.stringify(history));

  renderHistory();
}

// Obtener historial
function getVideoHistory() {
  return JSON.parse(localStorage.getItem('videoHistory') || '[]');
}

// Mostrar historial en panel
function renderHistory() {
  const historyContainer = document.getElementById('history-list');
  if (!historyContainer) return;

  const history = getVideoHistory();
  if (history.length === 0) {
    historyContainer.innerHTML = '<p>No hay videos en el historial.</p>';
    return;
  }

  historyContainer.innerHTML = '';
  history.forEach(video => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <img src="${video.thumbnail}" alt="${video.title}" />
      <p>${video.title}</p>
    `;
    div.onclick = () => {
      const playerContainer = document.getElementById('player');
      playerContainer.innerHTML = `
        <iframe
          src="https://www.youtube.com/embed/${video.videoId}"
          allow="autoplay; encrypted-media"
          allowfullscreen
        ></iframe>
      `;
      window.scrollTo({ top: playerContainer.offsetTop, behavior: 'smooth' });

      // Guardar de nuevo para subirlo arriba en el historial
      saveVideoToHistory(video);
    };
    historyContainer.appendChild(div);
  });
}

// Buscar videos o canales
async function searchYouTube(query = null, type = null) {
  const searchInput = document.getElementById('searchInput');
  const searchType = document.getElementById('searchType');
  const resultsContainer = document.getElementById('results');
  const playerContainer = document.getElementById('player');

  const q = query ?? searchInput.value.trim();
  const t = type ?? searchType.value;

  lastSearch = { query: q, type: t };

  resultsContainer.innerHTML = '<p>Cargando...</p>';
  playerContainer.innerHTML = '';

  if (!q) {
    resultsContainer.innerHTML = '<p>Por favor ingresa un término de búsqueda.</p>';
    return;
  }

  const backBtn = document.getElementById('back-button');
  if (backBtn) backBtn.remove();

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=${t}&order=date&maxResults=10&key=${apiKey}`
    );
    const data = await res.json();

    resultsContainer.innerHTML = '';

    if (!data.items || data.items.length === 0) {
      resultsContainer.innerHTML = '<p>No se encontraron resultados.</p>';
      return;
    }

    if (t === 'channel') {
      data.items.forEach((item) => {
        const channelId = item.id.channelId;
        const title = item.snippet.title;
        const thumbnail = item.snippet.thumbnails.medium.url;

        const channelElement = document.createElement('div');
        channelElement.className = 'result-item';
        channelElement.innerHTML = `
          <img src="${thumbnail}" alt="${title}" />
          <p>${title}</p>
        `;
        channelElement.onclick = () => loadChannelVideos(channelId);
        resultsContainer.appendChild(channelElement);
      });
    } else if (t === 'video') {
      for (const item of data.items) {
        const videoId = item.id.videoId;
        const snippet = item.snippet;
        const embeddable = await isEmbeddableVideo(videoId);
        if (!embeddable) continue;

        const videoElement = document.createElement('div');
        videoElement.className = 'result-item';
        videoElement.innerHTML = `
          <img src="${snippet.thumbnails.medium.url}" alt="${snippet.title}" style="width:160px; height:90px; object-fit:cover; border-radius:6px;" />
          <p>${snippet.title}</p>
        `;
        videoElement.onclick = () => {
          playerContainer.innerHTML = `
            <iframe
              src="https://www.youtube.com/embed/${videoId}"
              allow="autoplay; encrypted-media"
              allowfullscreen
            ></iframe>
          `;
          window.scrollTo({ top: playerContainer.offsetTop, behavior: 'smooth' });

          saveVideoToHistory({
            videoId,
            title: snippet.title,
            thumbnail: snippet.thumbnails.medium.url,
          });

          createBackButton();
        };
        resultsContainer.appendChild(videoElement);
      }
    }
  } catch (error) {
    resultsContainer.innerHTML = `<p>Error en la búsqueda: ${error.message}</p>`;
  }
}

// Cargar videos de un canal
async function loadChannelVideos(channelId) {
  const resultsContainer = document.getElementById('results');
  const playerContainer = document.getElementById('player');

  resultsContainer.innerHTML = '<p>Cargando videos del canal...</p>';
  playerContainer.innerHTML = '';

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=10&type=video&key=${apiKey}`
    );
    const data = await res.json();

    resultsContainer.innerHTML = '';

    if (!data.items || data.items.length === 0) {
      resultsContainer.innerHTML = '<p>No se encontraron videos en el canal.</p>';
      return;
    }

    for (const item of data.items) {
      const videoId = item.id.videoId;
      const snippet = item.snippet;
      const embeddable = await isEmbeddableVideo(videoId);
      if (!embeddable) continue;

      const videoElement = document.createElement('div');
      videoElement.className = 'result-item';
      videoElement.innerHTML = `
        <img src="${snippet.thumbnails.medium.url}" alt="${snippet.title}" style="width:160px; height:90px; object-fit:cover; border-radius:6px;" />
        <p>${snippet.title}</p>
      `;
      videoElement.onclick = () => {
        playerContainer.innerHTML = `
          <iframe
            src="https://www.youtube.com/embed/${videoId}"
            allow="autoplay; encrypted-media"
            allowfullscreen
          ></iframe>
        `;
        window.scrollTo({ top: playerContainer.offsetTop, behavior: 'smooth' });

        saveVideoToHistory({
          videoId,
          title: snippet.title,
          thumbnail: snippet.thumbnails.medium.url,
        });

        createBackButton();
      };
      resultsContainer.appendChild(videoElement);
    }
  } catch (error) {
    resultsContainer.innerHTML = `<p>Error cargando videos del canal: ${error.message}</p>`;
  }
}

// Mostrar u ocultar panel historial
function toggleHistory() {
  const historySection = document.getElementById('history');
  historySection.classList.toggle('hidden');
}

// Inicialización al cargar página
window.onload = () => {
  const searchInput = document.getElementById('searchInput');
  const passwordInput = document.getElementById('password');
  const historyToggleBtn = document.getElementById('history-toggle');

  // Enter en input de búsqueda
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchYouTube();
    }
  });

  // Enter en input de contraseña (login)
  passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      checkPassword();
    }
  });

  historyToggleBtn.addEventListener('click', toggleHistory);

  renderHistory();
};
