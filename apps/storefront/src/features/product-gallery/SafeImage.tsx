import { Image, Text, type ImageProps } from '@mantine/core';
import { useEffect, useState } from 'react';

export function SafeImage({ src, alt, ...props }: ImageProps & { alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (failed || !src) return <Text c="dimmed" ta="center" role="img" aria-label={alt || 'תמונה לא זמינה'}>התמונה אינה זמינה כרגע</Text>;
  return <Image {...props} src={src} alt={alt} onError={() => setFailed(true)} />;
}
