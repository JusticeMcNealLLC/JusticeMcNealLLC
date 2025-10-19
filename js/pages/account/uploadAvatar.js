// Validates, previews, and (optionally) uploads avatar with Supabase if available
export async function handleAvatarUpload(e, { toast } = {}) {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    toast?.('Please select a JPG/PNG/WebP image.', 'err'); return;
  }
  if (file.size > 2 * 1024 * 1024) {
    toast?.('Image too large (max 2MB).', 'err'); return;
  }

  // Local preview
  const prev = document.getElementById('profilePreview');
  const reader = new FileReader();
  reader.onload = () => { if (prev) prev.src = reader.result; };
  reader.readAsDataURL(file);

  // Optional: upload to Supabase Storage if available
  const supabase = window.supabaseClient || window.supabase;
  try {
    if (!supabase) {
      toast?.('Preview updated (no backend configured).', 'info');
      return;
    }

    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) throw uerr || new Error('Not signed in.');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;

    // Ensure a bucket named "avatars" exists in your Supabase project
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600', upsert: true, contentType: file.type
    });
    if (upErr) throw upErr;

    // Get public URL (or use RLS auth URL if not public)
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = pub?.publicUrl;

    // Save URL on the user (adjust to your schema if needed)
    await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl });

    toast?.('Profile photo updated.', 'ok');
  } catch (err) {
    console.error('[avatar upload]', err);
    toast?.('Upload failed. Please try again.', 'err');
  }
}
