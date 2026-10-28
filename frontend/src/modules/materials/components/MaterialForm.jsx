import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Save, X, QrCode, ShieldAlert, Sparkles, CheckCircle2, AlertCircle, Info, Layers } from 'lucide-react';
import { useConfirmAction } from '../../../providers/ConfirmProvider';
import { TFAlert, TFButton, TFCard, TFCardContent, TFInput, TFSelect, TFTextarea } from '../../../components/tf-ui';
import MasterDataActionDialog from '../../../components/shared/MasterDataActionDialog';
import { useAuthStore } from '../../../store/authStore';

import {
  useMaterialFamiliesQuery,
  useMaterialCodesQuery,
  useMaterialTypesQuery,
  useMaterialBrandsQuery,
  useOperationalAreasQuery,
  useRankingsQuery,
  useMaterialsQuery,
  useMaterialUnitsQuery,
  useActiveTagsQuery
} from '../hooks/useMaterialsQueries';

export const parseArticleAndName = (input, existingCodes = []) => {
  if (!input || typeof input !== 'string') {
    return {
      rawInput: '',
      articleCode: '',
      articleName: '',
      matchedCodeObj: null,
      isExistingCode: false,
      isValid: false
    };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      rawInput: input,
      articleCode: '',
      articleName: '',
      matchedCodeObj: null,
      isExistingCode: false,
      isValid: false
    };
  }

  // 1. Standard pattern: "PAP-001 PAPEL HIGIENICO 400 MT" or "PAP-001 - PAPEL..."
  const standardPattern = /^([A-Za-z0-9]{2,6}-\d{1,4})[\s\-:_.]*(.*)$/i;
  const standardMatch = trimmed.match(standardPattern);

  // 2. No-hyphen pattern: "PAP001 PAPEL HIGIENICO 400 MT" -> "PAP-001"
  const noHyphenPattern = /^([A-Za-z]{2,5})(\d{1,4})[\s\-:_.]*(.*)$/i;
  const noHyphenMatch = !standardMatch ? trimmed.match(noHyphenPattern) : null;

  let detectedCode = '';
  let detectedName = '';

  if (standardMatch) {
    detectedCode = standardMatch[1].toUpperCase();
    detectedName = standardMatch[2].trim();
  } else if (noHyphenMatch) {
    detectedCode = `${noHyphenMatch[1].toUpperCase()}-${noHyphenMatch[2]}`;
    detectedName = noHyphenMatch[3].trim();
  } else {
    // 3. Match against known catalog codes
    const upperInput = trimmed.toUpperCase();
    const exactCode = existingCodes.find(c => c.code && c.code.toUpperCase() === upperInput);
    if (exactCode) {
      detectedCode = exactCode.code.toUpperCase();
      detectedName = exactCode.name || '';
    } else {
      const prefixCode = existingCodes.find(c => c.code && upperInput.startsWith(c.code.toUpperCase()));
      if (prefixCode) {
        detectedCode = prefixCode.code.toUpperCase();
        detectedName = trimmed.substring(prefixCode.code.length).replace(/^[\s\-:_.]+/, '').trim() || prefixCode.name || '';
      } else {
        detectedName = trimmed;
      }
    }
  }

  // Find in catalog if code detected
  let matchedCodeObj = null;
  if (detectedCode) {
    matchedCodeObj = existingCodes.find(c => c.code && c.code.toUpperCase() === detectedCode) || null;
  }

  // If code matched an existing catalog entry and no new name was typed, inherit the catalog name
  if (matchedCodeObj && !detectedName) {
    detectedName = matchedCodeObj.name || '';
  }

  return {
    rawInput: input,
    articleCode: detectedCode,
    articleName: detectedName,
    matchedCodeObj,
    isExistingCode: Boolean(matchedCodeObj),
    isValid: Boolean(detectedCode && (detectedName || matchedCodeObj))
  };
};

const MaterialForm = ({
  initialData = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
  onDeactivate,
}) => {
  const { confirm } = useConfirmAction();
  const isEditing = Boolean(initialData?.id);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const { user } = useAuthStore();
  const role = user?.role;
  const roleCode = String(typeof role === 'string' ? role : role?.code || '').trim().toUpperCase();
  const roleName = String(typeof role === 'object' ? role?.name || '' : '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  const canEditRestrictedFields = ['ADMIN_ALM', 'ADMIN_ALMACEN'].includes(roleCode)
    || roleName === 'ADMINISTRADOR DE ALMACEN';

  const { data: familiesData } = useMaterialFamiliesQuery({ pageSize: 10000 });
  const { data: codesData } = useMaterialCodesQuery({ pageSize: 10000 });
  const { data: typesData } = useMaterialTypesQuery({ pageSize: 10000 });
  const { data: brandsData } = useMaterialBrandsQuery({ pageSize: 10000 });
  const { data: locationsData } = useOperationalAreasQuery({ pageSize: 10000 });
  const { data: unitsData } = useMaterialUnitsQuery({ pageSize: 10000 });
  const { data: rankingsData } = useRankingsQuery();
  const { data: tagsData } = useActiveTagsQuery();

  const families = familiesData?.items || [];
  const codes = codesData?.items || [];
  const types = typesData?.items || [];
  const brands = brandsData?.items || [];
  const locations = locationsData?.items || [];
  const units = unitsData?.items || [];
  const rankings = rankingsData?.items || [];
  const activeTags = tagsData || [];

  const [formData, setFormData] = useState({
    ranking_id: initialData?.ranking_id || '',
    family_uuid: initialData?.family?.uuid || (initialData?.family?.id ? String(initialData.family.id) : (initialData?.family_id ? String(initialData.family_id) : '')),
    material_code_uuid: initialData?.material_code?.uuid || (initialData?.material_code?.id ? String(initialData.material_code.id) : (initialData?.material_code_id ? String(initialData.material_code_id) : '')),
    type_uuid: initialData?.type?.uuid || (initialData?.type?.id ? String(initialData.type.id) : (initialData?.type_id ? String(initialData.type_id) : '')),
    brand_uuid: initialData?.brand?.uuid || (initialData?.brand?.id ? String(initialData.brand.id) : (initialData?.brand_id ? String(initialData.brand_id) : '')),
    base_unit_uuid: initialData?.base_unit?.uuid || (initialData?.base_unit?.id ? String(initialData.base_unit.id) : (initialData?.base_unit_id ? String(initialData.base_unit_id) : '')),
    location_uuid: initialData?.default_location?.uuid || (initialData?.default_location?.id ? String(initialData.default_location.id) : (initialData?.default_location_id ? String(initialData.default_location_id) : '')),
    name: initialData?.name || '',
    description: initialData?.description || '',
    minimum_stock: initialData?.minimum_stock ?? '',
    maximum_stock: initialData?.maximum_stock ?? '',
    reorder_point: initialData?.reorder_point ?? '',
    tags: initialData?.tags?.map(t => t.uuid || t.id) || [],
    is_active: initialData?.is_active ?? true,
  });

  // State for unified article + name field
  const [combinedInput, setCombinedInput] = useState(() => {
    if (initialData) {
      const code = initialData.material_code?.code || '';
      const name = initialData.name || '';
      return code ? `${code} ${name}`.trim() : name;
    }
    return '';
  });
  const [isManualSeparated, setIsManualSeparated] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputContainerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  // Parse combined input in real-time
  const parsedArticle = useMemo(() => {
    return parseArticleAndName(combinedInput, codes);
  }, [combinedInput, codes]);

  // Autocomplete suggestions for catalog articles
  const suggestions = useMemo(() => {
    if (!combinedInput || combinedInput.trim().length < 2 || isManualSeparated) return [];
    const query = combinedInput.trim().toUpperCase();
    return codes
      .filter(c => {
        const codeMatch = c.code && c.code.toUpperCase().includes(query);
        const nameMatch = c.name && c.name.toUpperCase().includes(query);
        return codeMatch || nameMatch;
      })
      .slice(0, 6);
  }, [combinedInput, codes, isManualSeparated]);

  const updateDropdownPosition = () => {
    if (inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 999999,
      });
    }
  };

  useEffect(() => {
    if (showSuggestions && suggestions.length > 0) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [showSuggestions, suggestions.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputContainerRef.current && !inputContainerRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item) => {
    const text = `${item.code} ${item.name || ''}`.trim();
    setCombinedInput(text);
    updateField('material_code_uuid', item.uuid);
    updateField('name', item.name || '');
    setShowSuggestions(false);
  };

  // Fetch materials for the selected family to dynamically filter/recommend Types and Brands
  const { data: familyMaterialsData } = useMaterialsQuery({
    family_uuid: formData.family_uuid || 'none',
    limit: 'all',
  });
  const familyMaterials = familyMaterialsData?.items || [];
  
  const validTypeUuids = new Set(familyMaterials.map(m => m.type?.uuid).filter(Boolean));
  const validBrandUuids = new Set(familyMaterials.map(m => m.brand?.uuid).filter(Boolean));
  
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (initialData) {
      const code = initialData.material_code?.code || '';
      const name = initialData.name || '';
      setCombinedInput(code ? `${code} ${name}`.trim() : name);

      setFormData((current) => ({
        ...current,
        ranking_id: initialData?.ranking_id || current.ranking_id,
        family_uuid: initialData?.family?.uuid || (initialData?.family?.id ? String(initialData.family.id) : (initialData?.family_id ? String(initialData.family_id) : current.family_uuid)),
        material_code_uuid: initialData?.material_code?.uuid || (initialData?.material_code?.id ? String(initialData.material_code.id) : (initialData?.material_code_id ? String(initialData.material_code_id) : current.material_code_uuid)),
        type_uuid: initialData?.type?.uuid || (initialData?.type?.id ? String(initialData.type.id) : (initialData?.type_id ? String(initialData.type_id) : current.type_uuid)),
        brand_uuid: initialData?.brand?.uuid || (initialData?.brand?.id ? String(initialData.brand.id) : (initialData?.brand_id ? String(initialData.brand_id) : current.brand_uuid)),
        location_uuid: initialData?.default_location?.uuid || (initialData?.default_location?.id ? String(initialData.default_location.id) : (initialData?.default_location_id ? String(initialData.default_location_id) : current.location_uuid)),
        base_unit_uuid: initialData?.base_unit?.uuid || (initialData?.base_unit?.id ? String(initialData.base_unit.id) : (initialData?.base_unit_id ? String(initialData.base_unit_id) : current.base_unit_uuid)),
        name: initialData.name || current.name,
        description: initialData.description || current.description,
        minimum_stock: initialData.minimum_stock ?? current.minimum_stock,
        maximum_stock: initialData.maximum_stock ?? current.maximum_stock,
        reorder_point: initialData.reorder_point ?? current.reorder_point,
        tags: initialData.tags?.map(t => t.uuid || String(t.id)) || current.tags,
        is_active: initialData.is_active ?? current.is_active,
      }));
    }
  }, [initialData]);

  // Robust fallback: if initialData only provided an ID, find its UUID once the catalogues load
  useEffect(() => {
    const locId = initialData?.default_location?.id || initialData?.default_location_id;
    if (locId && locations.length > 0) {
      if (formData.location_uuid === String(locId)) {
        const item = locations.find(x => String(x.id) === String(locId));
        if (item && item.uuid) updateField('location_uuid', item.uuid);
      }
    }
  }, [initialData, locations, formData.location_uuid]);

  useEffect(() => {
    const codeId = initialData?.material_code?.id || initialData?.material_code_id;
    if (codeId && codes.length > 0) {
      if (formData.material_code_uuid === String(codeId)) {
        const item = codes.find(x => String(x.id) === String(codeId));
        if (item && item.uuid) updateField('material_code_uuid', item.uuid);
      }
    }
  }, [initialData, codes, formData.material_code_uuid]);

  useEffect(() => {
    const typeId = initialData?.type?.id || initialData?.type_id;
    if (typeId && types.length > 0) {
      if (formData.type_uuid === String(typeId)) {
        const item = types.find(x => String(x.id) === String(typeId));
        if (item && item.uuid) updateField('type_uuid', item.uuid);
      }
    }
  }, [initialData, types, formData.type_uuid]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const familyOptions = families.map(f => ({ value: f.uuid || String(f.id), label: `${f.code} - ${f.name}` }));
  const codeOptions = codes.map(c => ({ value: c.uuid || String(c.id), label: `${c.code} - ${c.name}` }));
  
  // Group Types by Recommended (used by family) and Others
  const recommendedTypes = types.filter(t => validTypeUuids.has(t.uuid || String(t.id)));
  const otherTypes = types.filter(t => !validTypeUuids.has(t.uuid || String(t.id)));
  const typeOptions = formData.family_uuid ? [
    ...recommendedTypes.map(t => ({ value: t.uuid || String(t.id), label: `⭐ ${t.name}` })),
    ...(otherTypes.length > 0 ? [{ value: 'SEP_1', label: '--- Otros Tipos ---', disabled: true }] : []),
    ...otherTypes.map(t => ({ value: t.uuid || String(t.id), label: t.name }))
  ] : types.map(t => ({ value: t.uuid || String(t.id), label: t.name }));

  // Group Brands by Recommended (used by family) and Others
  const recommendedBrands = brands.filter(b => validBrandUuids.has(b.uuid || String(b.id)));
  const otherBrands = brands.filter(b => !validBrandUuids.has(b.uuid || String(b.id)));
  const brandOptions = formData.family_uuid ? [
    ...recommendedBrands.map(b => ({ value: b.uuid || String(b.id), label: `⭐ ${b.name}` })),
    ...(otherBrands.length > 0 ? [{ value: 'SEP_2', label: '--- Otras Marcas ---', disabled: true }] : []),
    ...otherBrands.map(b => ({ value: b.uuid || String(b.id), label: b.name }))
  ] : brands.map(b => ({ value: b.uuid || String(b.id), label: b.name }));

  const locationOptions = locations.map(l => ({ 
    value: l.uuid || String(l.id), 
    label: `${l.code} - ${l.name}` 
  }));

  const unitOptions = units.map(u => ({ value: u.uuid || String(u.id), label: `${u.code} - ${u.name}` }));
  const rankingOptions = rankings.map(r => ({ value: String(r.id), label: `${r.nomenclature} - ${r.name}` }));

  const selectedFamily = families.find(f => f.uuid === formData.family_uuid);
  const selectedCode = codes.find(c => c.uuid === formData.material_code_uuid);

  // Vista Previa visual del Código del Material
  const previewCode = useMemo(() => {
    if (isEditing && initialData?.internal_code) return initialData.internal_code;
    let famCode = '[FAMILIA]';
    if (selectedFamily) {
      famCode = selectedFamily.code.replace(/[\s-]+$/, '');
    } else if (formData.family_uuid && formData.family_uuid.startsWith('NEW:')) {
      const rawFam = formData.family_uuid.replace('NEW:', '').trim().toUpperCase();
      if (rawFam.includes('-')) {
        famCode = rawFam.split('-')[0].trim().replace(/[^A-Z0-9]/g, '');
      } else {
        const words = rawFam.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          famCode = words.map(w => w[0]).join('').slice(0, 4);
        } else {
          famCode = rawFam.replace(/[^A-Z0-9]/g, '').slice(0, 4);
        }
      }
      if (!famCode) famCode = 'FAM';
    }

    const effectiveArticleCode = isManualSeparated
      ? (selectedCode ? selectedCode.code : '[ARTICULO]')
      : (parsedArticle.articleCode || (selectedCode ? selectedCode.code : '[ARTICULO]'));
    return `${famCode}-${effectiveArticleCode}-XXX`.replace(/-+/g, '-');
  }, [selectedFamily, selectedCode, parsedArticle, isEditing, initialData, isManualSeparated, formData.family_uuid]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const isNewFamily = formData.family_uuid && formData.family_uuid.startsWith('NEW:');
    const isNewType = formData.type_uuid && formData.type_uuid.startsWith('NEW:');
    const isNewBrand = formData.brand_uuid && formData.brand_uuid.startsWith('NEW:');
    const isNewUnit = formData.base_unit_uuid && String(formData.base_unit_uuid).startsWith('NEW:');

    const selectedFamilyObj = families.find(f => f.uuid === formData.family_uuid);
    const matchedRanking = selectedFamilyObj ? rankings.find(r => r.nomenclature === selectedFamilyObj.code) : null;
    const finalRankingId = matchedRanking ? matchedRanking.id : (formData.ranking_id || rankings[0]?.id || null);

    const effectiveArticleCode = isManualSeparated
      ? (selectedCode ? selectedCode.code : '')
      : parsedArticle.articleCode;

    const effectiveName = isManualSeparated
      ? formData.name.trim()
      : (parsedArticle.articleName || formData.name).trim();

    const effectiveCodeUuid = isManualSeparated
      ? formData.material_code_uuid
      : (parsedArticle.matchedCodeObj?.uuid || formData.material_code_uuid || null);

    if (!formData.family_uuid) {
      setFormError('Por favor selecciona o escribe una Familia.');
      return;
    }

    if (!effectiveArticleCode && !effectiveCodeUuid) {
      setFormError('Por favor ingresa el código del Artículo / Consecutivo (ej. PAP-001) o selecciona uno.');
      return;
    }

    if (!effectiveName) {
      setFormError('Por favor ingresa el Nombre del Material.');
      return;
    }

    setFormError(null);

    const payload = {
      ranking_id: finalRankingId ? parseInt(finalRankingId, 10) : undefined,
      family_uuid: isNewFamily ? undefined : (formData.family_uuid || undefined),
      new_family_name: isNewFamily ? formData.family_uuid.replace('NEW:', '') : undefined,

      material_code_uuid: effectiveCodeUuid || undefined,
      article_code: effectiveArticleCode || undefined,
      article_name: effectiveName,

      type_uuid: isNewType ? undefined : (formData.type_uuid || null),
      new_type_name: isNewType ? formData.type_uuid.replace('NEW:', '') : undefined,

      brand_uuid: isNewBrand ? undefined : (formData.brand_uuid || null),
      new_brand_name: isNewBrand ? formData.brand_uuid.replace('NEW:', '') : undefined,

      base_unit_uuid: isNewUnit ? undefined : (formData.base_unit_uuid || null),
      new_unit_name: isNewUnit ? String(formData.base_unit_uuid).replace('NEW:', '') : undefined,

      location_uuid: formData.location_uuid || null,
      name: effectiveName,
      description: formData.description.trim() || null,
      minimum_stock: formData.minimum_stock !== '' ? Number(formData.minimum_stock) : undefined,
      maximum_stock: formData.maximum_stock !== '' ? Number(formData.maximum_stock) : null,
      reorder_point: formData.reorder_point !== '' ? Number(formData.reorder_point) : undefined,
      tags: formData.tags,
    };

    if (isEditing) {
      payload.is_active = Boolean(formData.is_active);
    }

    confirm({
      title: isEditing ? 'Guardar Cambios' : 'Registrar Material',
      message: '¿Está seguro de guardar la información de este material?',
      confirmText: 'Sí, guardar',
      variant: 'primary',
      action: async () => {
        if (onSubmit) {
          await onSubmit(payload);
        }
      }
    });
  };

  return (
    <form className="flex flex-col h-full overflow-hidden" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
        {formError && (
          <TFAlert variant="danger" title="Revisa el formulario" message={formError} />
        )}

        {/* TARJETA VISUAL DE CÓDIGO INTERNO COMPACTA INDUSTRIAL */}
        <div 
          className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between gap-3 animate-form-field" 
          style={{ '--stagger': 1 }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <QrCode size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Nomenclatura QR Prevista
              </span>
              <span className="font-mono font-black text-sm sm:text-base md:text-lg text-primary tracking-wide truncate block">
                {previewCode}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right shrink-0">
            <span className="text-[10px] text-muted-foreground/80 leading-tight">
              El consecutivo real
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              se asignará al guardar
            </span>
          </div>
        </div>

        {/* FILA 1: FAMILIA Y ARTICULO/NOMBRE */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 animate-form-field [&>*]:min-w-0 relative z-30" style={{ '--stagger': 2 }}>
          {/* COLUMNA 1: FAMILIA */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between h-6 mb-1">
              <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                Familia / Categoría *
              </span>
              {selectedFamily && (
                <span className="text-[10px] sm:text-[11px] font-mono text-primary font-bold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                  {selectedFamily.code}
                </span>
              )}
            </div>
            
            <TFSelect
              name="family_uuid"
              placeholder="Selecciona o escribe una Familia"
              value={formData.family_uuid}
              onChange={(e) => updateField('family_uuid', e.target.value)}
              options={familyOptions}
              disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
              allowCreate={!isEditing}
              createLabel="Nueva Familia"
              required
            />

            <div className="h-6 mt-1 flex items-center text-xs overflow-hidden">
              {formData.family_uuid?.startsWith('NEW:') ? (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate flex items-center gap-1">
                  <Sparkles size={12} className="shrink-0 text-amber-500" />
                  <span>Nueva Familia: <strong>{formData.family_uuid.replace('NEW:', '')}</strong></span>
                </span>
              ) : selectedFamily ? (
                <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <span className="text-muted-foreground/60">Familia:</span>
                  <strong className="text-foreground font-semibold truncate">{selectedFamily.name}</strong>
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/50 truncate">Filtra catálogo o escribe para crear nueva</span>
              )}
            </div>
          </div>

          {/* COLUMNA 2: ARTÍCULO Y NOMBRE (O CAMPOS SEPARADOS) */}
          {isManualSeparated ? (
            <div className="flex flex-col">
              <div className="flex items-center justify-between h-6 mb-1">
                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                  Artículo / Consecutivo *
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualSeparated(false)}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 shrink-0"
                >
                  <Sparkles size={11} /> <span>Unificar</span>
                </button>
              </div>

              <TFSelect
                name="material_code_uuid"
                placeholder="Selecciona el Artículo"
                value={formData.material_code_uuid}
                onChange={(e) => updateField('material_code_uuid', e.target.value)}
                options={codeOptions}
                disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
                required
              />

              <div className="h-6 mt-1 flex items-center text-xs overflow-hidden">
                <span className="text-[11px] text-muted-foreground/70 truncate">
                  Modo clásico de selección de artículo
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between h-6 mb-1">
                <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                  Artículo y Nombre *
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualSeparated(true)}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded hover:bg-muted shrink-0"
                  title="Separar en dos campos tradicionales"
                >
                  <Layers size={11} /> <span>Separar</span>
                </button>
              </div>

              <div className="relative" ref={inputContainerRef}>
                <TFInput
                  name="combined_article_name"
                  placeholder="Ej. PAP-001 PAPEL HIGIENICO 400 MT"
                  value={combinedInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCombinedInput(val);
                    setShowSuggestions(true);
                    updateDropdownPosition();
                    const parsed = parseArticleAndName(val, codes);
                    if (parsed.matchedCodeObj) {
                      updateField('material_code_uuid', parsed.matchedCodeObj.uuid);
                    } else {
                      updateField('material_code_uuid', '');
                    }
                    updateField('name', parsed.articleName || val);
                  }}
                  onFocus={() => {
                    setShowSuggestions(true);
                    updateDropdownPosition();
                  }}
                  disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
                  required
                />

                {/* Autocomplete Suggestions Dropdown rendered in portal */}
                {showSuggestions && suggestions.length > 0 && typeof document !== 'undefined' && createPortal(
                  <div
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="bg-card text-card-foreground border-2 border-border shadow-2xl rounded-xl overflow-hidden divide-y divide-border animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="px-3 py-1.5 bg-muted text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>Artículos existentes en catálogo</span>
                      <span className="text-[10px] font-normal lowercase">Clic para usar</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {suggestions.map((item) => (
                        <button
                          key={item.uuid || item.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(item);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 text-[11px] shrink-0 border border-primary/20">
                              {item.code}
                            </span>
                            <span className="text-card-foreground truncate font-medium group-hover:text-primary transition-colors">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 font-semibold shrink-0">
                            Seleccionar
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              </div>

              {/* Status and Badges */}
              <div className="h-6 mt-1 flex items-center text-xs overflow-hidden">
                {parsedArticle.articleCode ? (
                  <div className="flex items-center gap-1.5 overflow-hidden flex-nowrap">
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shrink-0">
                      {parsedArticle.articleCode}
                    </span>
                    {parsedArticle.isExistingCode ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 truncate">
                        <CheckCircle2 size={12} className="shrink-0" />
                        <span>Existente en catálogo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0 truncate">
                        <Sparkles size={12} className="shrink-0" />
                        <span>Nuevo artículo</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/60 truncate">
                    💡 Formato: <strong className="font-mono text-foreground font-semibold">CÓDIGO</strong> DESCRIPCIÓN
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* If separated, show Nombre del Material in its own row */}
        {isManualSeparated && (
          <div className="animate-form-field" style={{ '--stagger': 2.5 }}>
            <TFInput
              label="Nombre del Material *"
              name="name"
              placeholder="Ej. Lentes de seguridad oscuros"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
              required
            />
          </div>
        )}

        {/* FILA 2: TIPO Y LOCALIDAD */}
        <div className="grid gap-2.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 animate-form-field [&>*]:min-w-0 relative z-20" style={{ '--stagger': 3 }}>
          <div>
            <TFSelect
              label="Tipo de Material"
              name="type_uuid"
              placeholder="Selecciona o escribe Tipo (Opcional)"
              value={formData.type_uuid}
              onChange={(e) => updateField('type_uuid', e.target.value)}
              options={typeOptions}
              disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
              allowCreate={!isEditing}
              createLabel="Nuevo Tipo"
            />
            {formData.type_uuid?.startsWith('NEW:') && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500 shrink-0" />
                <span>Nuevo Tipo: <strong>{formData.type_uuid.replace('NEW:', '')}</strong></span>
              </span>
            )}
          </div>

          <TFSelect
            label="Localidad Sugerida"
            name="location_uuid"
            placeholder="Selecciona Localidad (Opcional)"
            value={formData.location_uuid}
            onChange={(e) => updateField('location_uuid', e.target.value)}
            options={locationOptions}
            disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
          />
        </div>

        {/* FILA 3: UNIDAD Y MARCA (2 COLUMNAS EN MOBILE) */}
        <div className="grid gap-2.5 sm:gap-4 grid-cols-2 animate-form-field [&>*]:min-w-0 relative z-10" style={{ '--stagger': 3.5 }}>
          <div>
            <TFSelect
              label="Unidad Base"
              name="base_unit_uuid"
              placeholder="Unidad..."
              value={formData.base_unit_uuid}
              onChange={(e) => updateField('base_unit_uuid', e.target.value)}
              options={unitOptions}
              disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
              allowCreate={!isEditing}
              createLabel="Nueva Unidad"
            />
            {String(formData.base_unit_uuid)?.startsWith('NEW:') && (
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500 shrink-0" />
                <span className="truncate">Nueva Unidad: <strong>{String(formData.base_unit_uuid).replace('NEW:', '')}</strong></span>
              </span>
            )}
          </div>

          <div>
            <TFSelect
              label="Marca"
              name="brand_uuid"
              placeholder="Marca..."
              value={formData.brand_uuid}
              onChange={(e) => updateField('brand_uuid', e.target.value)}
              options={brandOptions}
              disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
              allowCreate={!isEditing}
              createLabel="Nueva Marca"
            />
            {formData.brand_uuid?.startsWith('NEW:') && (
              <span className="text-[10px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500 shrink-0" />
                <span className="truncate">Nueva Marca: <strong>{formData.brand_uuid.replace('NEW:', '')}</strong></span>
              </span>
            )}
          </div>
        </div>

        {/* FILA 4: STOCK Y REORDEN (2 COLUMNAS EN MOBILE) */}
        <div className="grid gap-2.5 sm:gap-4 grid-cols-1 sm:grid-cols-3 animate-form-field relative z-10" style={{ '--stagger': 4 }}>
          <TFInput
            label="Stock Mínimo"
            name="minimum_stock"
            type="number"
            placeholder="0.00"
            value={formData.minimum_stock}
            onChange={(e) => updateField('minimum_stock', e.target.value)}
            disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
          />

          <TFInput
            label="Stock Máximo"
            name="maximum_stock"
            type="number"
            placeholder="Sin límite"
            value={formData.maximum_stock}
            onChange={(e) => updateField('maximum_stock', e.target.value)}
            disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
          />

          <TFInput
            label="Alerta de Stock"
            name="reorder_point"
            type="number"
            placeholder="0.00"
            value={formData.reorder_point}
            onChange={(e) => updateField('reorder_point', e.target.value)}
            disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
          />
        </div>

        {/* ETIQUETAS */}
        <div className="animate-form-field" style={{ '--stagger': 4.5 }}>
          <TFSelect
            label="Etiquetas (Opcional)"
            name="tags"
            placeholder="Buscar etiquetas..."
            value={formData.tags}
            onChange={(e) => updateField('tags', e.target.value)}
            options={activeTags.map(tag => ({
              value: tag.uuid || String(tag.id),
              label: tag.name
            }))}
            isMulti={true}
            allowCreate={!isEditing}
            createLabel="Nueva Etiqueta"
            disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
          />
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.tags.map(tagId => {
                const isNew = String(tagId).startsWith('NEW:');
                const tag = !isNew ? activeTags.find(t => (t.uuid || String(t.id)) === tagId) : null;
                if (!isNew && !tag) return null;
                const tagName = isNew ? String(tagId).replace('NEW:', '') : tag.name;
                const tagColor = isNew ? '#F59E0B' : (tag.color || '#3B82F6');
                return (
                  <div key={tagId} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border transition-all" style={{ backgroundColor: `${tagColor}15`, borderColor: `${tagColor}30`, color: tagColor }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tagColor }} />
                    {isNew && <Sparkles size={11} className="text-amber-500 shrink-0" />}
                    <span>{tagName}</span>
                    {isNew && <span className="text-[9px] bg-amber-500 text-white dark:text-black px-1 rounded font-black tracking-wider">NUEVA</span>}
                    <button
                      type="button"
                      disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
                      onClick={() => updateField('tags', formData.tags.filter(id => id !== tagId))}
                      className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      title="Quitar etiqueta"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DESCRIPCIÓN COMPACTA */}
        <TFTextarea
          label="Descripción"
          name="description"
          placeholder="Características adicionales, empaque, uso..."
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
          containerClassName="animate-form-field"
          className="min-h-[58px] sm:min-h-[72px] h-16 sm:h-20 text-sm"
          style={{ '--stagger': 5 }}
        />

        {/* RECORDATORIO PREVIO DE SUB-CATÁLOGOS NUEVOS */}
        {((formData.family_uuid && formData.family_uuid.startsWith('NEW:')) ||
          (formData.type_uuid && formData.type_uuid.startsWith('NEW:')) ||
          (formData.brand_uuid && formData.brand_uuid.startsWith('NEW:')) ||
          (formData.base_unit_uuid && String(formData.base_unit_uuid).startsWith('NEW:')) ||
          (formData.tags && formData.tags.some(t => String(t).startsWith('NEW:'))) ||
          (parsedArticle.articleCode && !parsedArticle.isExistingCode)) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5 animate-form-field">
            <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block text-foreground">
                Se crearán nuevos registros maestros automáticamente
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                Al guardar este material, los subcatálogos marcados como nuevos se crearán en la base de datos. Recuerda ingresar a sus respectivos subcatálogos para completar la información técnica y descripciones.
              </span>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS - BOTONES EN FILA COMPACTA */}
        <div className="flex flex-row items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 mt-2 sm:mt-4 border-t border-border animate-form-field" style={{ '--stagger': 6 }}>
          {isEditing && onDeactivate && initialData?.is_active && (
            <TFButton
              variant="danger"
              icon={ShieldAlert}
              type="button"
              onClick={() => setIsActionDialogOpen(true)}
              disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
              className="flex-1 sm:flex-initial sm:mr-auto h-10 sm:h-11 text-xs sm:text-sm"
            >
              Estado
            </TFButton>
          )}
          <TFButton 
            type="button" 
            variant="secondary" 
            onClick={onCancel} 
            disabled={isSubmitting || (isEditing && !canEditRestrictedFields)}
            className="flex-1 sm:flex-initial sm:min-w-[120px] h-10 sm:h-11 text-xs sm:text-sm"
          >
            Cancelar
          </TFButton>
          <TFButton 
            type="submit" 
            variant="primary"
            icon={Save} 
            isLoading={isSubmitting}
            className="flex-1 sm:flex-initial sm:min-w-[140px] h-10 sm:h-11 text-xs sm:text-sm font-bold"
          >
            {isEditing ? 'Guardar' : 'Crear material'}
          </TFButton>
        </div>

      </div>
      
      {isEditing && onDeactivate && (
        <MasterDataActionDialog
          open={isActionDialogOpen}
          item={initialData}
          title="Gestionar Estado del Material"
          itemLabel="Material seleccionado"
          isLoading={isSubmitting}
          onClose={() => setIsActionDialogOpen(false)}
          onConfirm={({ action, reason }) => {
             setIsActionDialogOpen(false);
             onDeactivate({ ...initialData, action, reason });
          }}
        />
      )}
    </form>
  );
};

export default MaterialForm;
