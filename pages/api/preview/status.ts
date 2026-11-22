import { NextApiHandler } from 'next'

const previewStatus: NextApiHandler = (request, response) => {
  response.setHeader(
    'Cache-Control',
    'private, no-cache, no-store, max-age=0, must-revalidate'
  )
  response.json({
    preview: Boolean(request.preview),
  })
}

export default previewStatus