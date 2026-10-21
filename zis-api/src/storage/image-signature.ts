import { ApiError } from '../http/api-error.js';
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export function validateImageSignature(contentType: string, content: Buffer): void {
  const valid = contentType === 'image/png' ? content.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    : contentType === 'image/jpeg' ? content.length >= 4 && content[0] === 255 && content[1] === 216 && content[2] === 255
    : contentType === 'image/webp' ? content.length >= 12 && content.toString('ascii', 0, 4) === 'RIFF' && content.toString('ascii', 8, 12) === 'WEBP'
    : false;
  if (!valid) throw new ApiError(400, 'INVALID_MEDIA_CONTENT', 'תוכן הקובץ אינו תואם לסוג התמונה');
}
