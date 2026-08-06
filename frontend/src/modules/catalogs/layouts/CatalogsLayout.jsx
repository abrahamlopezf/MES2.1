import { Outlet, NavLink } from "react-router-dom";
import { Warehouse, MapPin, Map, Navigation, AlignVerticalSpaceAround } from "lucide-react";
import { TFCard } from "../../../components/tf-ui";

const CatalogsLayout = () => {
  const tabs = [
    { name: "Almacenes", path: "/catalogs/warehouses", icon: Warehouse },
    { name: "Localidades", path: "/catalogs/storage-locations", icon: MapPin },
    { name: "Tipos de Localidad", path: "/catalogs/storage-location-types", icon: Map },
    { name: "Estatus de Localidad", path: "/catalogs/storage-location-statuses", icon: Navigation },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Módulo WMS Catalogs Header */}
      <div>
        <h1 className="text-3xl font-black text-foreground m-0 tracking-tight">Catálogos WMS</h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">
          Administración de Almacenes, Localidades y su configuración.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center w-full">
        <TFCard className="p-1 border-border shadow-sm bg-card rounded-xl w-fit inline-flex max-w-full overflow-hidden">
          <nav className="flex items-center justify-start sm:justify-center gap-1 overflow-x-auto hide-scrollbar" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-5 py-2 text-sm font-bold whitespace-nowrap transition-all duration-200 ease-out rounded-lg active:scale-95
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="size-4" />
                  {tab.name}
                </NavLink>
              );
            })}
          </nav>
        </TFCard>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default CatalogsLayout;
