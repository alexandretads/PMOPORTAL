import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, FileText } from "lucide-react";
import type { Project } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";

interface SummaryCardProps {
  project: Project;
  className?: string;
}

export function SummaryCard({ project, className }: SummaryCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const summary = project.resumoExecutivo.trim();
  const hasSummary = summary.length > 0;

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    function measure() {
      if (!element) return;
      setOverflowing(element.scrollHeight - element.clientHeight > 1);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [summary]);

  const showVerMais = hasSummary && (overflowing || summary.length > 320);

  return (
    <>
      <section
        aria-labelledby="summary-title"
        className={cn(
          "flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6",
          className
        )}
      >
        <header className="flex items-center justify-between gap-3">
          <h2
            id="summary-title"
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text2"
          >
            Resumo executivo
          </h2>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand-50 text-brand-700"
            aria-hidden="true"
          >
            <FileText size={14} strokeWidth={1.9} />
          </span>
        </header>

        <div className="mt-3 flex-1">
          {hasSummary ? (
            <p
              ref={textRef}
              className="line-clamp-6 whitespace-pre-line text-[13px] leading-[1.7] text-text"
            >
              {summary}
            </p>
          ) : (
            <p className="text-[13px] leading-relaxed text-text2">
              Sem atualização registrada.
            </p>
          )}
        </div>

        {showVerMais ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="group inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-900"
              aria-haspopup="dialog"
            >
              Ver mais
              <ArrowUpRight
                size={12}
                strokeWidth={2.2}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        ) : null}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Resumo executivo"
        subtitle={`Projeto #${project.id} · ${project.nome}`}
      >
        <p className="whitespace-pre-line text-[13px] leading-[1.75] text-text">
          {hasSummary ? summary : "Sem atualização registrada."}
        </p>
      </Modal>
    </>
  );
}
