import { NextApiHandler } from 'next'

const health: NextApiHandler = (_request, response) => {
  response.setHeader(
    'Cache-Control',
    'private, no-cache, no-store, max-age=0, must-revalidate'
  )
  response.status(200).json({ ok: true })
}

export default health
