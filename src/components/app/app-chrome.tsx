"use client";

import * as React from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { QuickCreate, type QuickCreateMode } from "./quick-create";

type ChromeContext = {
  openCommandPalette: () => void;
  openQuickCreate: (mode?: QuickCreateMode) => void;
};

const ChromeContext = React.createContext<ChromeContext | null>(null);

/** Lets any page open the palette or the create dialog. */
export function useChrome(): ChromeContext {
  const ctx = React.useContext(ChromeContext);
  if (!ctx) throw new Error("useChrome must be used inside <AppChrome>.");
  return ctx;
}

/**
 * The Tech Department's own navigation: sidebar, header, palette, quick create.
 *
 * Wraps the Command Center routes only. Workspace state lives above it in
 * <AppProviders> so that the Employee Portal can read the same data without
 * inheriting any of this.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createMode, setCreateMode] = React.useState<QuickCreateMode>("ticket");

  const openQuickCreate = React.useCallback((mode: QuickCreateMode = "ticket") => {
    setCreateMode(mode);
    setCreateOpen(true);
  }, []);

  const openCommandPalette = React.useCallback(() => setPaletteOpen(true), []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      // A bare shortcut must not fire while the user is typing.
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (typing || meta || event.altKey) return;

      if (event.key === "c") {
        event.preventDefault();
        openQuickCreate("ticket");
      }
      if (event.key === "/") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openQuickCreate]);

  const value = React.useMemo(
    () => ({ openCommandPalette, openQuickCreate }),
    [openCommandPalette, openQuickCreate],
  );

  return (
    <ChromeContext.Provider value={value}>
      <div className="flex h-dvh overflow-hidden bg-canvas">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            onOpenSearch={openCommandPalette}
            onQuickCreate={() => openQuickCreate("ticket")}
          />
          <main id="main" className="scrollbar-slim flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onQuickCreate={() => openQuickCreate("ticket")}
      />
      <QuickCreate
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialMode={createMode}
      />
    </ChromeContext.Provider>
  );
}
