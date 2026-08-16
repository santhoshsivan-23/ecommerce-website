import { useRef, useState } from 'react'
import { api, toApiFailure } from '@/api/client'
import { notify, notifyApiError } from '@/utils/notify'
import { Spinner } from '@/components/ui/Spinner'
import {
  FiUploadCloud,
  FiImage,
  FiTrash2,
  FiStar,
  FiRefreshCw,
  FiPlus,
} from 'react-icons/fi'

interface BaseProps {
  label?: string
  hint?: string
  error?: string
  className?: string
}

export interface SingleImageUploadProps extends BaseProps {
  mode?: 'single'
  value: string
  onChange: (url: string) => void
}

export interface MultiImageUploadProps extends BaseProps {
  mode: 'multiple'
  values: string[]
  onChange: (urls: string[]) => void
}

export type ImageUploadProps = SingleImageUploadProps | MultiImageUploadProps

export function ImageUpload(props: ImageUploadProps) {
  const { label, hint, error, className = '' } = props
  const isMultiple = props.mode === 'multiple'

  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload helper using base64 payload to /api/upload
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      notify.error(`"${file.name}" is not an image file`)
      return null
    }

    // Convert file to base64 Data URL
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    try {
      const { data } = await api.post('/upload', {
        image: base64,
        filename: file.name,
      })
      const url = data.data?.url || data.url
      return url
    } catch (err) {
      notifyApiError(toApiFailure(err), `Could not upload ${file.name}`)
      return null
    }
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (fileArray.length === 0) return

    setIsUploading(true)

    if (!isMultiple) {
      const singleProps = props as SingleImageUploadProps
      const url = await uploadFile(fileArray[0])
      setIsUploading(false)
      if (url) {
        singleProps.onChange(url)
        notify.success('Image uploaded successfully')
      }
    } else {
      const multiProps = props as MultiImageUploadProps
      const uploadPromises = fileArray.map((f) => uploadFile(f))
      const results = await Promise.all(uploadPromises)
      setIsUploading(false)

      const validUrls = results.filter((u): u is string => Boolean(u))
      if (validUrls.length > 0) {
        const existing = (multiProps.values || []).filter((v: string) => v.trim())
        multiProps.onChange([...existing, ...validUrls])
        notify.success(`${validUrls.length} image${validUrls.length > 1 ? 's' : ''} uploaded`)
      }
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }

  const removeImageAt = (index: number) => {
    if (isMultiple) {
      const multiProps = props as MultiImageUploadProps
      multiProps.onChange((multiProps.values || []).filter((_: string, idx: number) => idx !== index))
    }
  }

  const makePrimary = (index: number) => {
    if (isMultiple && index > 0) {
      const multiProps = props as MultiImageUploadProps
      const next = [...(multiProps.values || [])]
      const [chosen] = next.splice(index, 1)
      next.unshift(chosen)
      multiProps.onChange(next)
      notify.info('Set as primary thumbnail')
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={isMultiple}
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Label and Hint */}
      {label ? (
        <div className="flex items-center justify-between">
          <label className="label">{label}</label>
          {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
        </div>
      ) : null}

      {/* ── SINGLE IMAGE MODE ── */}
      {!isMultiple ? (
        <div>
          {props.value ? (
            <div className="relative flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white border border-slate-200 shadow-2xs">
                <img
                  src={props.value}
                  alt="Uploaded preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">
                  {props.value.split('/').pop() || 'Uploaded image'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="btn-outline gap-1 text-xs py-1.5 px-3"
                  >
                    <FiRefreshCw className="h-3 w-3" />
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onChange('')}
                    disabled={isUploading}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="Remove Image"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-2xs">
                  <Spinner className="h-5 w-5 text-orange-600" label="Uploading…" />
                </div>
              ) : null}
            </div>
          ) : (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? 'border-orange-500 bg-orange-50/70'
                  : 'border-slate-300 bg-slate-50/60 hover:border-orange-400 hover:bg-orange-50/30'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 transition-transform group-hover:scale-105">
                {isUploading ? (
                  <Spinner className="h-6 w-6 text-orange-600" />
                ) : (
                  <FiUploadCloud className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isUploading ? 'Uploading image from device…' : 'Choose image from device'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click to browse files or drag &amp; drop (PNG, JPG, WEBP, SVG)
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── MULTIPLE IMAGE MODE (Gallery for Products) ── */
        <div className="flex flex-col gap-3">
          {(props.values || []).filter(Boolean).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(props.values || []).filter(Boolean).map((url: string, idx: number) => {
                const isPrimary = idx === 0
                return (
                  <div
                    key={idx}
                    className={`group relative flex flex-col rounded-xl border bg-white p-2 shadow-2xs transition-all overflow-hidden ${
                      isPrimary ? 'border-orange-400 ring-2 ring-orange-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
                      <img src={url} alt={`Product ${idx + 1}`} className="h-full w-full object-cover" />
                      {isPrimary ? (
                        <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          <FiStar className="h-3 w-3 fill-current" /> Primary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makePrimary(idx)}
                          className="absolute top-1.5 left-1.5 hidden group-hover:flex items-center gap-1 rounded-md bg-zinc-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-2xs transition-all hover:bg-orange-600"
                          title="Make primary thumbnail"
                        >
                          <FiStar className="h-3 w-3" /> Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImageAt(idx)}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900/60 text-white backdrop-blur-2xs transition-colors hover:bg-rose-600"
                        title="Remove image"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Add More Button / Drop Tile in Grid */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center transition-all ${
                  isDragging
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-300 bg-slate-50/60 hover:border-orange-400 hover:bg-orange-50/40 text-slate-500 hover:text-orange-600'
                }`}
              >
                {isUploading ? (
                  <Spinner className="h-5 w-5 text-orange-600" label="Uploading…" />
                ) : (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 group-hover:bg-orange-100">
                      <FiPlus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold">Add Image</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Empty State for Multiple Mode */
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                isDragging
                  ? 'border-orange-500 bg-orange-50/70'
                  : 'border-slate-300 bg-slate-50/60 hover:border-orange-400 hover:bg-orange-50/30'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 transition-transform group-hover:scale-105">
                {isUploading ? (
                  <Spinner className="h-6 w-6 text-orange-600" />
                ) : (
                  <FiImage className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isUploading ? 'Uploading images from device…' : 'Choose product images from device'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select one or multiple images directly from your device (PNG, JPG, WEBP)
                </p>
              </div>
              <button
                type="button"
                className="btn-primary gap-1.5 py-2 px-4 text-xs mt-1"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                <FiUploadCloud className="h-4 w-4" />
                Browse Device
              </button>
            </div>
          )}
        </div>
      )}

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}
