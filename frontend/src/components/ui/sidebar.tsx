"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, PanelLeft, X } from "lucide-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  pinned: boolean;
  setPinned: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const [pinned, setPinned] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate, pinned, setPinned }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate, pinned } = useSidebar();
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        "sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex",
        className,
      )}
      animate={{
        width: animate ? (open ? "260px" : "68px") : "260px",
      }}
      transition={reducedMotion ? { duration: 0 } : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !pinned && setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/** Botão explícito pra fixar o menu expandido — alternativa ao hover
 * pra quem usa toque ou teclado, que não consegue disparar mouseenter. */
export const SidebarPinToggle = ({ className }: { className?: string }) => {
  const { pinned, setPinned, setOpen } = useSidebar();

  return (
    <button
      type="button"
      onClick={() => {
        const next = !pinned;
        setPinned(next);
        setOpen(next);
      }}
      aria-pressed={pinned}
      aria-label={pinned ? "Recolher menu" : "Fixar menu expandido"}
      title={pinned ? "Recolher menu" : "Fixar menu expandido"}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
        className,
      )}
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className="flex h-14 w-full flex-row items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:hidden"
      {...props}
    >
      <Menu
        className="cursor-pointer text-sidebar-foreground"
        onClick={() => setOpen(!open)}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed inset-0 z-100 flex h-full w-full flex-col justify-between bg-sidebar p-8",
              className,
            )}
          >
            <div
              className="absolute right-6 top-6 z-50 cursor-pointer text-sidebar-foreground"
              onClick={() => setOpen(!open)}
            >
              <X />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
} & Omit<LinkProps, "href">) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      title={open ? undefined : link.label}
      className={cn(
        "group/sidebar flex items-center justify-start gap-2 rounded-md px-2 py-2",
        className,
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="!m-0 inline-block whitespace-pre text-sm text-sidebar-foreground transition duration-150 !p-0 group-hover/sidebar:translate-x-1"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
