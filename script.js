const apiKey = 'AIzaSyD2ORUEbrRFVRz1HwJ1MCiTC1Rz_flNE4k'; // reemplaza por tu clave

window.onload = async () => {
  await searchYouTube('lofi hip hop', 'video');
};

async function searchYouTube(query = null, type = null) {
  const searchInput = document.getElementById('searchInput');
  const searchType = document.getElementById('searchType');

  const q = query ?? searchInput.value.trim();
  const t = type ?? searchType.value;

  const resultsContainer = document.getElementById('results');
  const playerContainer = document.getElementById('player');

  resultsContainer.innerHTML = '<p>Cargando...</p>';
  playerContainer.innerHTML = '';

  if (!q) {
    resultsContainer.innerHTML = '<p>Por favor ingresa un término de búsqueda.</p>';
    return;
  }

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
          <img src="${thumbnail}" alt="Canal: ${title}" />
          <h4>${title}</h4>
        `;

        channelElement.onclick = () => {
          loadChannelVideos(channelId);
        };

        resultsContainer.appendChild(channelElement);
      });
    } else {
      for (const item of data.items) {
        const videoId = item.id.videoId;
        if (!videoId) continue;

        const detailRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${apiKey}`
        );
        const detailData = await detailRes.json();
        const isEmbeddable = detailData.items[0]?.status?.embeddable;

        if (!isEmbeddable) continue;

        const snippet = item.snippet;
        const videoElement = document.createElement('div');
        videoElement.className = 'result-item';
        videoElement.innerHTML = `
          <img src="${snippet.thumbnails.medium.url}" alt="${snippet.title}" />
          <h4>${snippet.title}</h4>
          <p class="video-date">📅 ${new Date(snippet.publishedAt).toLocaleDateString()}</p>
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
        };

        resultsContainer.appendChild(videoElement);
      }

      if (resultsContainer.innerHTML === '') {
        resultsContainer.innerHTML = '<p>No se encontraron videos reproducibles.</p>';
      }
    }
  } catch (error) {
    resultsContainer.innerHTML = `<p>Error al buscar: ${error.message}</p>`;
  }
}

async function loadChannelVideos(channelId) {
  const resultsContainer = document.getElementById('results');
  const playerContainer = document.getElementById('player');

  resultsContainer.innerHTML = '<p>Cargando videos del canal...</p>';
  playerContainer.innerHTML = '';

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=10&key=${apiKey}`
    );
    const data = await res.json();

    resultsContainer.innerHTML = '';

    if (!data.items || data.items.length === 0) {
      resultsContainer.innerHTML = '<p>Este canal no tiene videos disponibles.</p>';
      return;
    }

    for (const item of data.items) {
      const videoId = item.id.videoId;
      if (!videoId) continue;

      const detailRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${apiKey}`
      );
      const detailData = await detailRes.json();
      const isEmbeddable = detailData.items[0]?.status?.embeddable;

      if (!isEmbeddable) continue;

      const snippet = item.snippet;
      const videoElement = document.createElement('div');
      videoElement.className = 'result-item';
      videoElement.innerHTML = `
        <img src="${snippet.thumbnails.medium.url}" alt="${snippet.title}" />
        <h4>${snippet.title}</h4>
        <p class="video-date">📅 ${new Date(snippet.publishedAt).toLocaleDateString()}</p>
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
      };

      resultsContainer.appendChild(videoElement);
    }

    if (resultsContainer.innerHTML === '') {
      resultsContainer.innerHTML = '<p>No hay videos embebibles en este canal.</p>';
    }
  } catch (error) {
    resultsContainer.innerHTML = `<p>Error al cargar videos del canal: ${error.message}</p>`;
  }
}