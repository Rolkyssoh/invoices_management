import { useState } from "react";
import { User, ArrowRight, AlertCircle } from "lucide-react";
import { api } from "../services/api";

interface FirstTimeSetupProps {
  defaultEmail: string;
  defaultPassword: string;
  onComplete: () => void;
}

export function FirstTimeSetup({ defaultEmail, defaultPassword, onComplete }: FirstTimeSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // User info
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validateForm = () => {
    const newErrors: string[] = [];
    if (!userName.trim()) newErrors.push("Le nom est requis");
    if (!userEmail.trim()) newErrors.push("L'email est requis");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) newErrors.push("L'email n'est pas valide");
    if (!userPassword) newErrors.push("Le mot de passe est requis");
    else if (userPassword.length < 6) newErrors.push("Le mot de passe doit contenir au moins 6 caractères");
    if (userPassword !== confirmPassword) newErrors.push("Les mots de passe ne correspondent pas");
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.auth.updateDefaultUser({
        user_name: userName,
        user_email: userEmail,
        user_password: userPassword,
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
              <User className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Configuration Initiale - Votre Compte
              </h2>
              <p className="text-blue-100 text-sm">
                Étape 1 sur 2
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2 mt-6">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= 1 ? "bg-white" : "bg-white/30"
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

          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Bienvenue ! C'est la première fois que vous utilisez l'application.
              </p>
              <p className="text-gray-600">
                Un compte administrateur par défaut a été créé. Veuillez modifier vos informations avant de vous connecter.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-800 mb-2">Identifiants par défaut (à modifier)</h3>
              <div className="space-y-1 text-sm text-amber-700">
                <p><span className="font-medium">Email:</span> {defaultEmail}</p>
                <p><span className="font-medium">Mot de passe:</span> {defaultPassword}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                Personnalisez votre compte administrateur :
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe *
                  </label>
                  <input
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="••••••••"
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
                    "Enregistrement..."
                  ) : (
                    <>
                      Enregistrer et se connecter
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FirstTimeSetup;
