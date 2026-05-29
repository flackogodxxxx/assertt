import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function Unauthorized() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="glass-panel p-12 max-w-lg">
        <h2 className="text-3xl font-display font-bold text-assert-400 mb-4">Acesso Negado</h2>
        <p className="text-carbon-200 mb-8">
          Você não tem permissão para acessar esta página com o seu perfil atual.
        </p>
        <Link to="/crm">
          <Button>Voltar ao Início</Button>
        </Link>
      </div>
    </div>
  );
}
