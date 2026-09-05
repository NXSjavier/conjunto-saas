// Edge Function: admin-create
// Crea un admin (auth user + profile) usando service_role. Solo super_admin puede invocar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Cliente con service_role para operaciones privilegiadas
  const adminClient = createClient(supabaseUrl, serviceKey);

  // Verificar JWT del caller (supabase-js envia Authorization: Bearer <jwt>)
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: "No autorizado: falta token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Cliente con el JWT del usuario para validar rol
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user: caller }, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !caller) {
    return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verificar que caller es super_admin activo
  const { data: profile, error: profErr } = await adminClient
    .from("profiles")
    .select("role, status")
    .eq("auth_user_id", caller.id)
    .single();

  if (profErr || !profile || profile.role !== "super_admin" || profile.status !== "active") {
    return new Response(JSON.stringify({ error: "Solo super_admin puede crear administradores" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const { name, email, password, complex_id, phone } = body;

  if (!name?.trim() || !email?.trim() || !complex_id) {
    return new Response(JSON.stringify({ error: "name, email y complex_id son obligatorios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const pwd = (password?.trim() || "admin123");

  // Verificar que complex existe
  const { data: complex } = await adminClient.from("residential_complexes").select("id").eq("id", complex_id).single();
  if (!complex) {
    return new Response(JSON.stringify({ error: "Conjunto no encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: existing } = await adminClient.from("profiles").select("id").eq("email", normalizedEmail).maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ error: "Email ya registrado" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Crear usuario en auth
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: pwd,
    email_confirm: true,
  });
  if (authErr || !authData?.user) {
    return new Response(JSON.stringify({ error: authErr?.message || "No se pudo crear la cuenta de autenticación" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const id = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const { data, error } = await adminClient
    .from("profiles")
    .insert({
      id,
      auth_user_id: authData.user.id,
      name: name.trim(),
      email: normalizedEmail,
      role: "admin",
      complex_id,
      phone: phone?.trim() || null,
      status: "active",
      password: null,
    })
    .select("id, name, email, role, complex_id, phone, status, created_at")
    .single();

  if (error) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
