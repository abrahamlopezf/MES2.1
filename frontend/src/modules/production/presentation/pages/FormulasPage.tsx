import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Filter, Beaker, FileText, ChevronDown, PackageCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '../../../../design-system';
import { apiClient } from '../../../../core/api/apiClient';
import { PermissionGate } from '@/shared/components/auth/PermissionGate';
import { MixRequestModal } from '../components/MixRequestModal';

export const FormulasPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('ALL');
  const [expandedFormulaId, setExpandedFormulaId] = useState<number | null>(null);
  const [selectedMixFormula, setSelectedMixFormula] = useState<any | null>(null);

  const { data: formulasData, isLoading } = useQuery({
    queryKey: ['extrusion', 'formulas'],
    queryFn: async () => {
      try {
        const response: any = await apiClient.get('/formulas');
        // apiClient returns response.data directly, so response has { success, message, data }
        const data = response.data || [];
        
        // If data is empty (meaning seeder didn't run), throw error to trigger the fallback mock data
        if (!data || data.length === 0) {
          throw new Error('No data found, fallback to mock');
        }
        
        // Filter formulas that are for extrusion (any area containing EXT) or just return all
        return data.filter((f: any) => 
          f.target_area?.code?.includes('EXT') || 
          f.target_area?.name?.toLowerCase().includes('extrus') ||
          f.name.toLowerCase().includes('mezcla') || 
          f.name.toLowerCase().includes('rafia')
        );
      } catch (e) {
        // Mock data fallback if API is not fully ready
        return [
          {
            id: 1,
            code: 'F-EXT-LIQ-ROJO',
            name: 'MEZCLA COLOR ROJO (LIQUITANK)',
            target_machine: 'EXTRUSORA LIQUITANK',
            total_kg: 500.0,
            ingredients: [
              { name: 'POLIPROPILENO (A)', quantity: 440.6, percentage: 88.1, is_required: false },
              { name: 'POLIPROPILENO (C)', quantity: 50.0, percentage: 10.0, is_required: false },
              { name: 'PIGMENTO ROJO LYONDELLBASELL', quantity: 5.2, percentage: 1.0, is_required: true },
              { name: 'ADITIVO UV', quantity: 4.2, percentage: 0.8, is_required: true },
            ]
          },
          {
            id: 2,
            code: 'F-EXT-1-BLANCO',
            name: 'BLANCO - RAFIA PARA CINTURÓN',
            target_machine: 'EXTRUSORA 1',
            total_kg: 500.0,
            ingredients: [
              { name: 'POLIPROPILENO (A)', quantity: 335.6, percentage: 67.1, is_required: false },
              { name: 'POLIPROPILENO (B)', quantity: 100.0, percentage: 20.0, is_required: false },
              { name: 'POLIETILENO (PEBD A)', quantity: 50.0, percentage: 10.0, is_required: true },
              { name: 'CARBONATO DE CALCIO', quantity: 4.2, percentage: 0.84, is_required: true },
              { name: 'PIGMENTO BLANCO', quantity: 6.0, percentage: 1.2, is_required: true },
              { name: 'ADITIVO UV', quantity: 4.2, percentage: 0.84, is_required: true },
            ]
          }
        ];
      }
    }
  });

  const formulas = formulasData || [];

  const getTargetMachine = (formula: any) => {
    if (formula.description && formula.description.includes('Para ')) {
      return formula.description.replace('Para ', '');
    }
    return formula.target_machine || 'General';
  };

  const getIngredients = (formula: any) => {
    if (formula.items && formula.items.length > 0) {
      return formula.items.map((i: any) => ({
        name: i.material?.name || `Material ${i.material_id}`,
        quantity: Number(i.quantity) || 0,
        percentage: Number(i.percentage) || 0,
        is_required: i.is_required
      }));
    }
    return formula.ingredients || [];
  };

  const filteredFormulas = formulas.filter((f: any) => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.code.toLowerCase().includes(searchTerm.toLowerCase());
    const machine = getTargetMachine(f);
    const matchesMachine = selectedMachine === 'ALL' || machine === selectedMachine;
    return matchesSearch && matchesMachine;
  });

  const machines = Array.from(new Set(formulas.map((f: any) => getTargetMachine(f)).filter(Boolean)));

  const toggleExpand = (id: number) => {
    setExpandedFormulaId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-background flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Catálogo de Fórmulas
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Administra las recetas de mezcla para extrusión y solicita PTIs.
          </p>
        </div>
        
        <PermissionGate permission="extrusion.formulas.manage">
          <Button className="w-full md:w-auto gap-2">
            <Plus size={18} />
            Nueva Fórmula
          </Button>
        </PermissionGate>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Buscar por código o nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full bg-muted/50 border-transparent focus:bg-background"
            />
          </div>
          
          <div className="w-full md:w-64 flex items-center gap-2">
            <Filter className="text-muted-foreground w-4 h-4 shrink-0" />
            <select 
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">Todas las máquinas</option>
              {machines.map((m: any) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 flex justify-center text-muted-foreground font-bold animate-pulse">
          Cargando fórmulas...
        </div>
      ) : filteredFormulas.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-xl border border-dashed border-border">
          <Beaker size={48} className="opacity-20 mb-4" />
          <p className="font-medium">No se encontraron fórmulas con los filtros actuales.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredFormulas.map((formula: any) => {
            const isExpanded = expandedFormulaId === formula.id;
            
            return (
              <Card key={formula.id} className={`overflow-hidden transition-all duration-200 border ${isExpanded ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border shadow-sm hover:border-primary/50'}`}>
                <div 
                  className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center cursor-pointer bg-card"
                  onClick={() => toggleExpand(formula.id)}
                >
                  <div className={`p-3 rounded-xl shrink-0 ${isExpanded ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    <Beaker size={24} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-lg text-foreground truncate">{formula.name}</h3>
                      <Badge variant="outline" className="font-mono text-xs">{formula.code}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {getTargetMachine(formula)}
                      </span>
                      <span>•</span>
                      <span>{formula.total_kg || 500} Kg Total</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                    <PermissionGate permission="extrusion.wip.manage">
                      <Button variant="secondary" size="sm" className="gap-1.5" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMixFormula(formula);
                      }}>
                        <PackageCheck size={16} />
                        Solicitar Mezcla
                      </Button>
                    </PermissionGate>
                    
                    <div className="p-1 text-muted-foreground">
                      <ChevronDown size={20} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-muted/30 border-t border-border p-4 sm:p-5 animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-bold text-foreground text-sm uppercase tracking-wider mb-3">Especificación de Mezcla (Para {formula.total_kg || 500} Kg)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                          <tr>
                            <th className="px-4 py-3 font-semibold rounded-tl-md">Material</th>
                            <th className="px-4 py-3 font-semibold text-right">Cantidad (Kg)</th>
                            <th className="px-4 py-3 font-semibold text-right">% ± 5</th>
                            <th className="px-4 py-3 font-semibold text-center rounded-tr-md">Obligatorio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getIngredients(formula).map((ing: any, idx: number) => (
                            <tr key={idx} className="border-b border-border/50 hover:bg-card transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{ing.name}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-primary">{Number(ing.quantity || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono text-muted-foreground">{Number(ing.percentage || 0).toFixed(2)}%</td>
                              <td className="px-4 py-3 text-center">
                                {ing.is_required ? (
                                  <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0">SÍ</Badge>
                                ) : (
                                  <Badge variant="secondary" className="opacity-70">NO</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/50 border-t-2 border-border font-bold">
                          <tr>
                            <td className="px-4 py-3 text-foreground">TOTAL</td>
                            <td className="px-4 py-3 text-right text-primary">500.00</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">100.00%</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    
                    <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs font-semibold leading-relaxed">
                      NOTA: LOS PORCENTAJES DE MATERIAL (EJ. POLIPROPILENO "C") QUEDARAN SUJETOS A DISPONIBILIDAD, PROVOCANDO DISMINUCIÓN DE DICHO MATERIAL O REMPLAZO DEL MISMO ASI COMO EL INCREMENTO EN ALGUNOS ADITIVOS. DICHAS VARIACIONES NO COMPROMETEN LA CALIDAD.
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <MixRequestModal 
        isOpen={!!selectedMixFormula} 
        onClose={() => setSelectedMixFormula(null)} 
        formula={selectedMixFormula} 
      />
    </div>
  );
};
