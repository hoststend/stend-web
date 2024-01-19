// Quand la page a fini de charger
window.addEventListener('load', () => {
	// Si les services worker sont compatible
	if('serviceWorker' in navigator){
		// Importer le service worker
		navigator.serviceWorker.register('sw.js').then(() => {
			// Quand le service worker nous envoie au message
			navigator.serviceWorker.addEventListener('message', async event => {
				// Si le message est que le cache a été mis à jour
				if(event.data === 'updateCacheDone'){
					// Dire que la mise à jour s'est effectué
					console.log('Mise à jour du cache effectué !')

					// Mettre la version dans le localStorage
					localStorage.setItem('version', (await fetch('version').then(res => res.text()).catch(() => { return '0.0.0' })))
				}
			})

			// Mettre le site dans le cache
			updateCache()

		// Si ça n'a pas marché, afficher l'erreur dans la console
		}).catch(err => {
			console.log(err)
		})
	}
})

// Vérifier le cache du site
async function updateCache(){
	// Récupérer la version du site
	var version = await fetch('version').then(res => res.text()).catch(() => { return '0.0.0' })
	if(version == '0.0.0') return console.warn('Impossible de récupérer la version du site, sûrement en mode hors connexion.')

	// Vérifier si la version du site est différente de la version du cache
	if(version != localStorage.getItem('version')){
		// Log
		console.log('Mise à jour du cache...')

		// Envoyer au message au service worker pour lui dire de mettre à jour le cache
		navigator.serviceWorker.ready.then(registration => {
			registration.active.postMessage("updateCache")
		})
	}

	// Log
	console.log('Version du site : ' + version)
}