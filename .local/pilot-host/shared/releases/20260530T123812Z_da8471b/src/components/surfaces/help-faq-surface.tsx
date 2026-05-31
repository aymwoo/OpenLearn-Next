"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  title: string;
  items: FaqItem[];
};

export type HelpFaqContent = FaqCategory[];

interface HelpFaqSurfaceProps {
  categories: HelpFaqContent;
}

export function HelpFaqSurface({ categories }: HelpFaqSurfaceProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  let globalIndex = 0;

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => (
        <section key={category.title} className="rounded-[1.5rem] bg-surface-container-low p-6">
          <h3 className="text-lg font-semibold text-on-surface">{category.title}</h3>
          <div className="mt-4 flex flex-col gap-3">
            {category.items.map((item) => {
              const currentIndex = globalIndex++;
              const isOpen = openIndex === currentIndex;

              return (
                <div
                  key={item.question}
                  className="rounded-[1.25rem] bg-surface-container-lowest"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : currentIndex)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-medium text-on-surface">{item.question}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-on-surface-variant transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-0">
                      <p className="text-sm leading-7 text-on-surface-variant">{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}