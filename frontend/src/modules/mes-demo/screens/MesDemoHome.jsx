import { Link } from "react-router-dom";

const items = [
  {
    title: "Generación QR",
    path: "/mes-demo/qr",
    desc: "Crear lote e imprimir identificación",
  },
  {
    title: "Recepción Almacén",
    path: "/mes-demo/recepcion",
    desc: "Entrada de materia prima",
  },
  {
    title: "Preparación Mezcla",
    path: "/mes-demo/mezcla",
    desc: "Formulación y creación MI",
  },
  {
    title: "Extrusión",
    path: "/mes-demo/extrusion",
    desc: "Transformación de MI a PTI",
  },
  {
    title: "Telares",
    path: "/mes-demo/telares",
    desc: "Consumo de PTI",
  },
  {
    title: "Scrap / Merma",
    path: "/mes-demo/waste",
    desc: "Control de desperdicio",
  },
  {
    title: "Trazabilidad",
    path: "/mes-demo/trazabilidad",
    desc: "Genealogía completa",
  },
];

export default function MesDemoHome() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">MES Industrial Demo</h1>

      <div className="grid md:grid-cols-3 gap-5">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="
rounded-xl 
border 
border-border
bg-card
p-6
hover:shadow-lg
transition
"
          >
            <h2 className="font-bold text-xl">{item.title}</h2>

            <p className="text-muted-foreground mt-2">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
