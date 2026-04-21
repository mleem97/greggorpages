"use client";

import { AlertOctagon, RefreshCcw, Home, ArrowRight } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { motion } from "framer-motion";

interface ErrorInfo {
  title: string;
  message: string;
}

const ERROR_MAP: Record<string, ErrorInfo> = {
  "400": { title: "Bad Request", message: "The server could not understand the request due to invalid syntax." },
  "401": { title: "Unauthorized", message: "Authentication is required and has failed or has not yet been provided." },
  "403": { title: "Forbidden", message: "Access to the requested resource is strictly denied by the framework." },
  "404": { title: "Not Found", message: "The requested resource could not be located in the current zone." },
  "500": { title: "Internal Server Error", message: "The server encountered an unexpected condition that prevented it from fulfilling the request." },
  "502": { title: "Bad Gateway", message: "The server, while acting as a gateway or proxy, received an invalid response." },
  "503": { title: "Service Unavailable", message: "The server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded." },
  "504": { title: "Gateway Timeout", message: "The server, while acting as a gateway or proxy, did not get a response in time." },
};

export default function ErrorPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const info = ERROR_MAP[code] || {
    title: "Unknown System Anomaly",
    message: "An unexpected error occurred within the Luminescent ecosystem.",
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

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
        <div className="glass-card rounded-2xl p-8 md:p-12 border border-outline-variant/20 hover:border-primary/30 transition-all duration-500 overflow-hidden relative">
          
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <AlertOctagon className="w-32 h-32 text-primary" />
          </div>

          <motion.div variants={itemVariants} className="flex items-center gap-2 mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-surface-container-highest text-primary text-[10px] font-bold tracking-[0.2em] uppercase border border-outline-variant/20">
              System Incident {code}
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

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-outline-variant/15">
            <Link 
              href="/"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold rounded-xl text-lg shadow-[0_0_32px_-4px_rgba(97,244,216,0.2)] hover:scale-105 transition-transform duration-300"
            >
              <Home className="w-5 h-5" />
              Return Core
            </Link>
            <button 
              onClick={() => window.location.reload()} 
              className="flex items-center justify-center gap-2 px-8 py-4 border border-outline-variant/40 hover:border-primary text-on-surface font-headline font-bold rounded-xl text-lg transition-all duration-300 bg-surface/50 backdrop-blur-sm"
            >
              <RefreshCcw className="w-5 h-5" />
              Re-Sync
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-12 flex justify-between items-center text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              Fault Detected
            </span>
            <span>gregFramework Edge</span>
          </motion.div>

        </div>
      </motion.div>
    </main>
  );
}
