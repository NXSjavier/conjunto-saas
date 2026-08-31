import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Copy,
  Terminal,
  Layers,
  Sparkles,
  Zap,
  ShieldCheck,
  Cpu,
  FileCode,
  Download,
} from 'lucide-react';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { copyToClipboard } from '../../../lib/utils';
import { soundEngine } from '../../../lib/sound';

export const CapacitorGuideView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'config' | 'build' | 'plugins'>('quickstart');
  const [copied, setCopied] = useState(false);

  const capacitorConfigCode = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.conjuntos.app',
  appName: 'Conjuntos App',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Haptics: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;`;

  const handleCopy = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      soundEngine.playSuccessChime();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacitor Mobile (Android Espejo 1:1)"
        subtitle="Misma base de datos en tiempo real Supabase, aceleración GPU y compilación directa a APK nativo"
        badge={<Badge variant="emerald">Capacitor 6.x • Android Studio • Supabase Realtime</Badge>}
        actions={
          <Button
            variant="primary"
            onClick={() => handleCopy(capacitorConfigCode)}
            className="flex items-center gap-2"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
            <span>Copiar capacitor.config.ts</span>
          </Button>
        }
      />

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800 text-white space-y-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-white">Espejo 100% Sin Código Duplicado</h3>
          <p className="text-xs text-slate-400">
            Todo lo que agregas o modificas en la web se refleja exactamente igual en el APK móvil.
          </p>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 text-white space-y-2">
          <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <Cpu className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-white">Aceleración GPU 60-120 FPS</h3>
          <p className="text-xs text-slate-400">
            Optimizaciones CSS y hardware directo para scroll con inercia, cero lag en clics y respuesta táctil instantánea.
          </p>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 text-white space-y-2">
          <div className="h-9 w-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-white">Misma BD Supabase Realtime</h3>
          <p className="text-xs text-slate-400">
            Web y móvil comparten exactamente la misma URL y claves, recibiendo avisos, pases y comentarios al instante.
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('quickstart')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'quickstart'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>1. Comandos de Compilación (3 pasos)</span>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCode className="h-4 w-4" />
          <span>2. capacitor.config.ts</span>
        </button>
        <button
          onClick={() => setActiveTab('build')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'build'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>3. Generar APK en Android Studio</span>
        </button>
      </div>

      {/* Tab 1: Quickstart */}
      {activeTab === 'quickstart' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pasos para compilar en tu PC local:</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ejecuta estos 3 comandos en la carpeta raíz del proyecto descargado para crear la carpeta Android.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl text-slate-100 font-mono text-xs space-y-3">
              <div>
                <span className="text-slate-500"># Paso 1: Instalar dependencias de Capacitor</span>
                <p className="text-emerald-400 font-bold mt-1">
                  npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/status-bar @capacitor/splash-screen @capacitor/haptics
                </p>
              </div>

              <div>
                <span className="text-slate-500"># Paso 2: Compilar el frontend y agregar Android</span>
                <p className="text-emerald-400 font-bold mt-1">
                  npm run build
                </p>
                <p className="text-emerald-400 font-bold mt-1">
                  npx cap add android
                </p>
              </div>

              <div>
                <span className="text-slate-500"># Paso 3: Abrir en Android Studio para probar o generar el APK</span>
                <p className="text-emerald-400 font-bold mt-1">
                  npx cap open android
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Sincronización instantánea tras hacer cambios:</strong>
                Cada vez que modifiques código en el futuro, sólo ejecuta <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">npm run build && npx cap sync</code> y se actualizará automáticamente la app móvil.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Config */}
      {activeTab === 'config' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">capacitor.config.ts</h3>
              <p className="text-xs text-slate-500">Archivo de configuración de Capacitor listo en la raíz de tu proyecto</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(capacitorConfigCode)}
              className="flex items-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>Copiar</span>
            </Button>
          </div>

          <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto">
            {capacitorConfigCode}
          </pre>
        </Card>
      )}

      {/* Tab 3: Android Studio Build */}
      {activeTab === 'build' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Generar el archivo .APK final para instalar en celulares:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">1</span>
              <h4 className="text-xs font-bold text-slate-900">Compilar APK de prueba (Debug)</h4>
              <p className="text-xs text-slate-600">
                En Android Studio, ve al menú superior: <strong>Build &rarr; Build Bundle(s) / APK(s) &rarr; Build APK(s)</strong>. Al terminar saldrá una notificación con el enlace <em>locate</em> para copiar el archivo .apk a tu teléfono.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">2</span>
              <h4 className="text-xs font-bold text-slate-900">Probar directamente en tu teléfono por USB</h4>
              <p className="text-xs text-slate-600">
                Conecta tu teléfono por cable USB con la opción <strong>Depuración USB</strong> activada y presiona el botón verde <strong>Run (▶)</strong> en Android Studio. Se instalará y abrirá de inmediato.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
