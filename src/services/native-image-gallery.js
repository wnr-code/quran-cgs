// Register the Android MediaStore bridge used to persist generated images in Gallery.
import { registerPlugin } from '@capacitor/core'

export const NativeImageGallery = registerPlugin('ImageGallery')
