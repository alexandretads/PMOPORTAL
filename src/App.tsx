import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Overview } from "@/pages/Overview";
import { Projects } from "@/pages/Projects";
import { ProjectDetail } from "@/pages/ProjectDetail";
import { ProjectUpdate } from "@/pages/ProjectUpdate";
import { ExportPresentation } from "@/pages/ExportPresentation";
import { PresentationView } from "@/pages/PresentationView";
import { PreviewComponentes } from "@/pages/PreviewComponentes";

/**
 * Em hospedagem estática (build single-file) não existe fallback de servidor
 * para rotas profundas. O hash sempre carrega o index.html e permite abrir o
 * preview de QA sem depender de configuração de servidor.
 */
function renderPreviewFromHash(): boolean {
  if (typeof window === "undefined") return false;
  return /^#\/?preview-componentes/.test(window.location.hash);
}

export default function App() {
  if (renderPreviewFromHash()) {
    return (
      <BrowserRouter>
        <PreviewComponentes />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/apresentacao" element={<PresentationView />} />
        {/* Rota temporária de QA visual — remover após a migração. */}
        <Route path="/preview-componentes" element={<PreviewComponentes />} />
        <Route path="/export/apresentacao" element={<ExportPresentation />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/projetos" element={<Projects />} />
          <Route path="/projetos/:id" element={<ProjectDetail />} />
          <Route path="/projetos/:id/atualizar" element={<ProjectUpdate />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
