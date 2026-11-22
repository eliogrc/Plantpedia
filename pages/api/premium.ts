import { NextApiHandler } from 'next'
import random from 'lodash/random'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

const premium: NextApiHandler = async (request, response) => {
  const session = await getServerSession(request, response, authOptions)
  if (!session) {
    response.status(401).end()
    return
  }

  response.setHeader(
    'Cache-Control',
    'private, no-cache, no-store, max-age=0, must-revalidate'
  )
  response.status(200).json({
    data: `https://randomfox.ca/images/${random(1, 122)}.jpg`,
    time: new Date().getTime(),
  })
}

export default premium
