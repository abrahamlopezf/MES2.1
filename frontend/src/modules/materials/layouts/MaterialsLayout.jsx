import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Boxes, Layers3, Hash, Tag, Award, Factory, MapPin, Scale, Truck } from "lucide-react";
import { TFCard } from "../../../components/tf-ui";

const MaterialsLayout = () => {
  const location = useLocation();
  
  const tabs = [
    { name: "Materiales", path: "/materials/list", icon: Boxes, desc: "Catálogo maestro y control global de todos los materiales." },
    { name: "Familias", path: "/materials/families", icon: Factory, desc: "Agrupa los materiales por su rama o linaje principal." },
    { name: "Artículos", path: "/materials/codes", icon: Hash, desc: "Catálogo base de definiciones y categorías lógicas." },
    { name: "Tipos", path: "/materials/types", icon: Tag, desc: "Clasificación por comportamiento logístico u operativo." },
    { name: "Marcas", path: "/materials/brands", icon: Award, desc: "Registro oficial de fabricantes y marcas permitidas." },
    { name: "Unidades", path: "/materials/units", icon: Scale, desc: "Unidades de medida para transacciones y reportes." },
    { name: "Localidades", path: "/materials/locations", icon: MapPin, desc: "Mapeo físico de pasillos, estantes y zonas." },
    { name: "Proveedores", path: "/materials/suppliers", icon: Truck, desc: "Directorio de abastecedores logísticos." },
  ];

  const currentTab = tabs.find(t => location.pathname.startsWith(t.path)) || { name: "Master Data", desc: "Administración centralizada de catálogos y parámetros operativos." };

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
      {/* Header & Tabs Row */}
      {/* Módulo Master Data Header */}
      <div className="flex flex-col items-center text-center">
        <span className="text-primary font-black text-xs uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full mb-3 inline-block shadow-sm">Master Data</span>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground m-0 tracking-tight">{currentTab.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base font-semibold max-w-xl mx-auto">
          {currentTab.desc}
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="w-full overflow-x-auto pb-2 custom-scrollbar text-center">
        <div className="p-1.5 border border-border/50 shadow-sm bg-secondary/30 rounded-xl inline-flex min-w-max items-center gap-1 mx-auto text-left">
            <nav className="flex items-center gap-1" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-[13px] sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ease-out rounded-lg active:scale-95 shrink-0
                    ${
                      isActive
                        ? "bg-background text-foreground shadow-sm border border-border/50 ring-1 ring-black/5 dark:ring-white/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`size-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{tab.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
          </div>
        </div>

      {/* Contenido Dinámico de la Pestaña Activa */}
      <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Outlet />
      </div>
    </div>
  );
};

export default MaterialsLayout;
