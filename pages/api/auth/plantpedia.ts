import type { NextApiHandler } from 'next'

// Rate limiting simple (mejorar con Redis en producción)
const loginAttempts = new Map<string, { count: number; timestamp: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

const credentialsAuth: NextApiHandler = (request, response) => {
	// GET any not OK
	if (request.method !== 'POST') {
		response.status(405).end()
		return
	}
	
	// Rate limiting por IP
	const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown'
	const clientIp = Array.isArray(ip) ? ip[0] : ip
	const now = Date.now()
	const attempts = loginAttempts.get(clientIp)
	
	if (attempts) {
		if (now - attempts.timestamp < WINDOW_MS) {
			if (attempts.count >= MAX_ATTEMPTS) {
				return response.status(429).json({ error: 'Too many attempts. Try again later.' })
			}
			attempts.count++
		} else {
			// Reset después de la ventana de tiempo
			loginAttempts.set(clientIp, { count: 1, timestamp: now })
		}
	} else {
		loginAttempts.set(clientIp, { count: 1, timestamp: now })
	}
	
	// POST - ok
	// validate credentials
	if (request.body.password === process.env.PLANTPEDIA_PASSWORD) {
		// Limpiar intentos exitosos
		loginAttempts.delete(clientIp)
		
		const plantpediaUser = {
			name: 'Plantpedia user',
			email: 'user@plantpedia.com',
			image: '',
		}
		return response
			.status(200)
			.json(plantpediaUser)
	}
	
	// Login fallido - no revelar información específica
	response.status(401).json({ error: 'Invalid credentials' })
}

export default credentialsAuth;