import cloudinaryConfig from '../../cloudinaryConfig.json';

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Não foi possível ler a imagem selecionada.');
  }
  return response.blob();
}

async function uploadImage(uri: string, context: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const formData = new FormData();

  formData.append('file', blob, `${context}-${Date.now()}.jpg`);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);
  formData.append('context', `source=${context}`);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message ?? 'Não foi possível enviar a imagem para o Cloudinary.');
  }

  return payload.secure_url;
}

export async function uploadProfileImage(uri: string, uid: string): Promise<string> {
  return uploadImage(uri, `profile-${uid}`);
}

export async function uploadGroupImage(uri: string, uid: string): Promise<string> {
  return uploadImage(uri, `group-${uid}`);
}
