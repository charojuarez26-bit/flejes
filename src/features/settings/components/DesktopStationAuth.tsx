import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useTenantStore } from '../../../stores/useTenantStore';
import { Printer, ShieldCheck, Loader2, AlertCircle, ArrowRight, Building2, RefreshCw } from 'lucide-react';

interface DesktopStationAuthProps {
  onStationLinked: () => void;
  initialAlertMessage?: string | null;
}

interface OrgWithBranches {
  id: string;
  name: string;
  white_label_name?: string | null;
  subscription_status?: string | null;
  next_billing_date?: string | null;
  is_payment_valid: boolean;
  branches: Array<{
    id: string;
    name: string;
    address?: string | null;
  }>;
}

export const DesktopStationAuth: React.FC<DesktopStationAuthProps> = ({
  onStationLinked,
  initialAlertMessage,
}) => {
  const [organizations, setOrganizations] = useState<OrgWithBranches[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(initialAlertMessage || null);

  useEffect(() => {
    if (initialAlertMessage) {
      setFetchError(initialAlertMessage);
    }
  }, [initialAlertMessage]);

  const {
    setCurrentOrganization,
    setCurrentBranch,
    setWhiteLabelName,
    setBranding,
    setBranchInfo,
    updateOrganization,
  } = useTenantStore();

  // Helper para validar si la fecha de facturación está al día
  const isBillingDateValid = (nextBillingDate?: string | null): boolean => {
    if (!nextBillingDate) return true;
    const cleanDate = String(nextBillingDate).split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return true;
    const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
    return dueDate.getTime() >= Date.now();
  };

  const loadStationOptions = async () => {
    setLoading(true);
    if (!initialAlertMessage) setFetchError(null);

    try {
      // Consulta simplificada incluyendo campos de facturación y dirección de sucursal
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, white_label_name, subscription_status, next_billing_date, branches(id, name, address)')
        .order('name');

      if (error) {
        console.error("Error cargando organizaciones:", error);
        setFetchError(error.message || 'Error al conectar con la base de datos.');
        return;
      }

      if (data) {
        const rawList = data as any[];
        const normalizedOrgs: OrgWithBranches[] = rawList.map((org) => {
          let branchesList: Array<{ id: string; name: string; address?: string | null }> = [];

          if (Array.isArray(org.branches)) {
            branchesList = org.branches.map((b: any) => ({
              id: String(b.id),
              name: String(b.name || 'Sucursal'),
              address: b.address ? String(b.address) : null,
            }));
          } else if (org.branches && typeof org.branches === 'object' && org.branches.id) {
            branchesList = [{
              id: String(org.branches.id),
              name: String(org.branches.name || 'Sucursal'),
              address: org.branches.address ? String(org.branches.address) : null,
            }];
          }

          // Si la organización no tiene sucursales aún en la BD, proveer opción por defecto
          if (branchesList.length === 0) {
            branchesList = [{
              id: `branch-central-${org.id}`,
              name: 'Casa Central',
            }];
          }

          const isStatusActive = org.subscription_status === 'active' || !org.subscription_status;
          const isDateValid = isBillingDateValid(org.next_billing_date);
          const isPaymentValid = isStatusActive && isDateValid;

          return {
            id: String(org.id),
            name: String(org.name || 'Comercio'),
            white_label_name: org.white_label_name ? String(org.white_label_name) : null,
            subscription_status: org.subscription_status ? String(org.subscription_status) : null,
            next_billing_date: org.next_billing_date ? String(org.next_billing_date) : null,
            is_payment_valid: isPaymentValid,
            branches: branchesList,
          };
        });

        setOrganizations(normalizedOrgs);

        if (normalizedOrgs.length > 0) {
          // Seleccionar por defecto el primer comercio habilitado para operar
          const defaultOrg = normalizedOrgs.find((o) => o.is_payment_valid) || normalizedOrgs[0];
          setSelectedOrgId(defaultOrg.id);

          if (defaultOrg.branches.length > 0) {
            setSelectedBranchId(defaultOrg.branches[0].id);
          }
        }
      }
    } catch (err: unknown) {
      console.error("Error cargando organizaciones:", err);
      const msg = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err)
        ? String((err as any).message)
        : 'Error inesperado al conectar con la base de datos.';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Consultar comercios activos y sus sucursales desde Supabase al montar
  useEffect(() => {
    loadStationOptions();
  }, []);

  // Al cambiar la organización, actualizar el selector de sucursal
  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = organizations.find((o) => o.id === orgId);
    if (org && org.branches.length > 0) {
      setSelectedBranchId(org.branches[0].id);
    } else {
      setSelectedBranchId('');
    }
  };

  // Vincular la estación de trabajo a la sucursal seleccionada
  const handleLinkStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !selectedBranchId) return;

    setSubmitting(true);

    const chosenOrg = organizations.find((o) => o.id === selectedOrgId);
    if (chosenOrg && !chosenOrg.is_payment_valid) {
      setFetchError(`Acceso Suspendido para "${chosenOrg.name}": Registra pagos pendientes o su suscripción no está activa. Contacte a soporte para reactivar el servicio.`);
      setSubmitting(false);
      return;
    }
    const chosenBranch = chosenOrg?.branches?.find((b) => b.id === selectedBranchId);

    const whiteLabel = chosenOrg?.white_label_name || chosenOrg?.name || 'SUPERMERCADO';

    const branchName = chosenBranch?.name || null;
    const branchAddress = chosenBranch?.address || null;

    // 1. Guardar en Zustand
    setCurrentOrganization(selectedOrgId);
    setCurrentBranch(selectedBranchId);
    setWhiteLabelName(whiteLabel);
    setBranchInfo(branchName, branchAddress);
    setBranding(whiteLabel, '#0f172a', '#f59e0b');

    if (chosenOrg) {
      updateOrganization({
        id: chosenOrg.id,
        name: chosenOrg.name,
        header_title: whiteLabel,
      });
    }

    // 2. Persistencia en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_organization_id', selectedOrgId);
      localStorage.setItem('current_branch_id', selectedBranchId);
      localStorage.setItem('white_label_name', whiteLabel);
      localStorage.setItem('whiteLabelName', whiteLabel);
      if (branchName) {
        localStorage.setItem('branch_name', branchName);
      }
      if (branchAddress) {
        localStorage.setItem('branch_address', branchAddress);
      } else {
        localStorage.removeItem('branch_address');
      }
      if (chosenOrg?.name) {
        localStorage.setItem('organization_name', chosenOrg.name);
      }
    }

    // 3. Da paso inmediato a la vista de la Cola de Impresión en vivo
    onStationLinked();
  };

  const currentOrg = organizations.find((o) => o.id === selectedOrgId);
  const availableBranches = currentOrg?.branches || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans select-none antialiased">
      <div className="w-full max-w-md">
        {/* Tarjeta de Conexión de Terminal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          {/* Encabezado */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
              <Printer className="w-7 h-7 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Estación de Impresión
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Enlaza este terminal a un comercio y sucursal para recibir la cola de flejes en tiempo real
            </p>
          </div>

          {/* Error dinámico si ocurre */}
          {fetchError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono text-[11px] break-all leading-relaxed">
                <span className="font-semibold block text-rose-300 font-sans mb-0.5">Error de conexión con la base de datos:</span>
                {fetchError}
              </div>
              <button
                type="button"
                onClick={loadStationOptions}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-rose-900/50 transition cursor-pointer"
                title="Reintentar carga"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Cargando comercios y sucursales autorizadas...</span>
            </div>
          ) : organizations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800 p-6">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-slate-300">No hay organizaciones activas</p>
              <p className="text-slate-500 mt-1">
                Primero crea un cliente desde el panel SuperAdmin.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={loadStationOptions}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
                <a
                  href="/super-admin"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-semibold inline-flex items-center gap-1 transition"
                >
                  Ir a SuperAdmin
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLinkStation} className="space-y-5">
              {/* Selector de Comercio / Organización */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Selecciona tu Comercio *
                </label>
                <div className="relative">
                  <select
                    value={selectedOrgId}
                    onChange={(e) => handleOrgChange(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
                  >
                    {organizations.map((org) => {
                      const isSuspended = !org.is_payment_valid;
                      return (
                        <option key={org.id} value={org.id} disabled={isSuspended}>
                          {org.name} {isSuspended ? '— (Suspendido por pago)' : org.white_label_name ? `(${org.white_label_name})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Selector de Sucursal */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Selecciona tu Sucursal *
                </label>
                <div className="relative">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    disabled={submitting || availableBranches.length === 0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {availableBranches.length === 0 ? (
                      <option value="">Sin sucursales activas</option>
                    ) : (
                      availableBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Los flejes enviados desde los celulares de esta sucursal llegarán a esta pantalla.
                </span>
              </div>

              {/* Botón de Enlace */}
              <button
                type="submit"
                disabled={submitting || !selectedBranchId || (Boolean(currentOrg) && !currentOrg?.is_payment_valid)}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando terminal...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Conectar Terminal</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Discreto */}
        <p className="text-center text-[11px] text-slate-600 mt-6 tracking-wide font-mono">
          Terminal FlejesPro • WebSocket Realtime Seguro
        </p>
      </div>
    </div>
  );
};

export default DesktopStationAuth;
