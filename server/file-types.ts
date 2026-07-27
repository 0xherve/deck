export interface FileTypeInfo {
  mime: string
  isImage: boolean
  isBinary: boolean
}

const FILE_TYPES: Record<string, FileTypeInfo> = {
  ".png": { mime: "image/png", isImage: true, isBinary: true },
  ".jpg": { mime: "image/jpeg", isImage: true, isBinary: true },
  ".jpeg": { mime: "image/jpeg", isImage: true, isBinary: true },
  ".gif": { mime: "image/gif", isImage: true, isBinary: true },
  ".webp": { mime: "image/webp", isImage: true, isBinary: true },
  ".svg": { mime: "image/svg+xml", isImage: true, isBinary: true },
  ".ico": { mime: "image/x-icon", isImage: true, isBinary: true },
  ".bmp": { mime: "image/bmp", isImage: true, isBinary: true },
  ".avif": { mime: "image/avif", isImage: true, isBinary: true },
  ".woff": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".woff2": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".ttf": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".otf": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".eot": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".pdf": { mime: "application/pdf", isImage: false, isBinary: true },
  ".zip": { mime: "application/zip", isImage: false, isBinary: true },
  ".tar": { mime: "application/x-tar", isImage: false, isBinary: true },
  ".gz": { mime: "application/gzip", isImage: false, isBinary: true },
  ".mp3": { mime: "audio/mpeg", isImage: false, isBinary: true },
  ".mp4": { mime: "video/mp4", isImage: false, isBinary: true },
  ".mov": { mime: "video/quicktime", isImage: false, isBinary: true },
  ".avi": { mime: "video/x-msvideo", isImage: false, isBinary: true },
  ".exe": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".dll": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".so": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".dylib": { mime: "application/octet-stream", isImage: false, isBinary: true },
  ".wasm": { mime: "application/wasm", isImage: false, isBinary: true },
}

const DEFAULT_TYPE: FileTypeInfo = { mime: "application/octet-stream", isImage: false, isBinary: false }

export function getFileTypeInfo(ext: string): FileTypeInfo {
  return FILE_TYPES[ext.toLowerCase()] ?? DEFAULT_TYPE
}
