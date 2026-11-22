import crypto from 'crypto'
import { NextApiHandler } from 'next'
import { getPlant } from '@api'

const SLUG_REGEX = /^[a-z0-9-]+$/i

function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB) && a.length === b.length
}

const enablePreview: NextApiHandler = async (request, response) => {
  const slug = request.query.slug
  const secret = request.query.secret
  const expectedSecret = process.env.PREVIEW_SECRET

  if (
    typeof expectedSecret !== 'string' ||
    expectedSecret.length === 0 ||
    typeof secret !== 'string' ||
    secret.length === 0 ||
    !timingSafeCompare(secret, expectedSecret) ||
    typeof slug !== 'string' ||
    slug.length === 0 ||
    slug.length > 120 ||
    !SLUG_REGEX.test(slug)
  ) {
    return response.status(401).json({ message: 'Invalid token' })
  }

  try {
    // Fetch the headless CMS to check if the provided 'slug' exists
    const plant = await getPlant(slug, true)

    // Enable Preview Mode by setting the cookies
    response.setPreviewData({})

    // Redirect to the path from the fetched plant
    response.redirect(`/entry/${plant.slug}`)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(e)
    }
    return response.status(401).json({ message: 'Invalid slug' })
  }
}

export default enablePreview
