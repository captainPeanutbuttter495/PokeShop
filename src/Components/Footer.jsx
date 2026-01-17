// src/Components/Footer.jsx
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { path: "/", label: "Home" },
    { path: "/shop", label: "Shop" },
    { path: "/profile", label: "Profile" },
  ];

  const connectLinks = [
    { href: "#", label: "GitHub", icon: "mdi:github", placeholder: true },
    { href: "#", label: "LinkedIn", icon: "mdi:linkedin", placeholder: true },
    { href: "#", label: "Documentation", icon: "mdi:file-document", placeholder: true },
  ];

  const techStack = [
    { name: "React", icon: "mdi:react" },
    { name: "Auth0", icon: "simple-icons:auth0" },
    { name: "Prisma", icon: "simple-icons:prisma" },
    { name: "TailwindCSS", icon: "mdi:tailwind" },
    { name: "PostgreSQL", icon: "simple-icons:postgresql" },
  ];

  return (
    <footer className="border-t border-slate-800 bg-slate-900">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand & Tech Stack */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2">
                <Icon icon="game-icons:pokemon" className="h-6 w-6 text-amber-400" />
              </div>
              <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-lg font-bold text-transparent">
                PokeShop
              </span>
            </div>

            {/* Tagline */}
            <p className="text-sm text-slate-400">
              Your premier destination for Pokemon cards. Browse, collect, and trade your favorite cards.
            </p>

            {/* Tech Stack */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Built with
              </p>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech) => (
                  <div
                    key={tech.name}
                    className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700"
                  >
                    <Icon icon={tech.icon} className="h-3.5 w-3.5" />
                    <span>{tech.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="group flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-amber-400"
                  >
                    <Icon
                      icon="mdi:chevron-right"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Connect
            </h3>
            <ul className="space-y-3">
              {connectLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-sm text-slate-400 transition-colors hover:text-amber-400"
                  >
                    <Icon icon={link.icon} className="h-5 w-5" />
                    <span>{link.label}</span>
                    {link.placeholder && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
                        Coming soon
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            {/* Copyright */}
            <p className="text-sm text-slate-500">
              &copy; {currentYear} Matthew Garcia. All rights reserved.
            </p>

            {/* Credits */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <a
                href="https://pokemontcg.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition-colors hover:text-slate-400"
              >
                <Icon icon="mdi:api" className="h-3.5 w-3.5" />
                Pokemon TCG API
              </a>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Icon icon="mdi:code-tags" className="h-3.5 w-3.5" />
                Portfolio Project
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
