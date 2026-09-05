// Edge Function: guard-create
// Crea un guarda (auth user + profile role guard). Permite admin/super_admin del mismo conjunto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: { user: caller } } = await userClient.auth.getUser(jwt);
  if (!caller) return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: profile } = await adminClient.from("profiles").select("role, status, complex_id").eq("auth_user_id", caller.id).single();
  if (!profile || !["admin","super_admin"].includes(profile.role) || profile.status !== "active") {
    return new Response(JSON.stringify({ error: "Solo admin/super_admin puede crear guardas" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const { name, email, phone, password, complex_id } = body;
  const targetComplex = complex_id || profile.complex_id;

  if (!name?.trim() || !email?.trim() || !targetComplex) {
    return new Response(JSON.stringify({ error: "name, email y complex_id requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Si no es super_admin, solo puede crear en su conjunto
  if (profile.role !== "super_admin" && profile.complex_id !== targetComplex) {
    return new Response(JSON.stringify({ error: "No puedes crear guardas en otro conjunto" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const pwd = (password?.trim() || "guard123");

  const { data: existing } = await adminClient.from("profiles").select("id").eq("email", normalizedEmail).maybeSingle();
  if (existing) return new Response(JSON.stringify({ error: "Email ya registrado" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: pwd,
    email_confirm: true,
  });
  if (authErr || !authData?.user) return new Response(JSON.stringify({ error: authErr?.message || "No se pudo crear auth" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const id = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const { data, error } = await adminClient.from("profiles").insert({
    id,
    auth_user_id: authData.user.id,
    name: name.trim(),
    email: normalizedEmail,
    password: null,
    role: "guard",
    complex_id: targetComplex,
    phone: phone?.trim() || null,
    status: "active",
  }).select("id, name, email, phone, complex_id, status, created_at").single();

  if (error) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ...data, tempPassword: pwd }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
