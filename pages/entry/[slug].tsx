import { GetStaticProps, InferGetStaticPropsType, GetStaticPaths } from 'next'
import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { getPlant, getPlantList, getCategoryList } from '@api'

import { Layout } from '@components/Layout'
import { Typography } from '@ui/Typography'
import { Grid } from '@ui/Grid'

import { RichText } from '@components/RichText'
import { AuthorCard } from '@components/AuthorCard'
import { PlantEntryInline } from '@components/PlantCollection'
import { Image } from '@components/Image'
import { flatMap } from 'lodash'

type PlantEntryPageProps = {
  plant: Plant
  otherEntries: Plant[]
  categories: Category[]
}

const SLUG_REGEX = /^[a-z0-9-]+$/i

export const getStaticProps: GetStaticProps<PlantEntryPageProps> = async ({
  params,
  preview,
  locale,
}) => {
  const slug = params?.slug
  if (
    typeof slug !== 'string' ||
    slug.length === 0 ||
    slug.length > 120 ||
    !SLUG_REGEX.test(slug)
  ) {
    return {
      notFound: true,
    }
  }
  try {
    const [plant, i18nConf, otherEntries, categories] = await Promise.all([
      getPlant(slug, preview, locale),
      serverSideTranslations(locale!),
      getPlantList({ limit: 5 }),
      getCategoryList({ limit: 10 }),
    ])
    return {
      props: {
        plant,
        otherEntries,
        categories,
        ...i18nConf,
      },
      revalidate: 60 * 60, // once every hour
    }
  } catch (e) {
    return {
      notFound: true,
    }
  }
}

type PathType = {
  params: {
    slug: string
  },
  locale: string
}

export const getStaticPaths: GetStaticPaths = async ({ locales }) => {
  if (locales === undefined) {
    throw new Error('No locales found')
  }
  // Match home query.
  // @TODO how do we generate all of our pages if we don't know the number? 🤔
  const plantEntriesToGenerate = await getPlantList({ limit: 10 })

  const paths: PathType[] = flatMap(plantEntriesToGenerate.map(({ slug }) => ({
    params: {
      slug,
    }
  })),
  (path) => locales.map((loc) => ({
    locale: loc,
    ...path,
  }))
  )

  return {
    paths,
    // Block until the server gets its data. Like in Server side rendering
    fallback: 'blocking',
  }
}

export default function PlantEntryPage({
  plant,
  otherEntries,
  categories,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useTranslation(['page-plant-entry'])

  return (
    <Layout>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8} lg={9} component="article">
          <figure>
            <Image
              width={952}
              aspectRatio="4:3"
              layout="intrinsic"
              src={plant.image.url}
              alt={plant.image.title}
            />
          </figure>
          <div className="px-12 pt-8">
            <Typography variant="h2">{plant.plantName}</Typography>
          </div>
          <div className="p-10">
            <RichText richText={plant.description} />
          </div>
        </Grid>
        <Grid item xs={12} md={4} lg={3} component="aside">
          <section>
            <Typography variant="h5" component="h3" className="mb-4">
              {t('recentPosts')}
            </Typography>
            {otherEntries.map((plantEntry) => (
              <article className="mb-4" key={plantEntry.id}>
                <PlantEntryInline {...plantEntry} />
              </article>
            ))}
          </section>
          <section className="mt-10">
            <Typography variant="h5" component="h3" className="mb-4">
            {t('categories')}
            </Typography>
            <ul className="list">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link prefetch={false} href={`/category/${category.slug}`}>
                    <Typography component="span" variant="h6">
                      {category.title}
                    </Typography>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Grid>
      </Grid>
      <section className="my-4 border-t-2 border-b-2 border-gray-200 pt-12 pb-7">
        <AuthorCard {...plant.author} />
      </section>
    </Layout>
  )
}