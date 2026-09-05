import { supabase } from './supabaseClient';

const BUCKET = 'profile-photos';

/**
 * Sube una foto de perfil a Supabase Storage y retorna la URL pública.
 * @param {File} file - Archivo de imagen del input
 * @param {string} userId - ID del usuario (para nombre único del archivo)
 * @returns {Promise<string|null>} URL pública de la foto o null si falla
 */
export async function uploadProfilePhoto(file, userId) {
  if (!file || !userId) return null;
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  });
  if (error) {
    console.error('uploadProfilePhoto error:', error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

/**
 * Elimina una foto de perfil de Supabase Storage.
 * @param {string} photoUrl - URL pública de la foto
 */
export async function deleteProfilePhoto(photoUrl) {
  if (!photoUrl) return;
  try {
    const urlObj = new URL(photoUrl);
    const pathParts = urlObj.pathname.split(`/${BUCKET}/`);
    if (pathParts.length < 2) return;
    const path = pathParts[1];
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {}
}
