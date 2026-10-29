import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <ShieldAlert className="text-red-600" size={32} />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-gray-900">Accès refusé</h2>
      <p className="mt-2 max-w-md text-gray-600">
        Cette section est réservée aux administrateurs. Contactez votre
        administrateur si vous pensez devoir y avoir accès.
      </p>
    </div>
  );
}
