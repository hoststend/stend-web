// Quelques variables
var apiBaseUrl = document.head.getAttribute('apibaseurl')
var shareKey = location.search.replace('?','')
var allFiles = []

// Convertir une taille en bytes en une taille lisible
function formatBytes(bytes, decimals = 2){
	if(!bytes) return '0 B'
	const k = 1000
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Convertir une durée en secondes en une durée lisible
function formatDuration(seconds){
	if(!seconds) return '0s'
	var result = ''
	var s = Math.floor(seconds % 60)
	var m = Math.floor(seconds / 60) % 60
	var h = Math.floor(seconds / 3600) % 24
	var d = Math.floor(seconds / 86400)
	if(d) result += `${d}j `
	if(h) result += `${h}h `
	if(m) result += `${m}m `
	if(s) result += `${s}s `
	return result.trim()
}

// Fonction pour échapper les caractères spéciaux
function escapeHtml(text){
	if(!text) return text
	if(typeof text != 'string') return text
	return text?.replace(/&/g, '&amp;')?.replace(/</g, '&lt;')?.replace(/>/g, '&gt;')?.replace(/"/g, '&quot;')?.replace(/'/g, '&#039;')
}

// Ajouter un fichier sur la page
function addFile(fileInfo){
	document.getElementById('files').innerHTML += `<div class="mt-4 border-2 rounded-lg border-gris-200 max-[800px]:min-h-[99%] sm:h-3/4 flex justify-between px-2 xs:px-4 sm:px-6 md:px-8 py-5">
	<div class="text-left">
		<p class="text-base-200 dark:text-gris-100 text-sm sm:text-base font-semibold leading-snug truncateLine">${escapeHtml(fileInfo.fileName)}</p>
		<p class="text-gris-400 text-sm sm:text-base dark:text-gris-300 truncateLine">${escapeHtml(formatBytes(fileInfo.fileSize))}</p>
	</div>
	<svg onclick="downloadFile('${allFiles.indexOf(fileInfo)}')" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 64 64" fill="none" tabindex="0">
		<g clip-path="url(#clip0_26_322)"><path d="M36 4C36 1.7875 34.2125 0 32 0C29.7875 0 28 1.7875 28 4V34.3375L18.825 25.1625C17.2625 23.6 14.725 23.6 13.1625 25.1625C11.6 26.725 11.6 29.2625 13.1625 30.825L29.1625 46.825C30.725 48.3875 33.2625 48.3875 34.825 46.825L50.825 30.825C52.3875 29.2625 52.3875 26.725 50.825 25.1625C49.2625 23.6 46.725 23.6 45.1625 25.1625L36 34.3375V4ZM8 44C3.5875 44 0 47.5875 0 52V56C0 60.4125 3.5875 64 8 64H56C60.4125 64 64 60.4125 64 56V52C64 47.5875 60.4125 44 56 44H43.3125L37.65 49.6625C34.525 52.7875 29.4625 52.7875 26.3375 49.6625L20.6875 44H8ZM54 51C54.7957 51 55.5587 51.3161 56.1213 51.8787C56.6839 52.4413 57 53.2043 57 54C57 54.7957 56.6839 55.5587 56.1213 56.1213C55.5587 56.6839 54.7957 57 54 57C53.2043 57 52.4413 56.6839 51.8787 56.1213C51.3161 55.5587 51 54.7957 51 54C51 53.2043 51.3161 52.4413 51.8787 51.8787C52.4413 51.3161 53.2043 51 54 51Z" fill="#1982C4"/></g>
		<defs><clipPath><rect width="64" height="64" fill="white"/></clipPath></defs>
	</svg>
</div>`
}

// Télécharger un fichier
function downloadFile(pos){
	var file = allFiles[pos]
	location.href = apiBaseUrl + file.downloadLink
}

// Télécharger tous les fichiers
async function downloadAll(el){
	// Désactiver le bouton pour éviter qu'on puisse spam
	el.setAttribute('disabled', true)

	// Si on a accès à l'API File System (Chromium)
	if(window.showDirectoryPicker){
		// Importer Material Toast
		var script = document.createElement('script')
		script.setAttribute('fetchpriority', 'high')
		script.setAttribute('src', 'mdtoast.js')
		document.head.appendChild(script)

		// Attendre que le script soit chargé
		await new Promise(resolve => script.onload = resolve)

		// Créer un répertoire
		var dirHandle = await showDirectoryPicker({ mode: 'readwrite' }).catch(err => {
			mdtoast("Vous devez autoriser l'accès à un dossier pour télécharger tous les fichiers.")
			window.showDirectoryPicker = null
			return null
		})

		// Télécharger chaque fichier
		if(dirHandle) for(var i = 0; i < allFiles.length; i++){
			var file = allFiles[i]
			var fileHandle = await dirHandle.getFileHandle(file.fileName, { create: true })
			var writable = await fileHandle.createWritable()
			if(i == 0) mdtoast(`Début du téléchargement...`)
			await fetch(apiBaseUrl + file.downloadLink).then(res => res.body.pipeTo(writable))
			if(i == allFiles.length - 1) try { mdtoast("Tous les fichiers ont été téléchargés.") } catch(err) {
				setTimeout(() => mdtoast("Tous les fichiers ont été téléchargés."), 1000) // parfois quand on utilise trop la fonction en un court temps ça provoque une erreur
			}
			else if(allFiles.length > 1) mdtoast(`${i + 1} fichiers téléchargés sur ${allFiles.length}.`)
		}
	}

	// Sinon, ouvrir chaque fichier dans un nouvel onglet
	else allFiles.forEach(file => {
		window.open(apiBaseUrl + file.downloadLink, '_blank')
	})

	// Réactiver le bouton
	setTimeout(() => el.removeAttribute('disabled'), 500)
}

// Quand la page est chargée
window.onload = async function(){
	// Si la clé de partage n'est pas définie
	if(!shareKey) location.href = '/'

	// Récupérer les informations du fichier
	var file = await fetch(`${apiBaseUrl}/files/info?sharekey=${shareKey}`).then(res => res.json()).catch(err => { return '' })
	if(!file){
		alert("Impossible de récupérer les informations du fichier. Le serveur externe est peut-être indisponible ?")
		return location.href = '/'
	}
	if(file.statusCode || file.error || file.message) return location.href = 'expiredFile.html'

	// Si c'est un fichier et non un groupe
	if(!file.isGroup){
		var expireSec = (file.expireDate - Date.now()) / 1000
		document.getElementById('download_title').innerText = 'Télécharger le fichier'
		document.getElementById('download_subtitle').innerText = `Ce fichier a été partagé avec Stend. Il expire ${expireSec < 1 ? 'bientôt' : 'dans ' + formatDuration(expireSec)}.`
		allFiles.push(file)
		addFile(file)
	}

	// Enlever l'animation de chargement
	// Note: on le fait maintenant, avant de récupérer les autres fichiers pour que ça soit progressif : on stagne pas sur un chargement si on a bcp de fichiers à charger
	document.getElementById('loading').remove()
	document.getElementById('container').classList.remove('hidden')

	// Si on a plusieurs fichiers
	if(file.isGroup){
		// Récupérer les informations de chaque fichier
		for(var i = 0; i < file.groups.length; i++){
			var f = await fetch(`${apiBaseUrl}/files/info?sharekey=${file.groups[i]}`).then(res => res.json()).catch(err => { return '' })
			if(!f){
				alert("Impossible de récupérer les informations d'un fichier. Le serveur externe est peut-être indisponible ?")
				location.href = '/'
				return;
			}
			if(!f.statusCode && !f.error && !f.message) allFiles.push(f) && addFile(f)
		}

		// Si tous les fichiers sont supprimés/expirés
		if(!document.getElementById('files').innerHTML) return location.href = 'expiredFile.html'
	}

	// Afficher le bouton "Tout télécharger"
	document.getElementById('download_button').classList.remove('hidden')
}