// Service Worker pour Minuteur Cuisine Pro
// Version 4.0

const CACHE_NAME = 'minuteur-cuisine-v4';
const STATIC_CACHE = 'static-v4';
const DYNAMIC_CACHE = 'dynamic-v4';

// Fichiers � mettre en cache imm�diatement
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-72.png',
  './icon-96.png',
  './icon-128.png',
  './icon-144.png',
  './icon-152.png',
  './icon-192.png',
  './icon-384.png',
  './icon-512.png'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('SW: Installation en cours...');
  
  event.waitUntil(
    Promise.all([
      // Cache statique
      caches.open(STATIC_CACHE).then(cache => {
        console.log('SW: Mise en cache des fichiers statiques');
        return cache.addAll(STATIC_FILES);
      }),
      
      // Cache principal
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(STATIC_FILES);
      })
    ]).then(() => {
      console.log('SW: Installation termin�e');
      // Activer imm�diatement le nouveau SW
      return self.skipWaiting();
    })
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  console.log('SW: Activation en cours...');
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE) {
              console.log('SW: Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Prendre le contr�le de tous les clients
      self.clients.claim()
    ]).then(() => {
      console.log('SW: Activation termin�e');
    })
  );
});

// Interception des requ�tes (strat�gie Cache First)
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Ignorer les requ�tes non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(request).then(response => {
      // Si trouv� en cache, le retourner
      if (response) {
        console.log('SW: Servi depuis le cache:', request.url);
        return response;
      }
      
      // Sinon, faire la requ�te r�seau
      return fetch(request).then(fetchResponse => {
        // V�rifier si la r�ponse est valide
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }
        
        // Cloner la r�ponse car elle ne peut �tre lue qu'une fois
        const responseToCache = fetchResponse.clone();
        
        // Mettre en cache dynamique pour les ressources importantes
        if (request.destination === 'document' || 
            request.destination === 'script' || 
            request.destination === 'style' ||
            request.url.includes('icon-')) {
          
          caches.open(DYNAMIC_CACHE).then(cache => {
            console.log('SW: Mise en cache dynamique:', request.url);
            cache.put(request, responseToCache);
          });
        }
        
        return fetchResponse;
      }).catch(() => {
        // En cas d'erreur r�seau, servir la page principale pour les documents
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
        
        // Pour les ic�nes, essayer de servir une ic�ne par d�faut
        if (request.url.includes('icon-')) {
          return caches.match('./icon-192.png');
        }
      });
    })
  );
});

// Synchronisation en arri�re-plan
self.addEventListener('sync', event => {
  console.log('SW: Synchronisation en arri�re-plan:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Synchroniser les donn�es en attente
      syncPendingData()
    );
  }
});

// Synchronisation p�riodique (si support�e)
self.addEventListener('periodicsync', event => {
  console.log('SW: Synchronisation p�riodique:', event.tag);
  
  if (event.tag === 'update-cache') {
    event.waitUntil(
      updateCache()
    );
  }
});

// Notifications Push
self.addEventListener('push', event => {
  console.log('SW: Notification push re�ue');
  
  const options = {
    body: event.data ? event.data.text() : 'Minuteur termin� !',
    icon: './icon-192.png',
    badge: './icon-72.png',
    vibrate: [300, 100, 300],
    data: {
      url: './'
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir l\'app',
        icon: './icon-72.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Minuteur Cuisine', options)
  );
});

// Clic sur notification
self.addEventListener('notificationclick', event => {
  console.log('SW: Clic sur notification');
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // Si une fen�tre est d�j� ouverte, la focus
        for (const client of clientList) {
          if (client.url.includes('minuteur') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Sinon, ouvrir une nouvelle fen�tre
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
    );
  }
});

// Fonctions utilitaires

async function syncPendingData() {
  try {
    // Synchroniser les r�glages utilisateur stock�s localement
    console.log('SW: Synchronisation des donn�es en attente');
    
    // Ici, vous pourriez synchroniser avec un serveur
    // Pour ce minuteur, on simule juste une synchronisation r�ussie
    return Promise.resolve();
  } catch (error) {
    console.error('SW: Erreur de synchronisation:', error);
    throw error;
  }
}

async function updateCache() {
  try {
    console.log('SW: Mise � jour du cache en arri�re-plan');
    
    const cache = await caches.open(CACHE_NAME);
    
    // Mettre � jour les ressources critiques
    const criticalResources = [
      './',
      './index.html',
      './manifest.json'
    ];
    
    for (const resource of criticalResources) {
      try {
        const response = await fetch(resource);
        if (response.status === 200) {
          await cache.put(resource, response);
          console.log('SW: Ressource mise � jour:', resource);
        }
      } catch (error) {
        console.warn('SW: Impossible de mettre � jour:', resource, error);
      }
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('SW: Erreur de mise � jour du cache:', error);
    throw error;
  }
}

// Message du client principal
self.addEventListener('message', event => {
  console.log('SW: Message re�u:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '4.0' });
  }
});

console.log('SW: Service Worker initialis� - Version 4.0');