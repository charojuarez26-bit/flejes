import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import {
  LogOut,
  RefreshCw,
  Search,
  Building2,
  CheckCircle2,
  Palette,
  Power,
  Loader2,
  Store,
  Layers,
  Crown,
  Plus,
  X,
  AlertCircle,
  KeyRound,
  Users,
  Trash2,
  Dices,
  Copy,
  Check,
  Banknote,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Save,
  Pencil
} from 'lucide-react';

export interface ClientOrganization {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
  primary_color?: string;
  accent_color?: string;
  header_title?: string;
  white_label_name?: string;
  subscription_status?: 'active' | 'suspended' | string | null;
  max_branches?: number | null;
  branch_limit?: number | null;
  monthly_fee?: number | null;
  next_billing_date?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface BranchItem {
  id: string;
  name: string;
  address?: string | null;
  is_active?: boolean;
}

export interface RepositorItem {
  id: string;
  branch_id: string;
  name: string;
  pin: string;
  is_active: boolean;
  created_at?: string;
  [key: string]: unknown;
}

interface SuperAdminDashboardProps {
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout }) => {
  const [clients, setClients] = useState<ClientOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Helper para fecha por defecto a 30 días
  const getDefaultNextBillingDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  // Estados del Modal "Nuevo Cliente"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formHeaderTitle, setFormHeaderTitle] = useState('');
  const [formMaxBranches, setFormMaxBranches] = useState<number>(1);
  const [formMonthlyFee, setFormMonthlyFee] = useState<number>(25000);
  const [formNextBillingDate, setFormNextBillingDate] = useState<string>(getDefaultNextBillingDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);

  // Estados del Modal "Editar Organización"
  const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<ClientOrganization | null>(null);
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgWhiteLabelName, setEditOrgWhiteLabelName] = useState('');
  const [editOrgMaxBranches, setEditOrgMaxBranches] = useState<number>(1);
  const [editOrgExistingBranchesCount, setEditOrgExistingBranchesCount] = useState<number>(0);
  const [isLoadingBranchesCount, setIsLoadingBranchesCount] = useState(false);
  const [editOrgSubscriptionStatus, setEditOrgSubscriptionStatus] = useState<'active' | 'suspended'>('active');
  const [editOrgMonthlyFee, setEditOrgMonthlyFee] = useState<number>(0);
  const [editOrgNextBillingDate, setEditOrgNextBillingDate] = useState<string>('');
  const [isSubmittingEditOrg, setIsSubmittingEditOrg] = useState(false);
  const [editOrgError, setEditOrgError] = useState<string | null>(null);

  // Helper para calcular días restantes hasta el vencimiento
  const getDaysUntilBilling = (billingDateStr?: string | null): number | null => {
    if (!billingDateStr) return null;
    const cleanDateStr = billingDateStr.split('T')[0];
    const parts = cleanDateStr.split('-');
    if (parts.length !== 3) return null;
    const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper para formatear fecha a formato DD/MM/YYYY
  const formatDisplayDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'Sin fecha';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Estados del Modal "Sucursales / PINs / Marca Blanca"
  const [selectedClientForRepos, setSelectedClientForRepos] = useState<ClientOrganization | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'branches' | 'repositores' | 'branding'>('branches');
  const [branchesForClient, setBranchesForClient] = useState<BranchItem[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [branchFormError, setBranchFormError] = useState<string | null>(null);

  // Estados de edición de Marca Blanca y Direcciones
  const [editWhiteLabelName, setEditWhiteLabelName] = useState('');
  const [editBranchesList, setEditBranchesList] = useState<Array<{ id: string; name: string; address: string }>>([]);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSaveSuccess, setBrandingSaveSuccess] = useState<string | null>(null);
  const [brandingSaveError, setBrandingSaveError] = useState<string | null>(null);

  const [reposList, setReposList] = useState<RepositorItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposModalError, setReposModalError] = useState<string | null>(null);

  // Formulario nuevo repositor
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoBranchId, setNewRepoBranchId] = useState('');
  const [newRepoPin, setNewRepoPin] = useState('');
  const [isSubmittingRepo, setIsSubmittingRepo] = useState(false);
  const [repoFormError, setRepoFormError] = useState<string | null>(null);
  const [togglingRepoId, setTogglingRepoId] = useState<string | null>(null);
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);

  // Toast de notificación
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  // Generador de PIN aleatorio de 4 dígitos no repetidos
  const generateRandomPin = () => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, 4).join('');
  };

  // Copiar PIN al portapapeles
  const handleCopyPin = (pin: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pin);
      setCopiedPinId(id);
      setTimeout(() => setCopiedPinId(null), 2000);
    }
  };

  // Obtención de todos los clientes desde la tabla organizations
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data as ClientOrganization[]) || []);
    } catch (err: unknown) {
      console.error('Error al obtener clientes:', err);
      const msg = err instanceof Error ? err.message : 'Error al consultar organizaciones.';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Kill Switch: Suspender / Reactivar cliente
  const toggleSubscription = async (client: ClientOrganization) => {
    const currentStatus = client.subscription_status || 'active';
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const actionLabel = nextStatus === 'suspended' ? 'suspender' : 'reactivar';

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas ${actionLabel} el acceso para "${client.name}"?`
    );
    if (!confirmed) return;

    setUpdatingId(client.id);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_status: nextStatus })
        .eq('id', client.id);

      if (error) throw error;

      // Actualizar estado local inmediatamente
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, subscription_status: nextStatus } : c))
      );

      setToast({
        title: 'Estado actualizado',
        message: `El comercio "${client.name}" ahora está ${nextStatus === 'active' ? 'activo' : 'suspendido'}.`,
      });
      setTimeout(() => setToast(null), 3500);
    } catch (err: unknown) {
      console.error('Error al actualizar subscription_status:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo cambiar el estado del cliente.';
      alert(`Error: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Eliminar Comercio / Organización
  const handleDeleteOrganization = async (client: ClientOrganization) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar a "${client.name}"? Se eliminarán permanentemente todas sus sucursales, repositores y flejes asociados.`
    );
    if (!confirmed) return;

    setDeletingOrgId(client.id);
    try {
      // 1. Eliminar en Supabase
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', client.id);

      if (error) {
        console.error("Error al eliminar organización en Supabase:", error);
        throw error;
      }

      // 2. Actualizar estado local inmediatamente
      setClients((prev) => prev.filter((c) => c.id !== client.id));

      setToast({
        title: 'Cliente Eliminado',
        message: `El comercio "${client.name}" fue eliminado permanentemente.`,
      });
      setTimeout(() => setToast(null), 3500);
    } catch (err: unknown) {
      console.error("Error al eliminar cliente:", err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al eliminar el comercio.';
      alert(`No se pudo eliminar el cliente: ${msg}`);
    } finally {
      setDeletingOrgId(null);
    }
  };

  // Abrir Modal de Edición Completa de Organización
  const openEditOrgModal = async (client: ClientOrganization) => {
    setSelectedOrgForEdit(client);
    setEditOrgName(client.name || '');
    setEditOrgWhiteLabelName(client.white_label_name || client.header_title || client.name || '');
    setEditOrgMaxBranches(Number(client.max_branches ?? client.branch_limit ?? 1));
    setEditOrgSubscriptionStatus(client.subscription_status === 'suspended' ? 'suspended' : 'active');
    setEditOrgMonthlyFee(Number(client.monthly_fee ?? 0));
    setEditOrgNextBillingDate(client.next_billing_date ? String(client.next_billing_date).split('T')[0] : '');
    setEditOrgError(null);
    setEditOrgExistingBranchesCount(0);
    setIsEditOrgModalOpen(true);
    setIsLoadingBranchesCount(true);

    try {
      const { count, error } = await supabase
        .from('branches')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', client.id);

      if (!error && count !== null) {
        setEditOrgExistingBranchesCount(count);
      } else {
        const { data: bList } = await supabase
          .from('branches')
          .select('id')
          .eq('organization_id', client.id);
        setEditOrgExistingBranchesCount(bList ? bList.length : 0);
      }
    } catch (err) {
      console.warn("Error consultando sucursales para límite:", err);
      setEditOrgExistingBranchesCount(0);
    } finally {
      setIsLoadingBranchesCount(false);
    }
  };

  // Guardar Edición Completa de Organización
  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForEdit) return;

    const parsedMaxBranches = parseInt(String(editOrgMaxBranches), 10) || 1;
    const parsedMonthlyFee = parseFloat(String(editOrgMonthlyFee)) || 0;
    const cleanBillingDate = editOrgNextBillingDate && editOrgNextBillingDate.trim() ? editOrgNextBillingDate.trim() : null;

    if (parsedMaxBranches < editOrgExistingBranchesCount) {
      setEditOrgError(
        `El cliente ya posee ${editOrgExistingBranchesCount} sucursales creadas. No puedes asignar un límite menor sin eliminar sucursales previas.`
      );
      return;
    }

    if (parsedMaxBranches < 1) {
      setEditOrgError('El límite de sucursales debe ser al menos 1.');
      return;
    }

    setIsSubmittingEditOrg(true);
    setEditOrgError(null);

    try {
      const updatePayload: Record<string, any> = {
        name: editOrgName.trim(),
        white_label_name: editOrgWhiteLabelName?.trim() || null,
        max_branches: parsedMaxBranches,
        subscription_status: editOrgSubscriptionStatus,
        monthly_fee: parsedMonthlyFee,
        ...(cleanBillingDate ? { next_billing_date: cleanBillingDate } : { next_billing_date: null }),
      };

      const { error } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', selectedOrgForEdit.id);

      if (error) {
        console.error("Error al actualizar organización:", error);
        const errorMsg = error.message || error.details || "Error inesperado al actualizar la organización.";
        setEditOrgError(errorMsg);
        setIsSubmittingEditOrg(false);
        return;
      }

      // Actualizar estado local inmediatamente
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedOrgForEdit.id
            ? {
                ...c,
                ...updatePayload,
              }
            : c
        )
      );

      setIsEditOrgModalOpen(false);
      setSelectedOrgForEdit(null);

      setToast({
        title: '¡Organización Actualizada!',
        message: 'Organización actualizada correctamente',
      });
      setTimeout(() => setToast(null), 3500);
    } catch (error: any) {
      console.error("Error al actualizar organización:", error);
      const errorMsg = error?.message || error?.details || "Error inesperado al actualizar la organización.";
      setEditOrgError(errorMsg);
    } finally {
      setIsSubmittingEditOrg(false);
    }
  };

  // Botón Rápido "Registrar Pago (+1 Mes)": suma 1 mes al vencimiento y activa el comercio
  const handleRegisterPayment = async (client: ClientOrganization) => {
    const currentBillingStr = client.next_billing_date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextBilling: Date;
    if (currentBillingStr) {
      const clean = currentBillingStr.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        // Si ya está vencido hace más de 30 días, calcular a partir de hoy
        const base = parsed.getTime() < today.getTime() - 30 * 24 * 60 * 60 * 1000 ? today : parsed;
        nextBilling = new Date(base);
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      } else {
        nextBilling = new Date(today);
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      }
    } else {
      nextBilling = new Date(today);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }

    const nextBillingDateStr = nextBilling.toISOString().split('T')[0];

    setUpdatingPaymentId(client.id);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          next_billing_date: nextBillingDateStr,
          subscription_status: 'active',
        })
        .eq('id', client.id);

      if (error) {
        console.error("Error exacto Supabase al registrar pago:", error.message, error.details, error.hint);
        throw error;
      }

      setClients((prev) =>
        prev.map((c) =>
          c.id === client.id
            ? { ...c, next_billing_date: nextBillingDateStr, subscription_status: 'active' }
            : c
        )
      );

      setToast({
        title: 'Pago registrado con éxito',
        message: `Se extendió 1 mes a "${client.name}". Nuevo vencimiento: ${formatDisplayDate(nextBillingDateStr)}.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: unknown) {
      console.error("Error al registrar pago:", err);
      const msg = err instanceof Error ? err.message : 'Error al registrar pago.';
      alert(`Error: ${msg}`);
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  // Creación de Nuevo Cliente y Sucursal Casa Central
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('El nombre del comercio es requerido.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Generación automática del slug
      const generatedSlug =
        formName
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') || 'comercio';

      // Payload estricto y limpio requerido por la tabla organizations
      const payload = {
        name: formName.trim(),
        white_label_name: formHeaderTitle.trim() || formName.trim(),
        max_branches: Number(formMaxBranches),
        slug: generatedSlug,
        monthly_fee: Number(formMonthlyFee) || 0,
        next_billing_date: formNextBillingDate || null,
      };

      // 1. Insertar nueva organización y retornar el registro
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert(payload)
        .select()
        .single();

      if (orgError) {
        console.error("Error exacto Supabase:", orgError.message, orgError.details, orgError.hint);
        setFormError(orgError.message || 'Error al crear la organización.');
        return;
      }

      if (!newOrg) {
        throw new Error('No se pudo crear la organización.');
      }

      // 2. Insertar automáticamente sucursal por defecto "Casa Central"
      const { error: branchError } = await supabase
        .from('branches')
        .insert({
          organization_id: newOrg.id,
          name: 'Casa Central',
          is_active: true,
        });

      if (branchError) {
        console.error("Error exacto Supabase (branch):", branchError.message, branchError.details, branchError.hint);
      }

      // 3. Actualizar estado local instantáneamente
      setClients((prev) => [newOrg as ClientOrganization, ...prev]);

      // 4. Limpiar formulario y cerrar modal
      setFormName('');
      setFormHeaderTitle('');
      setFormMaxBranches(1);
      setFormMonthlyFee(25000);
      setFormNextBillingDate(getDefaultNextBillingDate());
      setIsModalOpen(false);

      // 5. Notificación de éxito
      setToast({
        title: '¡Cliente Creado con Éxito!',
        message: `"${newOrg.name}" fue dado de alta con su sucursal "Casa Central".`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (error: any) {
      console.error("Error exacto Supabase:", error?.message, error?.details, error?.hint);
      const msg = error?.message || 'Error inesperado al crear el comercio.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir Modal de Gestión de Sucursales, Repositores y Marca Blanca
  const openRepositoresModal = async (
    client: ClientOrganization,
    defaultTab: 'branches' | 'repositores' | 'branding' = 'branches'
  ) => {
    setSelectedClientForRepos(client);
    setActiveModalTab(defaultTab);
    setBranchFormError(null);
    setNewBranchName('');
    setRepoFormError(null);
    setReposModalError(null);
    setNewRepoName('');
    setNewRepoPin('');
    setBrandingSaveSuccess(null);
    setBrandingSaveError(null);
    setEditWhiteLabelName(client.white_label_name || client.header_title || client.name || '');
    setLoadingRepos(true);

    try {
      // 1. Obtener sucursales de la organización (incluyendo dirección física)
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, name, address, is_active')
        .eq('organization_id', client.id);

      if (branchesError) {
        console.error("Error exacto Supabase (branches):", branchesError.message, branchesError.details, branchesError.hint);
        throw branchesError;
      }

      const branches = (branchesData as BranchItem[]) || [];
      setBranchesForClient(branches);
      setEditBranchesList(branches.map((b) => ({ id: b.id, name: b.name, address: b.address || '' })));

      if (branches.length > 0) {
        setNewRepoBranchId(branches[0].id);

        // 2. Obtener repositores vinculados a estas sucursales
        const branchIds = branches.map((b) => b.id);
        const { data: reposData, error: reposError } = await supabase
          .from('repositores')
          .select('*')
          .in('branch_id', branchIds)
          .order('created_at', { ascending: false });

        if (reposError) {
          console.error("Error exacto Supabase (repositores):", reposError.message, reposError.details, reposError.hint);
          throw reposError;
        }

        const normalized: RepositorItem[] = (reposData || []).map((r: any) => ({
          id: String(r.id),
          branch_id: String(r.branch_id),
          name: String(r.name || r.nombre || 'Sin nombre'),
          pin: String((r as any).pin_code || r.pin || r.codigo_pin || '----'),
          is_active: r.is_active ?? r.activo ?? true,
          created_at: r.created_at,
        }));

        setReposList(normalized);
      } else {
        setReposList([]);
      }
    } catch (err: any) {
      console.error("Error exacto Supabase:", err?.message, err?.details, err?.hint);
      setReposModalError(err?.message || 'Error al cargar repositores de la organización.');
    } finally {
      setLoadingRepos(false);
    }
  };

  // Guardar Marca Blanca y Direcciones de Sucursales
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForRepos) return;

    setIsSavingBranding(true);
    setBrandingSaveSuccess(null);
    setBrandingSaveError(null);

    try {
      const cleanWhiteLabel = editWhiteLabelName.trim() || selectedClientForRepos.name;

      // 1. Actualizar organizations con el nuevo white_label_name
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          white_label_name: cleanWhiteLabel,
          header_title: cleanWhiteLabel,
        })
        .eq('id', selectedClientForRepos.id);

      if (orgError) {
        console.error("Error actualizando white_label_name:", orgError);
        throw orgError;
      }

      // 2. Actualizar cada sucursal en branches (nombre y dirección física)
      for (const branch of editBranchesList) {
        const cleanName = branch.name.trim() || 'Sucursal';
        const cleanAddress = branch.address.trim() || null;

        const { error: branchError } = await supabase
          .from('branches')
          .update({
            name: cleanName,
            address: cleanAddress,
          })
          .eq('id', branch.id);

        if (branchError) {
          console.error(`Error actualizando sucursal ${branch.id}:`, branchError);
          // Si la columna address todavía no existe en la BD (código 42703), reintentar solo con name
          if (branchError.code === '42703' || branchError.message?.includes('address')) {
            await supabase
              .from('branches')
              .update({ name: cleanName })
              .eq('id', branch.id);
          } else {
            throw branchError;
          }
        }
      }

      // 3. Actualizar estado local de clientes y sucursales
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClientForRepos.id
            ? { ...c, white_label_name: cleanWhiteLabel, header_title: cleanWhiteLabel }
            : c
        )
      );

      setSelectedClientForRepos((prev) =>
        prev ? { ...prev, white_label_name: cleanWhiteLabel, header_title: cleanWhiteLabel } : null
      );

      setBranchesForClient((prev) =>
        prev.map((b) => {
          const edited = editBranchesList.find((eb) => eb.id === b.id);
          return edited ? { ...b, name: edited.name, address: edited.address } : b;
        })
      );

      setBrandingSaveSuccess("¡Configuración de Marca Blanca y Sucursales guardada exitosamente!");
      setToast({
        title: '¡Cambios Guardados!',
        message: `Marca Blanca y sucursales actualizadas para "${selectedClientForRepos.name}".`,
      });
      setTimeout(() => setToast(null), 3500);
    } catch (err: unknown) {
      console.error("Error al guardar Marca Blanca y sucursales:", err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al guardar cambios.';
      setBrandingSaveError(msg);
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Crear nueva sucursal con validación de límite
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForRepos) return;

    const trimmedName = newBranchName.trim();
    if (!trimmedName) {
      setBranchFormError('Por favor ingresa el nombre de la sucursal.');
      return;
    }

    const maxBranches = selectedClientForRepos.max_branches ?? 1;
    if (branchesForClient.length >= maxBranches) {
      setBranchFormError(`Límite de sucursales alcanzado según el plan (${branchesForClient.length}/${maxBranches}).`);
      return;
    }

    setIsSubmittingBranch(true);
    setBranchFormError(null);

    try {
      const { data, error } = await supabase
        .from('branches')
        .insert({
          organization_id: selectedClientForRepos.id,
          name: trimmedName,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error exacto Supabase (crear sucursal):", error.message, error.details, error.hint);
        throw error;
      }

      const createdBranch: BranchItem = {
        id: String(data.id),
        name: String(data.name),
        address: data.address ? String(data.address) : '',
        is_active: data.is_active ?? true,
      };

      const updatedBranches = [...branchesForClient, createdBranch];
      setBranchesForClient(updatedBranches);
      setEditBranchesList((prev) => [...prev, { id: createdBranch.id, name: createdBranch.name, address: createdBranch.address || '' }]);
      if (!newRepoBranchId) {
        setNewRepoBranchId(createdBranch.id);
      }
      setNewBranchName('');

      setToast({
        title: '¡Sucursal Creada con Éxito!',
        message: `Se añadió "${createdBranch.name}" a "${selectedClientForRepos.name}".`,
      });
      setTimeout(() => setToast(null), 3500);
    } catch (err: unknown) {
      console.error("Error al crear sucursal:", err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al crear la sucursal.';
      setBranchFormError(msg);
    } finally {
      setIsSubmittingBranch(false);
    }
  };

  // Crear nuevo repositor con PIN
  const handleCreateRepositor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) {
      setRepoFormError('Por favor ingresa el nombre del repositor.');
      return;
    }
    if (!newRepoBranchId) {
      setRepoFormError('Debes seleccionar una sucursal.');
      return;
    }
    if (!newRepoPin.trim() || newRepoPin.trim().length !== 4) {
      setRepoFormError('El código PIN debe ser exactamente de 4 dígitos.');
      return;
    }

    setIsSubmittingRepo(true);
    setRepoFormError(null);

    try {
      // 1. Intentar inserción con pin_code
      let res = await supabase
        .from('repositores')
        .insert({
          branch_id: newRepoBranchId,
          name: newRepoName.trim(),
          pin_code: newRepoPin.trim(),
          is_active: true,
        })
        .select()
        .single();

      // Fallback si la columna en la BD se llama 'pin'
      if (res.error && (res.error.message.includes('pin_code') || res.error.code === '42703')) {
        res = await supabase
          .from('repositores')
          .insert({
            branch_id: newRepoBranchId,
            name: newRepoName.trim(),
            pin: newRepoPin.trim(),
            is_active: true,
          })
          .select()
          .single();
      }

      const { data: insertedRepo, error: insertError } = res;

      if (insertError) {
        console.error("Error exacto Supabase (insert repositor):", insertError.message, insertError.details, insertError.hint);
        setRepoFormError(insertError.message || 'Error al insertar repositor.');
        return;
      }

      if (!insertedRepo) {
        throw new Error('No se recibió la confirmación de inserción.');
      }

      const formatted: RepositorItem = {
        id: String(insertedRepo.id),
        branch_id: String(insertedRepo.branch_id),
        name: String(insertedRepo.name || insertedRepo.nombre || newRepoName.trim()),
        pin: String((insertedRepo as any).pin_code || (insertedRepo as any).pin || newRepoPin.trim()),
        is_active: insertedRepo.is_active ?? true,
        created_at: insertedRepo.created_at,
      };

      setReposList((prev) => [formatted, ...prev]);
      setNewRepoName('');
      setNewRepoPin('');

      setToast({
        title: 'PIN Creado con Éxito',
        message: `Repositor "${formatted.name}" registrado con PIN ${formatted.pin}.`,
      });
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      console.error("Error exacto Supabase:", err?.message, err?.details, err?.hint);
      setRepoFormError(err?.message || 'Error inesperado al crear el repositor.');
    } finally {
      setIsSubmittingRepo(false);
    }
  };

  // Alternar estado activo/inactivo del repositor
  const handleToggleRepositorActive = async (repo: RepositorItem) => {
    const nextState = !repo.is_active;
    setTogglingRepoId(repo.id);

    try {
      const { error } = await supabase
        .from('repositores')
        .update({ is_active: nextState })
        .eq('id', repo.id);

      if (error) {
        console.error("Error exacto Supabase (update is_active):", error.message, error.details, error.hint);
        throw error;
      }

      setReposList((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, is_active: nextState } : r))
      );
    } catch (err: any) {
      alert(`Error al actualizar estado del repositor: ${err?.message || 'Error'}`);
    } finally {
      setTogglingRepoId(null);
    }
  };

  // Eliminar repositor
  const handleDeleteRepositor = async (repo: RepositorItem) => {
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar al repositor "${repo.name}" y revocar su PIN?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('repositores')
        .delete()
        .eq('id', repo.id);

      if (error) {
        console.error("Error exacto Supabase (delete repositor):", error.message, error.details, error.hint);
        throw error;
      }

      setReposList((prev) => prev.filter((r) => r.id !== repo.id));
      setToast({
        title: 'Repositor eliminado',
        message: `Se revocó el acceso de "${repo.name}".`,
      });
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(`Error al eliminar repositor: ${err?.message || 'Error'}`);
    }
  };

  // Cerrar Sesión
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      onLogout();
    }
  };

  // Filtrado de clientes por búsqueda
  const filteredClients = clients.filter((client) => {
    const q = searchTerm.toLowerCase();
    const nameMatch = client.name?.toLowerCase().includes(q);
    const slugMatch = client.slug?.toLowerCase().includes(q);
    const titleMatch = (client.white_label_name || client.header_title)?.toLowerCase().includes(q);
    return nameMatch || slugMatch || titleMatch;
  });

  const totalActive = clients.filter((c) => (c.subscription_status || 'active') === 'active').length;
  const totalSuspended = clients.filter((c) => c.subscription_status === 'suspended').length;

  // 1. Ingresos Mensuales Recurrentes (MRR): suma de monthly_fee de organizaciones con estado 'active'
  const activeClients = clients.filter((c) => (c.subscription_status || 'active') === 'active');
  const totalMRR = activeClients.reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0);

  // 3. Vencimientos Próximos / Morosos: comercios con fecha de vencimiento cumplida (días <= 0) o en los próximos 5 días (días <= 5)
  const pendingOrOverdueClients = clients.filter((c) => {
    if (!c.next_billing_date) return false;
    const days = getDaysUntilBilling(c.next_billing_date);
    return days !== null && days <= 5;
  });
  const totalPendingOrOverdue = pendingOrOverdueClients.length;

  // Mapa rápido de sucursales para mostrar nombre legible en la lista de repositores
  const branchMap = new Map(branchesForClient.map((b) => [b.id, b.name]));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased relative">
      {/* Toast Flotante de Notificaciones */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/80 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-400 flex items-center justify-center shrink-0 text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{toast.title}</p>
            <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Topbar / Header God Mode */}
      <header className="h-16 border-b border-slate-800/90 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-lg shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-950/60 ring-1 ring-white/20">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                FlejesPro
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gradient-to-r from-red-600/30 to-amber-500/30 border border-amber-500/40 text-amber-300 shadow-inner">
                God Mode
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">
              SuperAdmin Control Center
            </p>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg shadow-md shadow-indigo-950 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>

          <button
            onClick={() => fetchClients()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Recargar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-800/50 hover:border-rose-600 px-3.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Tarjetas de Métricas Arriba del Dashboard (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tarjeta 1: MRR */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-black/20">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ingresos Mensuales Recurrentes (MRR)
              </p>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                ${totalMRR.toLocaleString('es-AR')}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                Suma cuotas de clientes activos
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Tarjeta 2: Clientes Activos */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-black/20">
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Clientes Activos
              </p>
              <p className="text-2xl font-black text-white mt-1">
                {totalActive}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">
                  / {clients.length} totales
                </span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {totalSuspended} {totalSuspended === 1 ? 'suspendido' : 'suspendidos'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Tarjeta 3: Vencimientos Próximos / Morosos */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-black/20">
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Vencimientos Próximos / Morosos
              </p>
              <p className="text-2xl font-black text-amber-300 mt-1 font-mono">
                {totalPendingOrOverdue}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                Vencidos o a cobrar en próximos 5 días
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Barra de Filtro y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por comercio, slug o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 self-end sm:self-center">
            <span>Mostrando {filteredClients.length} de {clients.length} organizaciones</span>
          </div>
        </div>

        {/* Mensaje de Error si ocurre en consulta */}
        {fetchError && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center justify-between">
            <span>Error cargando organizaciones: {fetchError}</span>
            <button
              onClick={() => fetchClients()}
              className="underline text-rose-200 hover:text-white cursor-pointer ml-4"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Tabla de Clientes */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nombre del Comercio</th>
                  <th className="py-3.5 px-4">Marca Blanca</th>
                  <th className="py-3.5 px-4">Vencimiento / Cuota</th>
                  <th className="py-3.5 px-4">Límite Sucursales</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right w-64 pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-xs">Cargando base de datos de comercios...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No se encontraron clientes registrados.</p>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const status = client.subscription_status || 'active';
                    const isActive = status === 'active';
                    const isUpdating = updatingId === client.id;
                    const isUpdatingPayment = updatingPaymentId === client.id;
                    const branchLimit = client.max_branches ?? client.branch_limit ?? 'Ilimitado';

                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* Nombre del Comercio */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 font-bold shrink-0">
                              {client.logo_url ? (
                                <img
                                  src={client.logo_url}
                                  alt={client.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                client.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100 group-hover:text-white">
                                {client.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                slug: {client.slug || 'sin-slug'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Marca Blanca */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-200 font-medium flex items-center gap-1.5">
                              <Palette className="w-3 h-3 text-slate-400" />
                              {client.white_label_name || client.header_title || 'Estándar'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {client.primary_color && (
                                <span
                                  className="w-3 h-3 rounded-full border border-slate-700 inline-block shadow-sm"
                                  style={{ backgroundColor: client.primary_color }}
                                  title={`Color primario: ${client.primary_color}`}
                                />
                              )}
                              {client.accent_color && (
                                <span
                                  className="w-3 h-3 rounded-full border border-slate-700 inline-block shadow-sm"
                                  style={{ backgroundColor: client.accent_color }}
                                  title={`Color acento: ${client.accent_color}`}
                                />
                              )}
                              {client.logo_url && (
                                <span className="text-[10px] text-indigo-400 font-mono">
                                  Logo Custom
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Semáforo de Pagos / Vencimiento y Cuota */}
                        <td className="py-3.5 px-4">
                          {(() => {
                            const days = getDaysUntilBilling(client.next_billing_date);
                            const feeFormatted = client.monthly_fee != null
                              ? `$${Number(client.monthly_fee).toLocaleString('es-AR')}`
                              : '$0';
                            const displayDate = formatDisplayDate(client.next_billing_date);

                            if (days === null) {
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-slate-200 font-mono font-semibold text-xs">{feeFormatted} / mes</span>
                                  <span className="text-[10px] text-slate-500 font-mono">Sin vencimiento</span>
                                </div>
                              );
                            }

                            // Semáforo dinámico de cobros:
                            // Verde: faltan más de 5 días
                            // Amarillo: vence en los próximos 5 días (0 a 5)
                            // Rojo: fecha vencida (< 0)
                            let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                            let dotColor = 'bg-emerald-400';
                            let statusLabel = `En ${days} días`;

                            if (days < 0) {
                              badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                              dotColor = 'bg-rose-400 animate-pulse';
                              statusLabel = `Vencido (${Math.abs(days)}d)`;
                            } else if (days <= 5) {
                              badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                              dotColor = 'bg-amber-400 animate-ping';
                              statusLabel = days === 0 ? 'Vence hoy' : `Vence en ${days}d`;
                            }

                            return (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeColor}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                    <span>{statusLabel}</span>
                                  </span>
                                  <span className="text-xs font-bold font-mono text-slate-100">{feeFormatted}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  <span>{displayDate}</span>
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Límite de Sucursales */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            <span>{branchLimit}</span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Suspendido
                            </span>
                          )}
                        </td>

                        {/* Acciones Compactas */}
                        <td className="py-3 px-4 text-right w-64 pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Registrar Pago (+1 Mes) */}
                            <button
                              onClick={() => handleRegisterPayment(client)}
                              disabled={isUpdatingPayment}
                              className="p-2 rounded-lg bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Registrar Pago (+1 Mes)"
                            >
                              {isUpdatingPayment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Banknote className="w-4 h-4" />
                              )}
                            </button>

                            {/* Sucursales y PINs */}
                            <button
                              onClick={() => openRepositoresModal(client, 'branches')}
                              className="p-2 rounded-lg bg-sky-950/40 text-sky-400 hover:bg-sky-900/50 hover:text-sky-200 border border-sky-500/30 transition-all cursor-pointer shadow-sm"
                              title="Gestionar Sucursales y PINs"
                            >
                              <Store className="w-4 h-4" />
                            </button>

                            {/* Configurar Marca Blanca */}
                            <button
                              onClick={() => openRepositoresModal(client, 'branding')}
                              className="p-2 rounded-lg bg-purple-950/40 text-purple-400 hover:bg-purple-900/50 hover:text-purple-200 border border-purple-500/30 transition-all cursor-pointer shadow-sm"
                              title="Configurar Marca Blanca"
                            >
                              <Palette className="w-4 h-4" />
                            </button>

                            {/* Editar Comercio y Límites */}
                            <button
                              onClick={() => openEditOrgModal(client)}
                              className="p-2 rounded-lg bg-blue-950/40 text-blue-400 hover:bg-blue-900/50 hover:text-blue-200 border border-blue-500/30 transition-all cursor-pointer shadow-sm"
                              title="Editar Comercio y Límite de Sucursales"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Suspender / Reactivar */}
                            <button
                              onClick={() => toggleSubscription(client)}
                              disabled={isUpdating}
                              className={`p-2 rounded-lg border transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                isActive
                                  ? 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/50 hover:text-rose-200 border-rose-500/30'
                                  : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-200 border-emerald-500/30'
                              }`}
                              title={isActive ? 'Suspender Comercio' : 'Reactivar Comercio'}
                            >
                              {isUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}
                            </button>

                            {/* Eliminar Cliente */}
                            <button
                              onClick={() => handleDeleteOrganization(client)}
                              disabled={deletingOrgId === client.id}
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                              title="Eliminar comercio permanentemente"
                            >
                              {deletingOrgId === client.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: Crear Nuevo Cliente (Organización) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => {
                if (!isSubmitting) setIsModalOpen(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Nuevo Cliente</h3>
                <p className="text-xs text-slate-400">
                  Dar de alta una nueva organización y su sucursal Casa Central
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre del Comercio (Interno) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Supermercado El Trébol S.A."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-500">Razón social o denominación interna.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre para Marca Blanca
                </label>
                <input
                  type="text"
                  placeholder="ej: SUPERMERCADO EL TRÉBOL"
                  value={formHeaderTitle}
                  onChange={(e) => setFormHeaderTitle(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-500">
                  Texto que saldrá impreso en los carteles y flejes A4. (Opcional, por defecto igual al comercio)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Límite de Sucursales permitidas
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formMaxBranches}
                  onChange={(e) => setFormMaxBranches(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-500">
                  Cantidad máxima de sucursales que puede operar esta organización.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Cuota Mensual ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      placeholder="25000"
                      value={formMonthlyFee}
                      onChange={(e) => setFormMonthlyFee(Number(e.target.value))}
                      disabled={isSubmitting}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Monto de cobro recurrente.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Próximo Vencimiento
                  </label>
                  <input
                    type="date"
                    required
                    value={formNextBillingDate}
                    onChange={(e) => setFormNextBillingDate(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500">Por defecto fecha actual +30 días.</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-md shadow-indigo-950 flex items-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creando Organización...</span>
                    </>
                  ) : (
                    <span>Crear Organización</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Organización */}
      {isEditOrgModalOpen && selectedOrgForEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
            {/* Botón Cerrar */}
            <button
              onClick={() => {
                setIsEditOrgModalOpen(false);
                setSelectedOrgForEdit(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header del Modal */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Editar Organización</span>
                  <span className="text-xs font-normal text-slate-400 font-mono">
                    ({selectedOrgForEdit.name})
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Modifica los datos comerciales, financieros y límites de sucursales
                </p>
              </div>
            </div>

            {/* Error si ocurre */}
            {editOrgError && (
              <div className="mb-5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{editOrgError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateOrganization} className="space-y-4">
              {/* Nombre del Comercio (Interno) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre del Comercio (Interno) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Supermercado El Trébol S.A."
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  disabled={isSubmittingEditOrg}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-500">Razón social o denominación interna en la plataforma.</span>
              </div>

              {/* Nombre para Marca Blanca */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre para Marca Blanca
                </label>
                <input
                  type="text"
                  placeholder="ej: SUPERMERCADO EL TRÉBOL"
                  value={editOrgWhiteLabelName}
                  onChange={(e) => setEditOrgWhiteLabelName(e.target.value)}
                  disabled={isSubmittingEditOrg}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-500">
                  Nombre de fantasía que se imprime arriba en los flejes y carteles A4.
                </span>
              </div>

              {/* Límite de Sucursales y Validación */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Límite de Sucursales Permitidas *
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {isLoadingBranchesCount ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                      </span>
                    ) : (
                      <span>Sucursales creadas: <strong className="text-white">{editOrgExistingBranchesCount}</strong></span>
                    )}
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={editOrgMaxBranches}
                  onChange={(e) => setEditOrgMaxBranches(Number(e.target.value))}
                  disabled={isSubmittingEditOrg}
                  className={`w-full bg-slate-950 border rounded-lg px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    editOrgMaxBranches < editOrgExistingBranchesCount
                      ? 'border-rose-500 focus:ring-rose-500/50'
                      : 'border-slate-800 focus:ring-sky-500/50 focus:border-sky-500'
                  }`}
                />

                {/* Advertencia si intenta asignar límite inferior a sucursales ya existentes */}
                {editOrgMaxBranches < editOrgExistingBranchesCount && (
                  <div className="mt-2 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg flex items-start gap-2 text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      El cliente ya posee <strong>{editOrgExistingBranchesCount}</strong> sucursales creadas. No puedes asignar un límite menor sin eliminar sucursales previas.
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-slate-500 block mt-1">
                  Define el cupo total de locales que puede habilitar esta organización.
                </span>
              </div>

              {/* Estado de Suscripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Estado de Suscripción *
                </label>
                <select
                  value={editOrgSubscriptionStatus}
                  onChange={(e) => setEditOrgSubscriptionStatus(e.target.value as 'active' | 'suspended')}
                  disabled={isSubmittingEditOrg}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 disabled:opacity-50 cursor-pointer"
                >
                  <option value="active">Activo (Habilitado para operar)</option>
                  <option value="suspended">Suspendido (Bloqueo por falta de pago)</option>
                </select>
                <span className="text-[10px] text-slate-500">
                  Si se suspende, los repositores y la estación de impresión serán bloqueados automáticamente.
                </span>
              </div>

              {/* Cuota Mensual y Próxima Fecha de Cobro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Cuota Mensual ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      placeholder="25000"
                      value={editOrgMonthlyFee}
                      onChange={(e) => setEditOrgMonthlyFee(Number(e.target.value))}
                      disabled={isSubmittingEditOrg}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 disabled:opacity-50"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Monto del cobro mensual recurrente.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Próxima Fecha de Cobro
                  </label>
                  <input
                    type="date"
                    value={editOrgNextBillingDate}
                    onChange={(e) => setEditOrgNextBillingDate(e.target.value)}
                    disabled={isSubmittingEditOrg}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-500">Fecha de vencimiento de la suscripción.</span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOrgModalOpen(false);
                    setSelectedOrgForEdit(null);
                  }}
                  disabled={isSubmittingEditOrg}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingEditOrg ||
                    editOrgMaxBranches < editOrgExistingBranchesCount ||
                    editOrgMaxBranches < 1
                  }
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg shadow-md shadow-sky-950 flex items-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingEditOrg ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando Cambios...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gestión de Repositores y Códigos PIN */}
      {selectedClientForRepos && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
            {/* Botón Cerrar */}
            <button
              onClick={() => setSelectedClientForRepos(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header del Modal */}
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Gestión de Cliente</span>
                  <span className="text-xs font-normal text-slate-400">
                    • {selectedClientForRepos.name}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Administra las sucursales habilitadas y los códigos PIN para repositores
                </p>
              </div>
            </div>

            {/* Selector de Pestañas (Tabs) */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalTab('branches')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeModalTab === 'branches'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>
                  Sucursales ({branchesForClient.length} / {selectedClientForRepos.max_branches ?? 1})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('repositores')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeModalTab === 'repositores'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Repositores y PINs ({reposList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('branding')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeModalTab === 'branding'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Marca Blanca & Direcciones</span>
              </button>
            </div>

            {/* Error general si falla la carga */}
            {reposModalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{reposModalError}</span>
              </div>
            )}

            {/* PESTAÑA 1: GESTIÓN DE SUCURSALES */}
            {activeModalTab === 'branches' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {(() => {
                  const maxBranches = selectedClientForRepos.max_branches ?? 1;
                  const isLimitReached = branchesForClient.length >= maxBranches;

                  return (
                    <>
                      {/* Alerta de Límite de Sucursales según el Plan */}
                      {isLimitReached ? (
                        <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="font-semibold">
                              Límite de sucursales alcanzado según el plan ({branchesForClient.length} de {maxBranches}).
                            </span>
                          </div>
                          <span className="text-[10px] font-mono bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/60">
                            Plan: {maxBranches} máx.
                          </span>
                        </div>
                      ) : (
                        <div className="mb-4 p-2.5 px-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs flex items-center justify-between shrink-0">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            <span>
                              Sucursales habilitadas: <strong className="text-white">{branchesForClient.length}</strong> de <strong className="text-white">{maxBranches}</strong> permitidas por plan
                            </span>
                          </span>
                          <span className="text-[11px] text-emerald-400 font-semibold font-mono">
                            {maxBranches - branchesForClient.length} cupo(s) disponible(s)
                          </span>
                        </div>
                      )}

                      {/* Formulario Rápido: + Nueva Sucursal */}
                      <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 mb-4 shrink-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Nueva Sucursal</span>
                        </h4>

                        {branchFormError && (
                          <div className="mb-3 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{branchFormError}</span>
                          </div>
                        )}

                        <form onSubmit={handleCreateBranch} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                          <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Nombre de la Sucursal *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="ej: Sucursal Belgrano"
                              value={newBranchName}
                              onChange={(e) => setNewBranchName(e.target.value)}
                              disabled={isSubmittingBranch || isLimitReached}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-40"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmittingBranch || isLimitReached}
                            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-950 h-[34px] shrink-0"
                          >
                            {isSubmittingBranch ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Guardando...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Agregar Sucursal</span>
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Lista de Sucursales Registradas */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-slate-400" />
                            <span>Sucursales Registradas ({branchesForClient.length})</span>
                          </span>
                        </h4>

                        {branchesForClient.length === 0 ? (
                          <div className="py-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                            <Store className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-indigo-400" />
                            <p className="font-semibold text-slate-400">Sin sucursales registradas</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Agrega la primera sucursal para este comercio.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {branchesForClient.map((branch, idx) => (
                              <div
                                key={branch.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-100 text-xs">{branch.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">id: {branch.id}</p>
                                  </div>
                                </div>

                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  Activa
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* PESTAÑA 2: GESTIÓN DE REPOSITORES Y PINS */}
            {activeModalTab === 'repositores' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Formulario Rápido: Crear Nuevo PIN */}
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 mb-4 shrink-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Crear Nuevo PIN de Acceso</span>
                  </h4>

                  {repoFormError && (
                    <div className="mb-3 p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{repoFormError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateRepositor} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Nombre */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Nombre del Repositor *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej: Juan - Góndola"
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        disabled={isSubmittingRepo}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>

                    {/* Sucursal Dinámica */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Sucursal Asignada *
                      </label>
                      <select
                        value={newRepoBranchId}
                        onChange={(e) => setNewRepoBranchId(e.target.value)}
                        disabled={isSubmittingRepo || branchesForClient.length === 0}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        {branchesForClient.length === 0 ? (
                          <option value="">Sin sucursales</option>
                        ) : (
                          branchesForClient.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Código PIN */}
                    <div className="sm:col-span-4 flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          PIN (4 dígitos) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewRepoPin(generateRandomPin())}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                          title="Generar 4 números al azar no repetidos"
                        >
                          <Dices className="w-3 h-3" />
                          <span>Generar PIN</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          pattern="[0-9]{4}"
                          required
                          placeholder="ej: 7294"
                          value={newRepoPin}
                          onChange={(e) => setNewRepoPin(e.target.value.replace(/[^0-9]/g, ''))}
                          disabled={isSubmittingRepo}
                          className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-center font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingRepo || branchesForClient.length === 0}
                          className="flex-1 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-semibold py-2 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-amber-950"
                        >
                          {isSubmittingRepo ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>Guardar</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Lista de Repositores Existentes */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Repositores Activos ({reposList.length})</span>
                    </span>
                    {loadingRepos && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
                      </span>
                    )}
                  </h4>

                  {loadingRepos ? (
                    <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      <span>Consultando repositores autorizados...</span>
                    </div>
                  ) : reposList.length === 0 ? (
                    <div className="py-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                      <KeyRound className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-amber-400" />
                      <p className="font-semibold text-slate-400">No hay repositores registrados</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Utiliza el formulario superior para generar el primer PIN de acceso.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reposList.map((repo) => {
                        const branchName = branchMap.get(repo.branch_id) || 'Casa Central';
                        const isToggling = togglingRepoId === repo.id;
                        const isCopied = copiedPinId === repo.id;

                        return (
                          <div
                            key={repo.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              repo.is_active
                                ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                                : 'bg-slate-950/40 border-slate-900 opacity-60'
                            }`}
                          >
                            {/* Info Repositor */}
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                repo.is_active
                                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                                  : 'bg-slate-800 text-slate-500'
                              }`}>
                                {repo.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-100 text-xs">
                                    {repo.name}
                                  </span>
                                  {!repo.is_active && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                                      Inactivo
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                                  <span>{branchName}</span>
                                </p>
                              </div>
                            </div>

                            {/* PIN y Acciones */}
                            <div className="flex items-center gap-3">
                              {/* Badge de PIN visible con botón de copiar */}
                              <div
                                onClick={() => handleCopyPin(repo.pin, repo.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-mono font-bold text-xs shadow-inner cursor-pointer group"
                                title="Haz clic para copiar el PIN"
                              >
                                <span className="tracking-widest">{repo.pin}</span>
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 transition-colors" />
                                )}
                              </div>

                              {/* Alternar Activo/Inactivo */}
                              <button
                                onClick={() => handleToggleRepositorActive(repo)}
                                disabled={isToggling}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                                  repo.is_active
                                    ? 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border-amber-800/40'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                                }`}
                                title={repo.is_active ? 'Desactivar acceso temporalmente' : 'Reactivar acceso'}
                              >
                                {isToggling ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : repo.is_active ? (
                                  'Desactivar'
                                ) : (
                                  'Activar'
                                )}
                              </button>

                              {/* Eliminar */}
                              <button
                                onClick={() => handleDeleteRepositor(repo)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                                title="Eliminar repositor permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA 3: CONFIGURACIÓN DE MARCA BLANCA Y DIRECCIONES */}
            {activeModalTab === 'branding' && (
              <form onSubmit={handleSaveBranding} className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 space-y-4">
                {brandingSaveSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{brandingSaveSuccess}</span>
                  </div>
                )}

                {brandingSaveError && (
                  <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{brandingSaveError}</span>
                  </div>
                )}

                {/* 1. Nombre de Marca Blanca (Fantasía Comercial) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Palette className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Nombre de Marca Blanca (Cartelería y Flejes)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                    Este nombre de fantasía se imprimirá en el encabezado principal de los flejes térmicos, hojas A4 y carteles gigantes.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Nombre Comercial / Marca Blanca *
                    </label>
                    <input
                      type="text"
                      required
                      value={editWhiteLabelName}
                      onChange={(e) => setEditWhiteLabelName(e.target.value)}
                      disabled={isSavingBranding}
                      placeholder="ej: SUPERMERCADO EL SOL"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>

                {/* 2. Direcciones Físicas de cada Sucursal */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Sucursales y Direcciones Físicas ({editBranchesList.length})
                      </h4>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    La dirección física se muestra visiblemente en el pie o subtítulo de cada fleje impreso para identificar el local.
                  </p>

                  {editBranchesList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      Este comercio no tiene sucursales registradas aún. Agrégalas desde la pestaña "Sucursales".
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {editBranchesList.map((branch, index) => (
                        <div
                          key={branch.id}
                          className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-3 items-start md:items-center"
                        >
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Nombre de Sucursal #{index + 1}
                            </label>
                            <input
                              type="text"
                              required
                              value={branch.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditBranchesList((prev) =>
                                  prev.map((b) => (b.id === branch.id ? { ...b, name: val } : b))
                                );
                              }}
                              disabled={isSavingBranding}
                              placeholder="ej: Sucursal Centro"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                          </div>

                          <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Dirección Física (Calle, Altura, Localidad)
                            </label>
                            <input
                              type="text"
                              value={branch.address}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditBranchesList((prev) =>
                                  prev.map((b) => (b.id === branch.id ? { ...b, address: val } : b))
                                );
                              }}
                              disabled={isSavingBranding}
                              placeholder="ej: Av. Corrientes 1234, CABA"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón Guardar Cambios */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSavingBranding}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-950/60 disabled:opacity-50"
                  >
                    {isSavingBranding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando cambios...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar Cambios de Marca Blanca y Sucursales</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Footer Modal */}
            <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <span>Configuración de sucursales y accesos protegida por God Mode.</span>
              <button
                onClick={() => setSelectedClientForRepos(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
