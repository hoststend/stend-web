// Quelques variables
var authPassword = localStorage.getItem("authPassword")
var apiBaseUrl = document.head.getAttribute('apibaseurl')
var authRequired
var serverInstance
var disableAddingFileInput = false
var sections = {}
var isSending = false
var filesToSend
var filesSent = []

// Remplacer les explications de la dropzone par une erreur
function dropzoneError(text){
	document.getElementById('dropzone_explainText').innerText = text || "Erreur, veuillez réessayer"
	document.getElementById('dropzone_explainText').classList.remove('text-base-200', 'dark:text-gris-100', 'font-bold')
	document.getElementById('dropzone_explainText').classList.add('text-red-500', 'dark:text-red-400', 'font-semibold','showingerror')
}
function dropzoneRemoveError(){ // supprimer l'erreur
	document.getElementById('dropzone_explainText').innerHTML = `Glisser-déposer des fichiers ici<br><span class="text-gray-600 dark:text-gris-300 font-normal">ou cliquer pour les ajouter</span>`
	document.getElementById('dropzone_explainText').classList.remove('text-red-500', 'dark:text-red-400', 'font-semibold','showingerror')
	document.getElementById('dropzone_explainText').classList.add('text-base-200', 'dark:text-gris-100', 'font-bold')
}

// Enlever l'animation de chargement
function removeLoading(){
	document.getElementById('loading').remove()
	document.getElementById('container').classList.add('grid')
	document.getElementById('container').classList.remove('hidden')
}

// Fonction pour échapper les caractères spéciaux
function escapeHtml(text){
	if(!text) return text
	if(typeof text != 'string') return text
	return text?.replace(/&/g, '&amp;')?.replace(/</g, '&lt;')?.replace(/>/g, '&gt;')?.replace(/"/g, '&quot;')?.replace(/'/g, '&#039;')
}

// Ajouter un fichier à l'historique
function addFileToHistory(file){
	console.log('adding to historic: ', file)
	// Obtenir l'historique
	let history
	try {
		history = JSON.parse(localStorage.getItem("history") || '[]')
	} catch(e){
		history = []
		localStorage.setItem("history", JSON.stringify(history))
	}
	if(!Array.isArray(history)){
		history = []
		localStorage.setItem("history", JSON.stringify(history))
	}

	// Supprimer les entrées expirées et les 5 plus récentes entrées
	history = history.filter(entry => entry.expireDate > Date.now())
	history = history.slice(-4)

	// Ajouter le fichier à l'historique
	history.push({
		name: file.name,
		shareKey: file.shareKey,
		expireDate: file.expireDate
	})
	localStorage.setItem("history", JSON.stringify(history))
}

// Obtenir l'historique
function getHistory(){
	// Obtenir l'historique
	let history
	try {
		history = JSON.parse(localStorage.getItem("history") || '[]')
	} catch(e){
		history = []
		localStorage.setItem("history", JSON.stringify(history))
	}
	if(!Array.isArray(history)){
		history = []
		localStorage.setItem("history", JSON.stringify(history))
	}

	// Supprimer les entrées expirées
	history = history.filter(entry => entry.expireDate > Date.now())

	// Retourner les 4 dernières entrées
	return history.slice(-4).reverse()
}

// Vérifier si un mot de passe est valide
async function checkPassword(password){
	let res = await fetch(`${apiBaseUrl}/checkPassword`, {
		method: 'POST',
		headers: { 'Authorization': password }
	}).then(res => res.json())

	return res.success
}

// Convertir une taille en bytes en une taille lisible
function formatBytes(bytes, decimals = 2){
	if(!bytes) return '0 B'
	const k = 1000
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Ajouter un mot de passe
async function addPassword(){
	// Demander le mot de passe
	let password = prompt("Vous devez utiliser un mot de passe spécifique pour utiliser ce serveur.")
	if(!password) return;

	// Vérifier si le mot de passe est valide
	let checked = await checkPassword(password)
	if(!checked) return alert("Le mot de passe que vous avez entré n'est pas valide.")

	// Enregistrer le mot de passe
	localStorage.setItem("authPassword", password)
	location.reload()
}

// Supprimer le mot de passe
function removePassword(){
	localStorage.removeItem("authPassword")
	location.reload()
}

// Envoyer UN fichier
async function sendFile(file, isMultipleFiles=false, shareKey, expireTime){
	// Créer le transfert
	let createTransfert = await fetch(`${apiBaseUrl}/files/create`, {
		method: 'POST',
		headers: { 'Authorization': authPassword || '' },
		body: JSON.stringify({
			filename: file.name,
			filesize: file.size,
			sharekey: isMultipleFiles ? '' : shareKey,
			expiretime: expireTime,
		})
	}).then(res => res.json())
	console.log(createTransfert)

	// Si le transfert n'a pas pu être créé
	if(createTransfert.error || createTransfert.statusCode) return alert("Une erreur est survenue lors de la création du transfert : " + createTransfert.message || createTransfert.error || createTransfert.statusCode || createTransfert)
	
	// Envoyer tous les chunks qu'on doit envoyer, un par un
	return await new Promise(async (resolve, reject) => {
		var alreadySentSize = 0
		for(let i = 0; i < createTransfert.chunks.length; i++){
			// Obtenir les infos sur le chunk qu'on va envoyer
			var chunkInfo = createTransfert.chunks[i]

			// Créer un FormData
			let formData = new FormData()

			// Si on a qu'un seul chunk à envoyer, on ajoute le fichier en entier
			if(createTransfert.chunks.length == 1) formData.append('file', file)

			// Sinon, on obtient un chunk et on l'ajoute
			else {
				// On obtient le chunk
				var start = chunkInfo.pos * createTransfert.chunkEvery
				var end = Math.min(start + createTransfert.chunkEvery, file.size)
				let chunkFile = file.slice(start, end)

				// On ajoute le fichier au FormData
				formData.append('file', chunkFile)

				// Afficher la progression sur ce chunk
				let percentCompleted = Math.round((alreadySentSize) * 100 / file.size)
				console.log(percentCompleted)
				document.getElementById('progress_bar').style.width = percentCompleted + '%'
				document.getElementById('progress_text').innerText = percentCompleted + `% | ${i+1}/${createTransfert.chunks.length} chunk${createTransfert.chunks.length > 1 ? 's' : ''}`
			}

			// On envoie le chunk avec Axios (pour suivre la progression)
			var sendChunk = await axios.put(`${apiBaseUrl}${chunkInfo.uploadPath}`, formData, {
				onUploadProgress: progressEvent => {
					console.log(progressEvent)
					let percentCompleted = Math.round((alreadySentSize + progressEvent.loaded) * 100 / file.size)
					console.log(percentCompleted)
					document.getElementById('progress_bar').style.width = percentCompleted + '%'
					document.getElementById('progress_text').innerText = percentCompleted + `% | ${i+1}/${createTransfert.chunks.length} chunk${createTransfert.chunks.length > 1 ? 's' : ''}`
				}
			}).then(res => res.data).catch(err => { return { error:true, message: `${err.error || err.message || err}. Note : l'erreur "failed to fetch" peut apparaître si vous essayez d'envoyer un dossier.` } })
			alreadySentSize += chunkInfo.size

			// Tenter de convertir la réponse en JSON
			try { sendChunk = JSON.parse(sendChunk) } catch(e){}

			// Si on a une erreur
			if(sendChunk.error || sendChunk.statusCode) return alert("Une erreur est survenue lors de l'envoi d'un chunk : " + sendChunk.message || sendChunk.error || sendChunk.statusCode || sendChunk)

			// Au contraire, si le fichier est envoyé
			else if(sendChunk){
				addFileToHistory({
					name: file.name,
					shareKey: sendChunk.shareKey,
					expireDate: sendChunk.expireDate
				})
				resolve(sendChunk)
			}
		}
	})
}

// Envoyer tous les fichiers
async function sendAll(el){
	// Désactiver le bouton sur lequel on a cliqué
	if(el) el.setAttribute('disabled', true)
	isSending = true

	// Obtenir les options du transfert
	let shareKey = document.getElementById('options_shareKey').value
	let expireTime = document.getElementById('options_expireTime').value * 60

	// Afficher la section de chargement
	while(!sections['sending']) await new Promise(resolve => setTimeout(resolve, 300)) // attendre que la section soit importée
	document.getElementById('dropzone').outerHTML = sections['sending']

	// Envoyer chaque fichier un par un
	var sendedFiles = []
	for(let i = 0; i < filesToSend.length; i++){
		// Afficher les infos sur le fichier qu'on va envoyer
		document.getElementById('fileInfo_title').innerText = filesToSend[i].name
		document.getElementById('fileInfo_subtitle').innerText = formatBytes(filesToSend[i].size) + (i != filesToSend.length - 1 ? ` | ${filesToSend.length - 1 - i} ${filesToSend.length -1 - i > 1 ? 'autres fichiers' : 'autre fichier'} en attente` : '')

		// Envoyer le fichier
		sendedFiles.push(await sendFile(filesToSend[i], filesToSend.length > 1, shareKey, expireTime))
		console.log(`Fichier ${i+1} envoyé`)
	}

	// Si on a plusieurs fichiers, on regroupe les transferts
	var finalShareKey
	if(filesToSend.length > 1){
		// On modifie la progression
		document.getElementById('progress_text').innerText = 'Finalisation...'

		// On regroupe les transferts
		let mergeTransferts = await fetch(`${apiBaseUrl}/files/merge`, {
			method: 'POST',
			headers: { 'Authorization': authPassword || '' },
			body: JSON.stringify({
				sharekey: shareKey,
				sharekeys: sendedFiles.map(file => file.shareKey).join(','),
			})
		}).then(res => res.json())

		// Si on a une erreur
		if(mergeTransferts.error || mergeTransferts.statusCode) return alert("Une erreur est survenue lors de la fusion des transferts : " + mergeTransferts.message || mergeTransferts.error || mergeTransferts.statusCode || mergeTransferts)

		// Si tout s'est bien passé
		else finalShareKey = mergeTransferts.shareKey
	}

	// Copier le lien
	try {
		navigator.clipboard.writeText(`${location.origin}/d.html?${finalShareKey || (sendedFiles.length < 2 ? sendedFiles?.[0]?.shareKey || shareKey : shareKey)}`).catch(err => {})
	} catch(e){}

	// Afficher la section indiquant que le transfert est terminé
	isSending = false
	while(!sections['sent']) await new Promise(resolve => setTimeout(resolve, 300)) // attendre que la section soit importée
	try {
		document.getElementById('secondZone_selfhostText').remove()
		document.getElementById('secondZone_encryptionWarnText').remove()
	} catch(e){}
	document.getElementById('secondZone_title').insertAdjacentHTML('beforebegin', `<img class="mx-auto mb-4 rounded-lg max-[800px]:hidden" src="https://chart.googleapis.com/chart?cht=qr&chs=192x192&chld=L|0&chl=${encodeURIComponent(location.origin)}/d.html?${encodeURIComponent(finalShareKey || (sendedFiles.length < 2 ? sendedFiles?.[0]?.shareKey || shareKey : shareKey))}" alt="QR Code">`)
	document.getElementById('dropzone').outerHTML = sections['sent']
	document.getElementById('share_url').value = `${location.origin}/d.html?${finalShareKey || (sendedFiles.length < 2 ? sendedFiles?.[0]?.shareKey || shareKey : shareKey)}`
}

// Quand la page est chargée
window.onload = async function(){
	// Obtenir le mot de passe d'authentification
	let authPassword = localStorage.getItem("authPassword")

	// On vérifie qu'il est nécessaire d'utiliser un mot de passe pour utiliser l'API (et on en profite pour obtenir des infos sur l'instance)
	serverInstance = await fetch(`${apiBaseUrl}/instance`).then(res => res.json()).catch(err => { return '' })
	if(serverInstance == ''){
		disableAddingFileInput = true
		document.getElementById('dropzone_svg').remove()
		document.getElementById('dropzone_explainText').innerHTML = `Impossible de se connecter au serveur.<br><a href="javascript:location.reload()" class="text-blue-500 dark:text-blue-400 font-semibold">Réessayer</a>`
		document.getElementById('dropzone_explainText').removeAttribute('id')
	}
	authRequired = serverInstance.requirePassword
console.log(serverInstance)

	// Afficher un avertissement si on a pas la même version
	if(serverInstance != '' && serverInstance.apiVersion != '1.1.0') alert(`Le serveur utilise une version différente de ce site. Certaines fonctionnalités peuvent ne pas fonctionner correctement.`)

	// Si on a besoin d'un mot de passe
	if(authRequired){
		// .. mais qu'on en a pas
		if(!authPassword){
			disableAddingFileInput = true
			document.getElementById('dropzone_svg').remove()
			document.getElementById('dropzone_explainText').innerHTML = `Le serveur que vous utilisez nécessite un mot de passe pour être utilisé.<br><a href="javascript:addPassword()" class="text-blue-500 dark:text-blue-400 font-semibold">Ajouter un mot de passe</a>`
			document.getElementById('dropzone_explainText').removeAttribute('id')
		}

		// Si on l'a on le vérifie
		else {
			var checked = await checkPassword(authPassword)
			if(!checked){
				localStorage.removeItem("authPassword")
				disableAddingFileInput = true
				document.getElementById('dropzone_svg').remove()
				document.getElementById('dropzone_explainText').innerHTML = `Le mot de passe que vous avez enregistré n'est pas valide.<br><a href="javascript:addPassword()" class="text-blue-500 dark:text-blue-400 font-semibold">Ajouter un mot de passe</a>`
				document.getElementById('dropzone_explainText').removeAttribute('id')
			}
		}
	}

	// Afficher la taille maximale des fichiers
	if(!disableAddingFileInput) document.getElementById('secondZone_title_size').innerText = formatBytes(serverInstance.fileMaxSize)

	// Afficher l'option pour se déconnecter
	if(authPassword) document.getElementById('removePasswordDiv').classList.remove('hidden')

	// On enlève l'animation de chargement
	if(disableAddingFileInput) return removeLoading()

	// Importer les sections
	fetch(`section/optionsBeforeSend.html`).then(res => res.text()).then(res => sections['optionsBeforeSend'] = res)
	fetch(`section/sending.html`).then(res => res.text()).then(res => sections['sending'] = res)
	fetch(`section/sent.html`).then(res => res.text()).then(res => sections['sent'] = res)

	// Ajouter l'input qui permet d'ajouter un fichier
	document.body.innerHTML = `<label for="fileInput" class="sr-only">File input</label><input type="file" class="h-full w-full absolute opacity-0" id="fileInput" multiple title="">` + document.body.innerHTML

	// Préparer quelques variables pour le drag and drop
	let dropzone = document.getElementById('dropzone')
	let fileInput = document.getElementById('fileInput')
	var authorizeClick = false

	// Si on a pas enlevé l'input de fichiers
	if(fileInput){
		// Pouvoir ajouter un fichier en cliquant sur la dropzone
		fileInput.addEventListener('click', e => {
			if(authorizeClick) return;
			e.preventDefault()
			e.stopPropagation()

			// Vérifier si le clic est dans la zone de la dropzone
			let dropzoneRect = dropzone.getBoundingClientRect()
			if(e.clientX >= dropzoneRect.left && e.clientX <= dropzoneRect.right && e.clientY >= dropzoneRect.top && e.clientY <= dropzoneRect.bottom){
				authorizeClick = true
				fileInput.click()
				authorizeClick = false
			}
		})

		// Quand on ajoute un fichier à envoyer
		fileInput.addEventListener('change', async () => {
			// Rendre l'array comme un vrai array
			filesToSend = Array.from(fileInput.files)

			// Si on a trop ou pas assez de fichiers, on prévient
			if(filesToSend.length < 1) return dropzoneError("Vous devez envoyer au moins un fichier (dossiers non autorisés)")
			if(filesToSend.length > 10) return dropzoneError("Vous ne pouvez pas envoyer plus de 10 fichiers à la fois")

			// Si on avait une erreur, on la supprime
			if(document.getElementById('dropzone_explainText').classList.contains('showingerror')) dropzoneRemoveError()

			// Afficher les options du transfert
			document.getElementById('fileInput').remove()
			while(!sections['optionsBeforeSend']) await new Promise(resolve => setTimeout(resolve, 300)) // attendre que la section soit importée
			document.getElementById('secondZone').classList.add('max-[800px]:hidden')
			document.getElementById('container').classList.remove('max-[800px]:grid-rows-minGridMainContainer')
			document.getElementById('dropzone').outerHTML = sections['optionsBeforeSend']
			if(serverInstance?.recommendedExpireTimes) document.getElementById('options_expireTime').innerHTML = serverInstance.recommendedExpireTimes.map(time => `<option value="${time.value}">${time.label}</option>`).join('')
			document.getElementById('fileInfo_title').innerText = filesToSend[0].name
			document.getElementById('fileInfo_subtitle').innerText = filesToSend.length > 1 ? `et ${filesToSend.length - 1} ${filesToSend.length - 1 > 1 ? 'autres fichiers' : 'autre fichier'} | ${formatBytes(filesToSend.reduce((acc, file) => acc + file.size, 0))}` : formatBytes(filesToSend[0].size)
		})

		// Animation au survol de la dropzone
		fileInput.addEventListener('dragover', e => { // Quand on survole la dropzone
			dropzone.classList.add('border-red-400'); dropzone.classList.remove('border-gris-200')
		})
		fileInput.addEventListener('dragleave', e => { // Quand on quitte la dropzone
			dropzone.classList.add('border-gris-200'); dropzone.classList.remove('border-red-400')
		})
		fileInput.addEventListener('drop', () => { // Simuler qu'on quitte la dropzone
			fileInput.dispatchEvent(new Event('dragleave'))
		})
	}

	// Enlever l'animation de chargement
	removeLoading()

	// Afficher l'historique des fichiers
	let history = getHistory()
	if(history.length > 0 && window.innerWidth >= 810){
		code = ''
		for(let i = 0; i < history.length; i++){
			var fileInfo = history[i]
			code += `<div id="secondZone_selfhostText" class="relative mt-4 border-2 rounded-lg border-gris-200 max-[800px]:min-h-[99%] sm:h-3/4 flex justify-between px-2 xs:px-4 sm:px-6 md:px-8 py-5">
			<div class="text-left">
				<p class="text-base-200 dark:text-gris-100 text-sm sm:text-base font-semibold leading-snug truncateLine">${escapeHtml(fileInfo.name)}</p>
				<a href="${location.origin}/d.html?${fileInfo.shareKey}" class="text-blue-500 dark:text-blue-400 text-xs sm:text-sm font-semibold leading-snug truncateLine">${location.origin.replace('http://','').replace('https://','')}/d.html?${fileInfo.shareKey}</a>
			</div>
		</div>`
		}
		document.getElementById('secondZone_subtitle').innerHTML = code
	}

	// Importer Axios
	var script = document.createElement('script')
	script.setAttribute('fetchpriority', 'low')
	script.setAttribute('src', 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js')
	script.setAttribute('defer', '')
	document.head.appendChild(script)

	// Empêcher de quitter la page si on a pas fini d'envoyer les fichiers
	window.onbeforeunload = function(e){
		if(isSending) return true
	}

	// Quand on appuie sur ctrl+enter ou shift+enter, on envoie les fichiers
	document.addEventListener('keydown', e => {
		if((e.ctrlKey || e.shiftKey) && e.key == 'Enter' && !isSending && document.getElementById('clickToSendAll')){
			e.preventDefault()
			sendAll(document.getElementById('clickToSendAll'))
		}
	})
}