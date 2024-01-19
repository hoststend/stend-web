// Fonction pour mettre à jour le cache
async function updateCache(){
	// Supprimer puis ouvrir le cache
	await caches.delete('stend-cache')
	var cache = await caches.open('stend-cache')

	// Tout les fichiers à mettre dans le cache
	var files = [
		'd.html',
		'd',
		'expiredFile.html',
		'expiredFile',
		'favicon.png',
		'icon_maskable.png',
		'js/importSW.js',
		'/',
		'manifest.json',
		'js/script.js',
		'js/scriptDownloadPage.js',
		'js/mdtoast.js',
		'sw.js',
		'js/jszip.min.js',
		'section/optionsBeforeSend.html',
		'section/optionsBeforeSend',
		'section/sending.html',
		'section/sending',
		'section/sent.html',
		'section/sent',
		'fonts/inter-v12-latin-500.woff2',
		'fonts/inter-v12-latin-600.woff2',
		'fonts/inter-v12-latin-700.woff2',
		'fonts/inter-v12-latin-regular.woff2',
		'fonts/poppins-v20-latin-700.woff2',
		'fonts/poppins-v20-latin-regular.woff2',
		// Surtout pas importer 'version'
	]

	// Mettre tout les fichiers dans le cache
	for(var i = 0; i < files.length; i++){
		try {
			await cache.add(files[i])
			console.log('[SW.js] ' + files[i] + ' ajouté au cache')
		} catch (err) {
			console.error('[SW.js] ' + files[i] + ' non ajouté au cache: ' + err)
		}
	}

	// Retourner true
	return true;
}

// Quand le service worker est "installé"
self.addEventListener('install', () => {
	// Afficher que le service worker est installé
	console.log('[SW.js] "install" reçu');
});
self.addEventListener("activate", () => {
	// Afficher que le service worker est activé
	console.log('[SW.js] "activate" reçu');
});

// Lors d'une requête
self.addEventListener("fetch", event => {
	// Retourner une requête par réseau, et si ça marche pas, essayer via le cache
	event.respondWith(
		caches.match(event.request).then((response) => {
			return response || fetch(event.request)
		})
	);
});

// Si on reçois l'instruction de mettre à jour le cache
self.addEventListener('message', async event => {
	console.log('[SW.js] "message" reçu : ' + event.data);

	if(event.data === 'updateCache'){
		// Mettre à jour le cache
		await updateCache()

		// Envoyer à la page que c'est bon
		console.log('[SW.js] Cache mis à jour');
		event.source.postMessage("updateCacheDone");
	}
});