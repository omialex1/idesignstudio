export default function EventsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-semibold tracking-[0.2em] text-terracotta-600 uppercase">
        Events
      </p>
      <h1 className="max-w-2xl font-display text-4xl text-brown-800">
        Categoriile de evenimente vin in curand.
      </h1>
      <p className="max-w-lg text-brown-600">
        Aceasta pagina va afisa categoriile si produsele pentru evenimente odata
        ce baza de date este conectata.
      </p>
    </div>
  );
}
