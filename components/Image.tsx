import { CSSProperties, useCallback } from 'react'
import NextImage, {
  ImageLoaderProps,
  ImageProps as NextImageProps,
} from 'next/image'

type ImageProps = {
  width: number
  height?: never
  layout?: ImageLayout
  aspectRatio: AspectRatio
  fit?: ImageFit
  alt?: string
} & DistributiveOmit<NextImageProps, 'height' | 'alt'>

export function Image({
  width,
  fit = 'fill',
  aspectRatio,
  layout = 'intrinsic',
  alt = '',
  style,
  ...nextImageProps
}: ImageProps) {
  const height = calcAspectRatio(aspectRatio, width)

  const imageLoader = useCallback(
    (loaderArgs: ImageLoaderProps) => {
      const h = calcAspectRatio(aspectRatio, loaderArgs.width)

      return `${loaderArgs.src}?w=${loaderArgs.width}&h=${h}&fit=${fit}`
    },
    [aspectRatio, fit]
  )

  let layoutStyle: CSSProperties | undefined = style
  if (layout === 'intrinsic') {
    layoutStyle = { maxWidth: '100%', height: 'auto', ...style }
  } else if (layout === 'responsive') {
    layoutStyle = { width: '100%', height: 'auto', ...style }
  }

  if (layout === 'fill') {
    return (
      <NextImage
        {...nextImageProps}
        alt={alt}
        fill
        style={layoutStyle}
        loader={imageLoader}
      />
    )
  }

  return (
    <NextImage
      {...nextImageProps}
      alt={alt}
      width={width}
      height={height}
      style={layoutStyle}
      loader={imageLoader}
    />
  )
}

export type ImageFit = 'pad' | 'fill' | 'scale' | 'crop' | 'thumb'

export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:2' | '9:12'

export type ImageLayout = 'fill' | 'fixed' | 'intrinsic' | 'responsive'

// https://davidgomes.com/pick-omit-over-union-types-in-typescript/
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never

const aspectRatioToRatio: Record<AspectRatio, number> = {
  '1:1': 1,
  '16:9': 9 / 16,
  '4:3': 3 / 4,
  '3:2': 2 / 3,
  '9:12': 12 / 9,
}

function calcAspectRatio(aspectRatio: AspectRatio, width: number): number {
  const ratio = aspectRatioToRatio[aspectRatio]

  return Math.floor(width * ratio)
}
