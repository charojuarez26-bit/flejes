import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface SuperAdminGuardProps {
  children: React.ReactNode;
  onUnauthorized: () => void;
}

export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({ children, onUnauthorized }) => {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifySuperAdmin = async () => {
      try {
        // 1. Obtener usuario autenticado actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          if (isMounted) {
            setChecking(false);
            setAuthorized(false);
            onUnauthorized();
          }
          return;
        }

        // 2. Verificar permisos en la tabla super_admins
        const { data: adminRecord, error: adminError } = await supabase
          .from('super_admins')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (adminError || !adminRecord) {
          // Usuario no autorizado / intruso
          await supabase.auth.signOut();
          if (isMounted) {
            setChecking(false);
            setAuthorized(false);
            alert('Acceso Denegado: No tienes permisos de SuperAdmin.');
            onUnauthorized();
          }
          return;
        }

        // Usuario verificado exitosamente
        if (isMounted) {
          setAuthorized(true);
          setChecking(false);
        }
      } catch (err) {
        console.error('Error durante la verificación de SuperAdmin:', err);
        await supabase.auth.signOut();
        if (isMounted) {
          setChecking(false);
          setAuthorized(false);
          alert('Acceso Denegado: Ocurrió un error verificando los permisos.');
          onUnauthorized();
        }
      }
    };

    verifySuperAdmin();

    return () => {
      isMounted = false;
    };
  }, [onUnauthorized]);

  // Pantalla de carga mientras se verifican las credenciales
  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 font-sans text-slate-100 select-none p-4">
        <div className="flex flex-col items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-8 max-w-sm text-center shadow-2xl backdrop-blur-sm">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Panel de Seguridad
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Verificando credenciales de seguridad...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si no está autorizado, no renderizar el contenido protegido
  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 font-sans text-slate-100 p-4">
        <div className="flex flex-col items-center gap-3 bg-rose-950/20 border border-rose-800/40 rounded-2xl p-8 max-w-sm text-center">
          <ShieldAlert className="w-10 h-10 text-rose-400" />
          <h3 className="text-sm font-semibold text-rose-300">
            Acceso Denegado
          </h3>
          <p className="text-xs text-slate-400">
            Redirigiendo a zona segura...
          </p>
        </div>
      </div>
    );
  }

  // Usuario verificado: renderizar dashboard protegido
  return <>{children}</>;
};
