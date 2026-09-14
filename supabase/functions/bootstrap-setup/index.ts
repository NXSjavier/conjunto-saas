// Edge Function: bootstrap-setup
// Setup inicial de Residex: crea el primer super admin + primer conjunto.
// Solo funciona si NO existe ningún super_admin activo (una sola vez).
// - POST { action: 'status' } → { needsSetup: boolean } (público, sin auth)
// - POST { action: 'setup', name, email, password, complexName, address? } → crea todo
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function genCode(name: string): string {
  const clean = (name || 'RX').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = (clean.substring(0, 2) || 'RX').padEnd(2, 'X');
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${prefix}-${year}-${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const action = body?.action || 'status';

  // ¿Ya existe un super admin activo?
  const { count, error: countErr } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("status", "active");

  if (countErr) {
    return new Response(JSON.stringify({ error: "Error verificando configuración" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "status") {
    return new Response(JSON.stringify({ needsSetup: (count || 0) === 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action !== "setup") {
    return new Response(JSON.stringify({ error: "Acción inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if ((count || 0) > 0) {
    return new Response(JSON.stringify({ error: "La plataforma ya está configurada" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { name, email, password, complexName, address } = body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return new Response(JSON.stringify({ error: "Nombre, email válido y contraseña (mínimo 8 caracteres) son obligatorios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!complexName?.trim()) {
    return new Response(JSON.stringify({ error: "El nombre del primer conjunto es obligatorio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Crear usuario auth
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });
  if (authErr || !authData?.user) {
    return new Response(JSON.stringify({ error: authErr?.message || "No se pudo crear la cuenta" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    // Crear primer conjunto (plan free, 30 días de prueba)
    let code = genCode(complexName);
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await adminClient.from("residential_complexes").select("id").eq("code", code).maybeSingle();
      if (!exists) break;
      code = genCode(complexName + i);
    }
    const complexId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { error: cxErr } = await adminClient.from("residential_complexes").insert({
      id: complexId,
      name: complexName.trim(),
      code,
      address: address?.trim() || '',
      plan: 'free',
      subscription_status: 'active',
      subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
    });
    if (cxErr) throw new Error(cxErr.message);

    // Crear perfil super_admin
    const profileId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const profilePayload: any = {
      id: profileId,
      auth_user_id: authData.user.id,
      name: name.trim(),
      email: normalizedEmail,
      role: 'super_admin',
      complex_id: null,
      phone: null,
      status: 'active',
      consentido: true,
      consentido_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    let { error: profErr } = await adminClient.from("profiles").insert(profilePayload);
    if (profErr && profErr.message?.includes('consentido')) {
      // Fallback: columna consentido aún no creada → reintentar sin ella
      delete profilePayload.consentido;
      delete profilePayload.consentido_at;
      const retry = await adminClient.from("profiles").insert(profilePayload);
      profErr = retry.error;
    }
    if (profErr) throw new Error(profErr.message);

    return new Response(JSON.stringify({ success: true, complexCode: code }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    // Rollback: eliminar el usuario auth creado
    try { await adminClient.auth.admin.deleteUser(authData.user.id); } catch {}
    return new Response(JSON.stringify({ error: err?.message || "Error en la configuración inicial" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
