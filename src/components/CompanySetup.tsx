import { useState } from "react";
import { Building2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "../services/api";

interface CompanySetupProps {
  onComplete: () => void;
}

export function CompanySetup({ onComplete }: CompanySetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Company info
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone1, setCompanyPhone1] = useState("");
  const [companyCapital, setCompanyCapital] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyTaxNumber, setCompanyTaxNumber] = useState("");
  const [companyIce, setCompanyIce] = useState("");
  const [companyCurrency, setCompanyCurrency] = useState("MAD");

  const validateForm = () => {
    const newErrors: string[] = [];
    if (!companyName.trim()) newErrors.push("Le nom de l'entreprise est requis");
    if (!companyAddress.trim()) newErrors.push("L'adresse est requise");
    if (!companyPhone1.trim()) newErrors.push("Le téléphone est requis");
    if (!companyEmail.trim()) newErrors.push("L'email de l'entreprise est requis");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) newErrors.push("L'email de l'entreprise n'est pas valide");
    if (!companyTaxNumber.trim()) newErrors.push("L'identification fiscale (IF) est requise");
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.auth.updateDefaultCompany({
        company_name: companyName,
        company_address: companyAddress,
        company_phone1: companyPhone1,
        company_capital: companyCapital || undefined,
        company_email: companyEmail,
        company_tax_number: companyTaxNumber,
        company_ice: companyIce || undefined,
        company_currency: companyCurrency,
      });
      onComplete();
    } catch (error) {
      console.error("Setup error:", error);
      setErrors(["Une erreur est survenue lors de la configuration"]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Configuration Initiale - Votre Entreprise
              </h2>
              <p className="text-blue-100 text-sm">
                Étape 2 sur 2
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2 mt-6">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= 2 ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              {errors.map((error, i) => (
                <div key={i} className="flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Configurez les informations de votre entreprise :
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="Ma Société SARL"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse *
                </label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="123 Rue Principale, Ville"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={companyPhone1}
                  onChange={(e) => setCompanyPhone1(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="+212 5XX XXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capital social
                </label>
                <input
                  type="text"
                  value={companyCapital}
                  onChange={(e) => setCompanyCapital(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="1000000 DH"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de l'entreprise *
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="contact@entreprise.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identification Fiscale (IF) *
                </label>
                <input
                  type="text"
                  value={companyTaxNumber}
                  onChange={(e) => setCompanyTaxNumber(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Devise
                </label>
                <select
                  value={companyCurrency}
                  onChange={(e) => setCompanyCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="MAD">MAD (DH)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ICE
                </label>
                <input
                  type="text"
                  value={companyIce}
                  onChange={(e) => setCompanyIce(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="001234567890123"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  "Configuration..."
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Terminer la configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanySetup;
