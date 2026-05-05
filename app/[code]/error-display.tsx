"use client";

import { AlertOctagon, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export interface ErrorInfo {
  title: string;
  message: string;
}

export interface BrandingConfig {
  brandName: string;
  incidentLabel: string;
  serviceStatus: string;
  footerText: string;
  returnHome: string;
  reloadPage: string;
}

export interface KumaStatus {
  overallStatus: "up" | "down" | "maintenance" | "pending" | "unknown";
  message: string;
  link: string | null;
}

interface ErrorDisplayProps {
  code: string;
  info: ErrorInfo;
  branding: BrandingConfig;
  kumaStatus?: KumaStatus | null;
}

function getStatusDotClass(status: KumaStatus["overallStatus"]): string {
  switch (status) {
    case "up":
      return "bg-secondary";
    case "maintenance":
      return "bg-primary";
    case "pending":
      return "bg-tertiary";
    case "down":
      return "bg-error";
    default:
      return "bg-error";
  }
}

export default function ErrorDisplay({
  code,
  info,
  branding,
  kumaStatus,
}: ErrorDisplayProps) {
  const statusText = kumaStatus ? kumaStatus.message : branding.serviceStatus;
  const dotClass = kumaStatus
    ? getStatusDotClass(kumaStatus.overallStatus)
    : "bg-error";
  const statusLink = kumaStatus?.link ?? null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  const StatusContent = (
    <span className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dotClass} animate-pulse`}></span>
      {statusText}
    </span>
  );

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="glass-card rounded-lg p-8 md:p-12 border border-outline-variant/20 hover:border-primary/30 transition-all duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <AlertOctagon className="w-32 h-32 text-primary" />
          </div>

          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 mb-8"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-surface-container-highest text-primary text-[10px] font-mono font-bold tracking-[0.15em] uppercase border border-outline-variant/20">
              {branding.brandName} {branding.incidentLabel} {code}
            </span>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4 mb-10">
            <h1 className="font-headline text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary leading-none">
              {code}
            </h1>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface">
              {info.title}
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
              {info.message}
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-outline-variant/15"
          >
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold rounded-lg text-lg shadow-ambient-glow hover:shadow-console-glow hover:scale-105 transition-all duration-300"
            >
              <Home className="w-5 h-5" />
              {branding.returnHome}
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-8 py-4 border border-outline-variant/40 hover:border-primary text-on-surface font-headline font-bold rounded-lg text-lg transition-all duration-300 bg-surface/50 backdrop-blur-sm"
            >
              <RefreshCcw className="w-5 h-5" />
              {branding.reloadPage}
            </button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-12 flex justify-between items-center text-[11px] uppercase tracking-[0.15em] text-on-surface-variant font-mono font-medium"
          >
            {statusLink ? (
              <a
                href={statusLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                {StatusContent}
              </a>
            ) : (
              StatusContent
            )}
            <span>{branding.footerText}</span>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
