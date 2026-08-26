import { Outlet, NavLink } from "react-router-dom";
import { Boxes, Layers3, Hash, Tag, Award, Factory, MapPin } from "lucide-react";
import { TFCard } from "../../../components/tf-ui";

const MaterialsLayout = () => {
  const tabs = [
    { name: "Materiales", path: "/materials/list", icon: Boxes },
    { name: "Familias", path: "/materials/families", icon: Factory },
    { name: "Artículos", path: "/materials/codes", icon: Hash },
    { name: "Tipos", path: "/materials/types", icon: Tag },
    { name: "Marcas", path: "/materials/brands", icon: Award },
    { name: "Localidades", path: "/materials/locations", icon: MapPin },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
      {/* Módulo Master Data Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground m-0 tracking-tight">Master Data</h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">
          Administración centralizada de catálogos y subcatálogos del sistema.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="w-full">
        <TFCard className="p-1 border-border shadow-sm bg-card rounded-xl w-full">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 text-sm font-bold whitespace-nowrap transition-all duration-200 ease-out rounded-lg active:scale-95 flex-1 sm:flex-none
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </TFCard>
      </div>


      {/* Contenido Dinámico de la Pestaña Activa */}
      <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Outlet />
      </div>
    </div>
  );
};

export default MaterialsLayout;
