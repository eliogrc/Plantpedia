export default function contentfulImageLoader({ src, width }) {
  return `${src}?w=${width}`
}
