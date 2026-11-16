import type { Project } from "@/types";
import { formatPromptValue, type AppliedChange } from "@/lib/updateFields";

interface BuildCopilotPromptInput {
  project: Project;
  changes: AppliedChange[];
}

/** Gera o prompt final do Copilot usando os nomes exatos das colunas da aba NovS1. */
export function buildCopilotPrompt({ project, changes }: BuildCopilotPromptInput): string {
  const lines = [
    'Atualize a planilha de Status Report atualmente aberta. Use somente a aba "NovS1". ' +
      `Localize o projeto pelo ID ${project.id} e confirme o nome "${project.nome}". ` +
      "Altere somente as células listadas abaixo. Preserve toda a estrutura e não substitua fórmulas.",
    "",
    "ALTERAÇÕES AUTORIZADAS",
  ];

  for (const change of changes) {
    const definition = {
      key: change.key,
      label: change.label,
      column: change.column,
      kind: change.kind,
      group: "Projeto" as const,
    };
    lines.push(`- Coluna: ${change.column}`);
    lines.push(`  Valor anterior esperado: ${formatPromptValue(definition, change.currentValue)}`);
    lines.push(`  Novo valor: ${formatPromptValue(definition, change.newValue)}`);
  }

  lines.push(
    "",
    "Ao final, informe as células alteradas, divergências, itens não alterados e confirme que nenhuma outra célula foi modificada."
  );

  return lines.join("\n");
}
